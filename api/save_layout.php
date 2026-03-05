<?php
require_once 'auth.php';
require_login();
require_once 'init_db.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (isset($data['widgets']) && is_array($data['widgets'])) {
        try {
            $db = get_db_connection();

            // Start transaction
            $db->beginTransaction();

            // Clear old widgets
            $db->exec("DELETE FROM widgets");

            $stmt = $db->prepare("INSERT INTO widgets (id, type, x, y, w, h, config) VALUES (:id, :type, :x, :y, :w, :h, :config)");

            foreach ($data['widgets'] as $widget) {
                // Validate essential fields
                if (isset($widget['id'], $widget['type'], $widget['x'], $widget['y'], $widget['w'], $widget['h'])) {
                    $config_json = isset($widget['config']) ? json_encode($widget['config']) : '{}';

                    $stmt->execute([
                        ':id' => $widget['id'],
                        ':type' => $widget['type'],
                        ':x' => intval($widget['x']),
                        ':y' => intval($widget['y']),
                        ':w' => intval($widget['w']),
                        ':h' => intval($widget['h']),
                        ':config' => $config_json
                    ]);
                }
            }

            // Update a timestamp in settings to trigger SSE
            $ts = time();
            $updateTsStmt = $db->prepare("INSERT INTO settings (key, value) VALUES ('layout_updated_at', :val) ON CONFLICT(key) DO UPDATE SET value = :val");
            $updateTsStmt->execute([':val' => (string)$ts]);

            $db->commit();
            $response['success'] = true;
            $response['message'] = 'Layout saved successfully.';

            // To notify SSE connection, we write to a simple file acting as a semaphore for immediate response without DB polling overhead if desired,
            // or we just rely on the database timestamp. Using a semaphore file is often faster for SSE in PHP.
            file_put_contents(__DIR__ . '/../db/sse_trigger.txt', $ts);

        } catch (PDOException $e) {
            if (isset($db)) $db->rollBack();
            $response['message'] = 'Database error: ' . $e->getMessage();
        }
    } else {
         $response['message'] = 'Invalid payload format.';
    }
} else {
     $response['message'] = 'Invalid request method.';
}

echo json_encode($response);
?>