<?php
require_once __DIR__ . '/db.php';

$isHttps = !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}
header('Cache-Control: no-store, private');

function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function current_user(): ?array {
    static $resolved = false;
    static $user = null;
    if ($resolved) return $user;
    $resolved = true;
    if (!isset($_SESSION['user']['id'])) return null;

    $stmt = db()->prepare('SELECT id, name, email, role FROM users WHERE id = ?');
    $stmt->execute([(int)$_SESSION['user']['id']]);
    $record = $stmt->fetch();
    if (!$record) {
        unset($_SESSION['user']);
        return null;
    }

    $user = safe_user($record);
    $_SESSION['user'] = $user;
    return $user;
}

function require_user(): array {
    $user = current_user();
    if (!$user) json_out(['error' => 'Please sign in to continue.'], 401);
    return $user;
}

function require_admin(): array {
    $user = require_user();
    if (($user['role'] ?? '') !== 'admin') json_out(['error' => 'Administrator access is required.'], 403);
    return $user;
}

function require_csrf(): void {
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
        json_out(['error' => 'Your session has expired. Refresh the page and try again.'], 419);
    }
}

function safe_user(array $user): array {
    return [
        'id' => (int)$user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
    ];
}

function start_user_session(array $user): void {
    session_regenerate_id(true);
    $_SESSION['user'] = safe_user($user);
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
