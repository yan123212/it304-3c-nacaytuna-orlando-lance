<?php
// Quick check: open /api/health.php in the browser. "db": "ok" means PHP can reach your database.
require __DIR__ . '/db.php';
try { db()->query('SELECT 1'); $db = 'ok'; } catch (Throwable $e) { error_log($e->getMessage()); $db = 'error'; }
json_out(['api' => 'ok', 'db' => $db, 'php' => PHP_VERSION, 'time' => date('c')]);
