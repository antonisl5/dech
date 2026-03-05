<?php
require_once 'init_db.php';

header('Content-Type: application/json');

try {
    $db = get_db_connection();
    $stmt = $db->query("SELECT id, type, x, y, w, h, config FROM widgets");
    $widgets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Decode JSON configuration arrays before sending them to JS client
    foreach ($widgets as &$w) {
        $w['config'] = json_decode($w['config'], true);
    }

    echo json_encode(['success' => true, 'widgets' => $widgets]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>