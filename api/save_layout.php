<?php
require_once 'auth.php';
require_login();
require_once 'init_db.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (isset($data['widgets']) && is_array($data['widgets']) && isset($data['screens']) && is_array($data['screens'])) {
        try {
            $db = get_db_connection();

            // Start transaction
            $db->beginTransaction();

            // 1. Update Screens
            $stmtScreen = $db->prepare("UPDATE screens SET player1_enabled = :p1, player2_enabled = :p2, duration = :duration, transition = :transition WHERE id = :id");
            foreach ($data['screens'] as $screen) {
                if (isset($screen['id'], $screen['player1_enabled'], $screen['player2_enabled'], $screen['duration'], $screen['transition'])) {
                    $stmtScreen->execute([
                        ':id' => intval($screen['id']),
                        ':p1' => intval($screen['player1_enabled']),
                        ':p2' => intval($screen['player2_enabled']),
                        ':duration' => intval($screen['duration']),
                        ':transition' => $screen['transition']
                    ]);
                }
            }

            // 2. Clear old widgets
            $db->exec("DELETE FROM widgets");

            // 3. Insert new widgets
            $stmtWidget = $db->prepare("INSERT INTO widgets (id, screen_id, type, \"left\", top, width, height, z_index, config) VALUES (:id, :screen_id, :type, :left, :top, :width, :height, :z_index, :config)");

            foreach ($data['widgets'] as $widget) {
                // Validate essential fields
                if (isset($widget['id'], $widget['screen_id'], $widget['type'], $widget['left'], $widget['top'], $widget['width'], $widget['height'], $widget['z_index'])) {
                    $config_json = isset($widget['config']) ? json_encode($widget['config']) : '{}';

                    $stmtWidget->execute([
                        ':id' => $widget['id'],
                        ':screen_id' => intval($widget['screen_id']),
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

            // 4. Save global background color
            if (isset($data['global_background_color'])) {
                $bgStmt = $db->prepare("INSERT INTO settings (key, value) VALUES ('global_background_color', :val) ON CONFLICT(key) DO UPDATE SET value = :val");
                $bgStmt->execute([':val' => $data['global_background_color']]);
            }

            // 5. Save Working Hours
            if (isset($data['working_hours_start'])) {
                $whStartStmt = $db->prepare("INSERT INTO settings (key, value) VALUES ('working_hours_start', :val) ON CONFLICT(key) DO UPDATE SET value = :val");
                $whStartStmt->execute([':val' => $data['working_hours_start']]);
            }

            if (isset($data['working_hours_end'])) {
                $whEndStmt = $db->prepare("INSERT INTO settings (key, value) VALUES ('working_hours_end', :val) ON CONFLICT(key) DO UPDATE SET value = :val");
                $whEndStmt->execute([':val' => $data['working_hours_end']]);
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