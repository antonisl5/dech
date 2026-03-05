<?php
$data = json_encode([
    'widgets' => [
        [
            'id' => 'test1',
            'type' => 'freetext',
            'left' => 10,
            'top' => 10,
            'width' => 20,
            'height' => 20,
            'z_index' => 1,
            'config' => ['text' => 'Hello']
        ]
    ]
]);

$ch = curl_init('http://localhost:8080/api/save_layout.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
// Mock the auth session
session_start();
$_SESSION['admin_logged_in'] = true;
session_write_close();
curl_setopt($ch, CURLOPT_COOKIE, 'PHPSESSID=' . session_id());
$response = curl_exec($ch);
echo $response;
?>
