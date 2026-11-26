<?php
require __DIR__ . '/auth_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userCount = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    json_out([
        'user' => current_user(),
        'csrf_token' => csrf_token(),
        'setup_needed' => $userCount === 0,
    ]);
}

if ($method === 'DELETE') {
    require_user();
    require_csrf();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_out(['ok' => true]);
}

if ($method !== 'POST') {
    header('Allow: GET, POST, DELETE');
    json_out(['error' => 'Method not allowed'], 405);
}

$input = json_in();
$action = $input['action'] ?? 'login';
$name = trim((string)($input['name'] ?? ''));
$email = strtolower(trim((string)($input['email'] ?? '')));
$password = $input['password'] ?? '';

if (!is_string($password)) json_out(['error' => 'Password must be text.'], 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
    json_out(['error' => 'Enter a valid email address.'], 422);
}

if ($action === 'setup') {
    if ($name === '' || mb_strlen($name) > 120) json_out(['error' => 'Name is required (max 120 characters).'], 422);
    if (strlen($password) < 10 || strlen($password) > 72) json_out(['error' => 'Choose a password between 10 and 72 bytes long.'], 422);

    $pdo = db();
    $pdo->beginTransaction();
    $pdo->query('SELECT id FROM schedule_mutex WHERE id = 1 FOR UPDATE');
    if ((int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() !== 0) {
        $pdo->rollBack();
        json_out(['error' => 'Initial setup is already complete. Please sign in.'], 409);
    }

    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')");
    try {
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        throw $e;
    }

    $user = ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'email' => $email, 'role' => 'admin'];
    $pdo->commit();
    start_user_session($user);
    json_out(['user' => safe_user($user), 'csrf_token' => csrf_token()]);
}

if ($action !== 'login') json_out(['error' => 'Unsupported action.'], 400);
if ($password === '' || strlen($password) > 72) json_out(['error' => 'Email and password are required.'], 422);

$stmt = db()->prepare('SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if (!$user || !password_verify($password, $user['password'])) {
    json_out(['error' => 'The email or password is incorrect.'], 401);
}

if (password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE users SET password = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}

start_user_session($user);
json_out(['user' => safe_user($user), 'csrf_token' => csrf_token()]);
