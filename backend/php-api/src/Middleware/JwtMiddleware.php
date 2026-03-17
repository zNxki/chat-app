<?php
namespace Api\Middleware;

use Api\Services\AuthService;

class JwtMiddleware
{
    private AuthService $auth;

    public function __construct()
    {
        $this->auth = new AuthService();
    }

    public function handle(): ?array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!str_starts_with($header, 'Bearer ')) {
            http_response_code(401);
            echo json_encode(['error' => 'token mancante']);
            return null;
        }

        $token = substr($header, 7);
        $payload = $this->auth->verify($token);

        if (!$payload) {
            http_response_code(401);
            echo json_encode(['error' => 'token non valido']);
            return null;
        }

        return $payload;
    }
}