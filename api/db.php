<?php
// Shared helpers for every API file:  require __DIR__ . '/db.php';
//
// Database settings are loaded from ONE of these (first one found):
//   1. ../../config.php        -> created for you on the server (staging and production).
//                                 Never commit your own config.php there.
//   2. config.local.php        -> YOUR laptop. Copy config.local.example.php to config.local.php
//                                 and edit it. It is in .gitignore, so it never gets pushed.

declare(strict_types=1);

function load_config(): array {
    $server = __DIR__ . '/../../config.php';
    if (is_file($server)) return require $server;
    $local = __DIR__ . '/config.local.php';
    if (is_file($local)) return require $local;
    json_out(['error' => 'No database config. Copy api/config.local.example.php to api/config.local.php'], 500);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = load_config();
    $pdo = new PDO(
        "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4",
        $c['db_user'], $c['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    return $pdo;
}

function json_out($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function json_in(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) json_out(['error' => 'Request body must be valid JSON.'], 400);
    return $data;
}

// Turn any uncaught error into a JSON 500. The details go to the PHP error log
// (on the server: your private log page), not to the browser.
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    json_out(['error' => 'Server error'], 500);
});
