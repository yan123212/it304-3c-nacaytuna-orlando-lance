<?php
// LOCAL ONLY. Copy this file to config.local.php (same folder) and edit it.
// config.local.php is ignored by git, so your local password never reaches GitHub.
// On the server, a different config is provided automatically.
return [
    'db_host' => '127.0.0.1',
    'db_name' => 'it304_local',   // create this database in phpMyAdmin, then import database.sql
    'db_user' => 'root',
    'db_pass' => '',              // XAMPP default is empty
];
