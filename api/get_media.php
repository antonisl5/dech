<?php
header('Content-Type: application/json');

require_once 'init_db.php';

try {
    $db = get_db_connection();
    $stmt = $db->query("SELECT id, filename, filepath, type, uploaded_at FROM media ORDER BY uploaded_at DESC");
    $media = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'media' => $media]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>