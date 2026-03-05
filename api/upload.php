<?php
require_once 'auth.php';
require_login();

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    $file = $_FILES['file'];

    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $response['message'] = 'Upload failed with error code ' . $file['error'];
        echo json_encode($response);
        exit;
    }

    // Validate file type (allow only images and videos)
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg'];
    $mime_type = mime_content_type($file['tmp_name']);

    if (!in_array($mime_type, $allowed_types)) {
        $response['message'] = 'Invalid file type. Only images and videos are allowed. Detected: ' . $mime_type;
        echo json_encode($response);
        exit;
    }

    // Sanitize filename to prevent directory traversal or malicious names
    $filename = basename($file['name']);
    $filename = preg_replace("/[^a-zA-Z0-9.-]/", "_", $filename);
    $filename = time() . '_' . $filename; // Ensure uniqueness

    $target_dir = __DIR__ . '/../media/';
    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0775, true);
    }

    $target_path = $target_dir . $filename;

    if (move_uploaded_file($file['tmp_name'], $target_path)) {
        // Save to DB
        try {
            require_once 'init_db.php';
            $db = get_db_connection();
            $stmt = $db->prepare("INSERT INTO media (filename, filepath, type) VALUES (:filename, :filepath, :type)");
            $stmt->execute([
                ':filename' => $filename,
                ':filepath' => 'media/' . $filename,
                ':type' => $mime_type
            ]);

            $response['success'] = true;
            $response['message'] = 'File uploaded successfully.';
            $response['filename'] = $filename;
        } catch (PDOException $e) {
            $response['message'] = 'Database error: ' . $e->getMessage();
            // Clean up file if db insert fails
            unlink($target_path);
        }
    } else {
        $response['message'] = 'Failed to move uploaded file.';
    }
} else {
    $response['message'] = 'No file uploaded.';
}

echo json_encode($response);
?>