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
    // Insert default working hours (blank means always on)
    $db->exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('working_hours_start', '')");
    $db->exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('working_hours_end', '')");

    // Create media table
    $db->exec("CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        type TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Create screens table for the multi-screen playlist carousel
    // (Legacy schema creates without player1/2 columns if it existed before,
    // but the IF NOT EXISTS will create it with them if fresh)
    $db->exec("CREATE TABLE IF NOT EXISTS screens (
        id INTEGER PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 1,
        player1_enabled INTEGER NOT NULL DEFAULT 1,
        player2_enabled INTEGER NOT NULL DEFAULT 0,
        duration INTEGER NOT NULL DEFAULT 10,
        transition TEXT NOT NULL DEFAULT 'fade'
    )");

    // Safe Migration: Add player1_enabled and player2_enabled columns to screens if they don't exist
    $resultScreens = $db->query("PRAGMA table_info(screens)");
    $columnsScreens = $resultScreens->fetchAll(PDO::FETCH_ASSOC);
    $hasP1 = false;
    foreach ($columnsScreens as $col) {
        if ($col['name'] === 'player1_enabled') {
            $hasP1 = true;
            break;
        }
    }

    if (!$hasP1) {
        $db->exec("ALTER TABLE screens ADD COLUMN player1_enabled INTEGER NOT NULL DEFAULT 1");
        $db->exec("ALTER TABLE screens ADD COLUMN player2_enabled INTEGER NOT NULL DEFAULT 0");
        // Migrate data: use 'enabled' value for player 1 by default
        $db->exec("UPDATE screens SET player1_enabled = enabled");
    }

    // Insert default 5 screens if they don't exist
    // It's safe to do this here because the table definitely has the columns now
    for ($i = 1; $i <= 5; $i++) {
        $db->exec("INSERT OR IGNORE INTO screens (id, enabled, player1_enabled, player2_enabled, duration, transition) VALUES ($i, 1, 1, 0, 10, 'fade')");
    }

    // Create widgets table (Base schema)
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

    // Safe Migration: Add screen_id column if it doesn't exist to preserve existing layouts
    $resultWidgets = $db->query("PRAGMA table_info(widgets)");
    $columnsWidgets = $resultWidgets->fetchAll(PDO::FETCH_ASSOC);
    $hasScreenId = false;
    foreach ($columnsWidgets as $col) {
        if ($col['name'] === 'screen_id') {
            $hasScreenId = true;
            break;
        }
    }

    if (!$hasScreenId) {
        // Add column and set all existing widgets to screen_id 1
        $db->exec("ALTER TABLE widgets ADD COLUMN screen_id INTEGER NOT NULL DEFAULT 1 REFERENCES screens(id)");
    }

    // Ensure we don't spam output if required by another file
    if (php_sapi_name() === 'cli' && basename(__FILE__) == basename($_SERVER["SCRIPT_FILENAME"])) {
        echo "Database initialized successfully.\n";
    }
}

// Auto-run if hit via web request or required for the first time
init_db();

// Only output if executed directly from CLI
if (php_sapi_name() === 'cli' && basename(__FILE__) == basename($_SERVER["SCRIPT_FILENAME"])) {
    // Already handled above
}
?>