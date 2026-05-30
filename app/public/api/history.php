<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/db.php';

try {
    $pdo  = getDb();
    $stmt = $pdo->query(
        'SELECT id, username, message, created_at
         FROM messages
         ORDER BY created_at DESC
         LIMIT 50'
    );
    $rows = array_reverse($stmt->fetchAll());
    echo json_encode(['ok' => true, 'messages' => $rows]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
