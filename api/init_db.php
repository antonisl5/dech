<?php
// Initialize database connection
function get_db_connection() {
    $db_path = __DIR__ . '/../db/signage.sqlite';
    $db = new PDO("sqlite:" . $db_path);
    // Set error mode to exceptions
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Enable WAL mode for better concurrency
    $db->exec('PRAGMA journal_mode = wal;');
    return $db;
}

function init_db() {
    $db = get_db_connection();

    // Create settings table
    $db->exec("CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
    )");

    // Insert default global background color
    $db->exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('global_background_color', '#000000')");

    // Create media table
    $db->exec("CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        type TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Since we are changing the schema from x/y/w/h to left/top/width/height/z_index,
    // we must drop the old table first so the new layout builder can save successfully.
    $db->exec("DROP TABLE IF EXISTS widgets");

    // Create widgets table (Updated schema)
    // Note: Wrapping "left" in quotes because it is a reserved SQL keyword
    $db->exec("CREATE TABLE IF NOT EXISTS widgets (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        \"left\" REAL NOT NULL,
        top REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        z_index INTEGER NOT NULL DEFAULT 1,
        config TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    echo "Database initialized successfully.\n";
}

// Only run initialization if this file is executed directly (e.g. from setup.sh)
if (php_sapi_name() === 'cli' && basename(__FILE__) == basename($_SERVER["SCRIPT_FILENAME"])) {
    init_db();
}
?>
