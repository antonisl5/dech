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

            $stmt = $db->prepare("INSERT INTO widgets (id, type, \"left\", top, width, height, z_index, config) VALUES (:id, :type, :left, :top, :width, :height, :z_index, :config)");

            foreach ($data['widgets'] as $widget) {
                // Validate essential fields
                if (isset($widget['id'], $widget['type'], $widget['left'], $widget['top'], $widget['width'], $widget['height'], $widget['z_index'])) {
                    $config_json = isset($widget['config']) ? json_encode($widget['config']) : '{}';

                    $stmt->execute([
                        ':id' => $widget['id'],
                        ':type' => $widget['type'],
                        ':left' => floatval($widget['left']),
                        ':top' => floatval($widget['top']),
                        ':width' => floatval($widget['width']),
                        ':height' => floatval($widget['height']),
                        ':z_index' => intval($widget['z_index']),
                        ':config' => $config_json
                    ]);
                }
            }

            // Save global background color if provided
            if (isset($data['global_background_color'])) {
                $bgStmt = $db->prepare("INSERT INTO settings (key, value) VALUES ('global_background_color', :val) ON CONFLICT(key) DO UPDATE SET value = :val");
                $bgStmt->execute([':val' => $data['global_background_color']]);
            }

            // Update a timestamp in settings to trigger SSE
            $ts = time();
            $updateTsStmt = $db->prepare("INSERT INTO settings (key, value) VALUES ('layout_updated_at', :val) ON CONFLICT(key) DO UPDATE SET value = :val");
            $updateTsStmt->execute([':val' => (string)$ts]);

            $db->commit();
            $response['success'] = true;
            $response['message'] = 'Layout saved successfully.';

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
