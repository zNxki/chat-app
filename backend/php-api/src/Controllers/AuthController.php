<?php
namespace Api\Controllers;

use Api\Services\AuthService;

class AuthController
{
    private AuthService $auth;

    public function __construct()
    {
        $this->auth = new AuthService();
    }

    public function register(array $body): array
    {
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');
        $color = $body['color'] ?? '#e8c547';

        if (strlen($username) < 2)
            return ['error' => 'username troppo corto'];
        if (strlen($password) < 4)
            return ['error' => 'password troppo corta'];

        return $this->auth->register($username, $password, $color);
    }

    public function login(array $body): array
    {
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');
        $color = $body['color'] ?? '#e8c547';

        if (strlen($username) < 2)
            return ['error' => 'username troppo corto'];
        if (strlen($password) < 4)
            return ['error' => 'password troppo corta'];

        return $this->auth->register($username, $password, $color);
    }
}