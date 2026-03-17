<?php
require __DIR__ . '/vendor/autoload.php';

use Api\Controllers\AuthController;
use Api\Controllers\MessageController;
use Api\Controllers\RoomController;
use Api\Controllers\ReactionController;
use Api\Middleware\JwtMiddleware;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path   = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts  = explode('/', $path);
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$jwt    = new JwtMiddleware();

// --- AUTH ---
if ($method === 'POST' && $parts[0] === 'auth') {
    $ctrl = new AuthController();
    echo json_encode(
        $parts[1] === 'register' ? $ctrl->register($body) : $ctrl->login($body)
    );
    exit;
}

// --- ROOMS ---
if ($parts[0] === 'rooms') {
    $ctrl = new RoomController();
    if ($method === 'GET') { echo json_encode($ctrl->getAll()); exit; }
    if ($method === 'POST') {
        if (!$jwt->handle()) exit;
        echo json_encode($ctrl->create($body));
        exit;
    }
}

// --- MESSAGES ---
if ($parts[0] === 'messages') {
    $ctrl   = new MessageController();
    $roomId = isset($_GET['room']) ? (int)$_GET['room'] : 1;

    if ($method === 'GET') {
        echo json_encode($ctrl->getAll($roomId)); exit;
    }
    if ($method === 'POST') {
        $payload = $jwt->handle(); if (!$payload) exit;
        echo json_encode($ctrl->create($payload, $roomId, $body['text'] ?? ''));
        exit;
    }
    if ($method === 'DELETE' && isset($parts[1])) {
        $payload = $jwt->handle(); if (!$payload) exit;
        echo json_encode($ctrl->delete($payload, (int)$parts[1]));
        exit;
    }
}

// --- REACTIONS ---
if ($parts[0] === 'reactions' && isset($parts[1]) && $method === 'POST') {
    $payload = $jwt->handle(); if (!$payload) exit;
    $ctrl = new ReactionController();
    echo json_encode($ctrl->toggle($payload, (int)$parts[1], $body['emoji'] ?? ''));
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'route non trovata']);