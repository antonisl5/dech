<?php
require_once 'auth.php';
require_login();
require_once 'init_db.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    $id = intval($_POST['id']);

    try {
        $db = get_db_connection();

        // Fetch file details first
        $stmt = $db->prepare("SELECT filename FROM media WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $media = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($media) {
            $filepath = __DIR__ . '/../media/' . $media['filename'];

            // Delete from database
            $deleteStmt = $db->prepare("DELETE FROM media WHERE id = :id");
            if ($deleteStmt->execute([':id' => $id])) {
                // Delete actual file
                if (file_exists($filepath)) {
                    unlink($filepath);
                }
                $response['success'] = true;
                $response['message'] = 'Media deleted successfully.';
            } else {
                $response['message'] = 'Failed to delete from database.';
            }
        } else {
             $response['message'] = 'Media not found.';
        }
    } catch (PDOException $e) {
         $response['message'] = 'Database error: ' . $e->getMessage();
    }
} else {
    $response['message'] = 'Invalid request.';
}

echo json_encode($response);
?>