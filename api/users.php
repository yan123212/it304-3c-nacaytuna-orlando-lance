<?php
require __DIR__ . '/auth_helpers.php';

require_admin();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $users = db()->query('SELECT id, name, email, role FROM users ORDER BY name')->fetchAll();
    $memberships = db()->query('SELECT ug.user_id, g.id, g.group_name FROM user_groups ug JOIN theater_groups g ON g.id = ug.group_id ORDER BY g.group_name')->fetchAll();
    $byUser = [];
    foreach ($memberships as $membership) {
        $byUser[$membership['user_id']][] = ['id' => (int)$membership['id'], 'group_name' => $membership['group_name']];
    }
    foreach ($users as &$record) {
        $record['id'] = (int)$record['id'];
        $record['groups'] = $byUser[$record['id']] ?? [];
    }
    unset($record);
    json_out($users);
}

if (!in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE');
    json_out(['error' => 'Method not allowed'], 405);
}

require_csrf();
$pdo = db();
$pdo->beginTransaction();
$pdo->query('SELECT id FROM schedule_mutex WHERE id = 1 FOR UPDATE');

if ($method === 'DELETE') {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) {
        $pdo->rollBack();
        json_out(['error' => 'A valid user id is required.'], 400);
    }
    $actor = current_user();
    if ((int)$actor['id'] === $id) {
        $pdo->rollBack();
        json_out(['error' => 'You cannot delete your own administrator account.'], 409);
    }

    $target = $pdo->prepare('SELECT role FROM users WHERE id = ? FOR UPDATE');
    $target->execute([$id]);
    $record = $target->fetch();
    if (!$record) {
        $pdo->rollBack();
        json_out(['error' => 'User not found.'], 404);
    }
    if ($record['role'] === 'admin' && (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn() <= 1) {
        $pdo->rollBack();
        json_out(['error' => 'The last administrator account cannot be deleted.'], 409);
    }

    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    $pdo->commit();
    json_out(['ok' => true]);
}

$input = json_in();
$id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
if ($method === 'PUT' && (!$id || $id < 1)) {
    $pdo->rollBack();
    json_out(['error' => 'A valid user id is required.'], 400);
}

$name = trim((string)($input['name'] ?? ''));
$email = strtolower(trim((string)($input['email'] ?? '')));
$role = $input['role'] ?? 'member';
$password = $input['password'] ?? '';
$groupIds = $input['group_ids'] ?? [];

if ($name === '' || mb_strlen($name) > 120) {
    $pdo->rollBack();
    json_out(['error' => 'Name is required (max 120 characters).'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
    $pdo->rollBack();
    json_out(['error' => 'Enter a valid email address.'], 422);
}
if (!in_array($role, ['admin', 'member'], true)) {
    $pdo->rollBack();
    json_out(['error' => 'Role must be administrator or member.'], 422);
}
if (!is_array($groupIds) || count($groupIds) > 100) {
    $pdo->rollBack();
    json_out(['error' => 'Choose a valid list of theater groups.'], 422);
}

$normalizedGroupIds = [];
foreach ($groupIds as $groupId) {
    $validId = filter_var($groupId, FILTER_VALIDATE_INT);
    if (!$validId || $validId < 1) {
        $pdo->rollBack();
        json_out(['error' => 'Choose a valid list of theater groups.'], 422);
    }
    $normalizedGroupIds[] = (int)$validId;
}
$normalizedGroupIds = array_values(array_unique($normalizedGroupIds));
if ($normalizedGroupIds) {
    $placeholders = implode(',', array_fill(0, count($normalizedGroupIds), '?'));
    $groupCheck = $pdo->prepare("SELECT COUNT(*) FROM theater_groups WHERE id IN ($placeholders)");
    $groupCheck->execute($normalizedGroupIds);
    if ((int)$groupCheck->fetchColumn() !== count($normalizedGroupIds)) {
        $pdo->rollBack();
        json_out(['error' => 'One or more selected theater groups no longer exist.'], 422);
    }
}

$scheduleGroups = $normalizedGroupIds;
if (count($scheduleGroups) > 1) {
    $marksA = implode(',', array_fill(0, count($scheduleGroups), '?'));
    $marksB = implode(',', array_fill(0, count($scheduleGroups), '?'));
    $overlap = $pdo->prepare("SELECT a.title AS first_title, b.title AS second_title
        FROM rehearsals a JOIN rehearsals b
          ON a.id < b.id
         AND a.rehearsal_date = b.rehearsal_date
         AND a.start_time < b.end_time
         AND a.end_time > b.start_time
        WHERE a.group_id IN ($marksA) AND b.group_id IN ($marksB)
          AND a.group_id <> b.group_id
        LIMIT 1");
    $overlap->execute(array_merge($scheduleGroups, $scheduleGroups));
    if ($conflict = $overlap->fetch()) {
        $pdo->rollBack();
        json_out(['error' => 'These group assignments overlap: "' . $conflict['first_title'] . '" and "' . $conflict['second_title'] . '". Adjust the schedules before assigning both groups.'], 409);
    }
}

if ($method === 'POST') {
    if (!is_string($password) || strlen($password) < 10 || strlen($password) > 72) {
        $pdo->rollBack();
        json_out(['error' => 'Choose a password between 10 and 72 bytes long.'], 422);
    }
    try {
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $role]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() === '23000') json_out(['error' => 'An account with that email already exists.'], 409);
        throw $e;
    }
    $userId = (int)$pdo->lastInsertId();
} else {
    $target = $pdo->prepare('SELECT role FROM users WHERE id = ? FOR UPDATE');
    $target->execute([$id]);
    $previous = $target->fetch();
    if (!$previous) {
        $pdo->rollBack();
        json_out(['error' => 'User not found.'], 404);
    }
    $actor = current_user();
    if ((int)$actor['id'] === $id && $role !== 'admin') {
        $pdo->rollBack();
        json_out(['error' => 'You cannot remove your own administrator access.'], 409);
    }
    if ($previous['role'] === 'admin' && $role !== 'admin' && (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn() <= 1) {
        $pdo->rollBack();
        json_out(['error' => 'The last administrator account cannot be changed to a member.'], 409);
    }

    try {
        if ($password !== '') {
            if (!is_string($password) || strlen($password) < 10 || strlen($password) > 72) {
                $pdo->rollBack();
                json_out(['error' => 'A new password must be between 10 and 72 bytes long.'], 422);
            }
            $stmt = $pdo->prepare('UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?');
            $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $role, $id]);
        } else {
            $stmt = $pdo->prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?');
            $stmt->execute([$name, $email, $role, $id]);
        }
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() === '23000') json_out(['error' => 'An account with that email already exists.'], 409);
        throw $e;
    }
    $userId = (int)$id;
    $pdo->prepare('DELETE FROM user_groups WHERE user_id = ?')->execute([$userId]);
}

if ($normalizedGroupIds) {
    $membership = $pdo->prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)');
    foreach ($normalizedGroupIds as $groupId) $membership->execute([$userId, $groupId]);
}

$pdo->commit();
json_out(['ok' => true, 'id' => $userId], $method === 'POST' ? 201 : 200);
