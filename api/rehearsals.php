<?php
require __DIR__ . '/auth_helpers.php';

$user = require_user();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = 'SELECT r.id, r.title, r.rehearsal_date, r.start_time, r.end_time, r.location, r.group_id, g.group_name FROM rehearsals r JOIN theater_groups g ON g.id = r.group_id';
    if ($user['role'] === 'member') {
        $sql .= ' JOIN user_groups ug ON ug.group_id = r.group_id WHERE ug.user_id = ?';
        $stmt = db()->prepare($sql . ' ORDER BY r.rehearsal_date, r.start_time');
        $stmt->execute([$user['id']]);
        $records = $stmt->fetchAll();
    } else {
        $records = db()->query($sql . ' ORDER BY r.rehearsal_date, r.start_time')->fetchAll();
    }
    foreach ($records as &$record) {
        $record['id'] = (int)$record['id'];
        $record['group_id'] = (int)$record['group_id'];
        $record['start_time'] = substr($record['start_time'], 0, 5);
        $record['end_time'] = substr($record['end_time'], 0, 5);
    }
    unset($record);
    json_out($records);
}

require_admin();
if (!in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE');
    json_out(['error' => 'Method not allowed'], 405);
}
require_csrf();

$pdo = db();
if ($method === 'DELETE') {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) json_out(['error' => 'A valid rehearsal id is required.'], 400);
    $pdo->beginTransaction();
    $pdo->query('SELECT id FROM schedule_mutex WHERE id = 1 FOR UPDATE');
    $stmt = $pdo->prepare('DELETE FROM rehearsals WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        json_out(['error' => 'Rehearsal not found.'], 404);
    }
    $pdo->commit();
    json_out(['ok' => true]);
}

$input = json_in();
$id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
if ($method === 'PUT' && (!$id || $id < 1)) json_out(['error' => 'A valid rehearsal id is required.'], 400);

$title = trim((string)($input['title'] ?? ''));
$date = $input['rehearsal_date'] ?? '';
$start = $input['start_time'] ?? '';
$end = $input['end_time'] ?? '';
$location = trim((string)($input['location'] ?? ''));
$groupId = filter_var($input['group_id'] ?? null, FILTER_VALIDATE_INT);

if ($title === '' || mb_strlen($title) > 180) json_out(['error' => 'Title is required (max 180 characters).'], 422);
if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) json_out(['error' => 'Choose a valid rehearsal date.'], 422);
$parsedDate = DateTime::createFromFormat('!Y-m-d', $date);
if (!$parsedDate || $parsedDate->format('Y-m-d') !== $date) json_out(['error' => 'Choose a valid rehearsal date.'], 422);
if (!is_string($start) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $start)) json_out(['error' => 'Choose a valid start time.'], 422);
if (!is_string($end) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $end) || $end <= $start) json_out(['error' => 'End time must be later than start time.'], 422);
if ($location === '' || mb_strlen($location) > 180) json_out(['error' => 'Location is required (max 180 characters).'], 422);
if (!$groupId || $groupId < 1) json_out(['error' => 'Choose a theater group.'], 422);

$pdo->beginTransaction();
$pdo->query('SELECT id FROM schedule_mutex WHERE id = 1 FOR UPDATE');
$groupCheck = $pdo->prepare('SELECT 1 FROM theater_groups WHERE id = ?');
$groupCheck->execute([$groupId]);
if (!$groupCheck->fetchColumn()) {
    $pdo->rollBack();
    json_out(['error' => 'The selected theater group does not exist.'], 422);
}

$conflictSql = "SELECT r.id, r.title, r.start_time, r.end_time, r.location, g.group_name
    FROM rehearsals r
    JOIN theater_groups g ON g.id = r.group_id
    WHERE r.rehearsal_date = ?
      AND r.start_time < ?
      AND r.end_time > ?
      AND (
        r.group_id = ?
        OR r.location = ?
        OR EXISTS (
          SELECT 1 FROM user_groups a
          JOIN user_groups b ON b.user_id = a.user_id
          WHERE a.group_id = r.group_id AND b.group_id = ?
        )
      )";
$params = [$date, $end . ':00', $start . ':00', $groupId, $location, $groupId];
if ($id) {
    $conflictSql .= ' AND r.id <> ?';
    $params[] = $id;
}
$conflictSql .= ' LIMIT 1';
$conflicts = $pdo->prepare($conflictSql);
$conflicts->execute($params);
$conflict = $conflicts->fetch();
if ($conflict) {
    $pdo->rollBack();
    $existingStart = substr($conflict['start_time'], 0, 5);
    $existingEnd = substr($conflict['end_time'], 0, 5);
    json_out([
        'error' => 'This rehearsal overlaps "' . $conflict['title'] . '" (' . $conflict['group_name'] . ', ' . $existingStart . '–' . $existingEnd . '). Choose another time or location.',
    ], 409);
}

if ($method === 'POST') {
    $stmt = $pdo->prepare('INSERT INTO rehearsals (title, rehearsal_date, start_time, end_time, location, group_id) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$title, $date, $start, $end, $location, $groupId]);
    $rehearsalId = (int)$pdo->lastInsertId();
} else {
    $stmt = $pdo->prepare('UPDATE rehearsals SET title = ?, rehearsal_date = ?, start_time = ?, end_time = ?, location = ?, group_id = ? WHERE id = ?');
    $stmt->execute([$title, $date, $start, $end, $location, $groupId, $id]);
    if ($stmt->rowCount() === 0) {
        $exists = $pdo->prepare('SELECT 1 FROM rehearsals WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetchColumn()) {
            $pdo->rollBack();
            json_out(['error' => 'Rehearsal not found.'], 404);
        }
    }
    $rehearsalId = (int)$id;
}

$pdo->commit();
json_out(['ok' => true, 'id' => $rehearsalId], $method === 'POST' ? 201 : 200);
