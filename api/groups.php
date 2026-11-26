<?php
require __DIR__ . '/auth_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$user = require_user();

if ($method === 'GET') {
    if ($user['role'] === 'admin') {
        json_out(db()->query('SELECT g.id, g.group_name, g.description, COUNT(DISTINCT r.id) AS rehearsal_count FROM theater_groups g LEFT JOIN rehearsals r ON r.group_id = g.id GROUP BY g.id ORDER BY g.group_name')->fetchAll());
    }
    $stmt = db()->prepare('SELECT g.id, g.group_name, g.description FROM theater_groups g JOIN user_groups ug ON ug.group_id = g.id WHERE ug.user_id = ? ORDER BY g.group_name');
    $stmt->execute([$user['id']]);
    json_out($stmt->fetchAll());
}

require_admin();
require_csrf();

if ($method === 'POST' || $method === 'PUT') {
    $input = json_in();
    $id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
    if ($method === 'PUT' && (!$id || $id < 1)) json_out(['error' => 'A valid group id is required.'], 400);

    $name = trim((string)($input['group_name'] ?? ''));
    $description = trim((string)($input['description'] ?? ''));
    if ($name === '' || mb_strlen($name) > 120) json_out(['error' => 'Group name is required (max 120 characters).'], 422);
    if (mb_strlen($description) > 500) json_out(['error' => 'Description must be 500 characters or fewer.'], 422);

    if ($method === 'POST') {
        $stmt = db()->prepare('INSERT INTO theater_groups (group_name, description) VALUES (?, ?)');
        try {
            $stmt->execute([$name, $description]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') json_out(['error' => 'A theater group with that name already exists.'], 409);
            throw $e;
        }
        json_out(['id' => (int)db()->lastInsertId(), 'group_name' => $name, 'description' => $description], 201);
    }

    $stmt = db()->prepare('UPDATE theater_groups SET group_name = ?, description = ? WHERE id = ?');
    try {
        $stmt->execute([$name, $description, $id]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') json_out(['error' => 'A theater group with that name already exists.'], 409);
        throw $e;
    }
    if ($stmt->rowCount() === 0) {
        $exists = db()->prepare('SELECT 1 FROM theater_groups WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetchColumn()) json_out(['error' => 'Theater group not found.'], 404);
    }
    json_out(['ok' => true]);
}

if ($method === 'DELETE') {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) json_out(['error' => 'A valid group id is required.'], 400);
    $check = db()->prepare('SELECT COUNT(*) FROM rehearsals WHERE group_id = ?');
    $check->execute([$id]);
    if ((int)$check->fetchColumn() > 0) json_out(['error' => 'Move or delete this group’s rehearsals before deleting the group.'], 409);
    $stmt = db()->prepare('DELETE FROM theater_groups WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) json_out(['error' => 'Theater group not found.'], 404);
    json_out(['ok' => true]);
}

header('Allow: GET, POST, PUT, DELETE');
json_out(['error' => 'Method not allowed'], 405);
