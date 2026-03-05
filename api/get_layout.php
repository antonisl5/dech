<?php
require_once 'init_db.php';

header('Content-Type: application/json');

try {
    $db = get_db_connection();

    // Get widgets
    $stmt = $db->query("SELECT id, type, \"left\", top, width, height, z_index, config FROM widgets");
    $widgets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($widgets as &$w) {
        $w['config'] = json_decode($w['config'], true);
    }

    // Get global background color
    $bgStmt = $db->query("SELECT value FROM settings WHERE key = 'global_background_color'");
    $bgColorResult = $bgStmt->fetch(PDO::FETCH_ASSOC);
    $globalBgColor = $bgColorResult ? $bgColorResult['value'] : '#000000';

    echo json_encode(['success' => true, 'widgets' => $widgets, 'global_background_color' => $globalBgColor]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
