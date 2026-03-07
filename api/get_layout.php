<?php
require_once 'init_db.php';

header('Content-Type: application/json');

try {
    $db = get_db_connection();

    // Get screens
    $stmt = $db->query("SELECT id, player1_enabled, player2_enabled, duration, transition FROM screens ORDER BY id ASC");
    $screens = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get widgets
    $stmt = $db->query("SELECT id, screen_id, type, \"left\", top, width, height, z_index, config FROM widgets");
    $widgets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($widgets as &$w) {
        $w['config'] = json_decode($w['config'], true);
    }

    // Get Settings Helper
    function getSetting($db, $key, $default = '') {
        $stmt = $db->prepare("SELECT value FROM settings WHERE key = :key");
        $stmt->execute([':key' => $key]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['value'] : $default;
    }

    $globalBgColor = getSetting($db, 'global_background_color', '#000000');
    $whStart = getSetting($db, 'working_hours_start', '');
    $whEnd = getSetting($db, 'working_hours_end', '');

    echo json_encode([
        'success' => true,
        'screens' => $screens,
        'widgets' => $widgets,
        'global_background_color' => $globalBgColor,
        'working_hours_start' => $whStart,
        'working_hours_end' => $whEnd
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>