<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Metodo nao permitido']);
    exit;
}

require_once __DIR__ . '/../../config/db.php';

$body     = json_decode(file_get_contents('php://input'), true);
$username = trim($body['username'] ?? '');
$message  = trim($body['message']  ?? '');

if ($username === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'username e message sao obrigatorios']);
    exit;
}

// Limitar tamanho
$username = mb_substr($username, 0, 50);
$message  = mb_substr($message,  0, 1000);

try {
    $pdo  = getDb();
    $stmt = $pdo->prepare(
        'INSERT INTO messages (username, message) VALUES (:username, :message)'
    );
    $stmt->execute([':username' => $username, ':message' => $message]);
    $id = $pdo->lastInsertId();

    // Notifica o servidor Node para broadcast via WebSocket
    $payload = json_encode([
        'id'         => (int) $id,
        'username'   => $username,
        'message'    => $message,
        'created_at' => date('Y-m-d H:i:s'),
    ]);

    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\nContent-Length: " . strlen($payload) . "\r\n",
        'content' => $payload,
        'timeout' => 2,
        'ignore_errors' => true,
    ]]);
    @file_get_contents('http://node:3000/internal/broadcast', false, $ctx);

    echo json_encode(['ok' => true, 'id' => (int) $id]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
