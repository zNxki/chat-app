<?php
namespace Api\Services;

use Api\Database\Database;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthService
{
    private string $secret;

    public function __construct()
    {
        $this->secret = 'super_secret_key_changeme_in_production_2024_xyz_abc_123_!@#';
    }

    public function register(string $username, string $password, string $color): array
    {
        $db = Database::get();

        $check = $db->prepare("SELECT id FROM users WHERE username = ?");
        $check->execute([$username]);

        if ($check->fetch()) {
            return ['error' => 'username già lo so.'];
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO users (username, password, color) VALUES (?, ?, ?)");
        $stmt->execute([$username, $hash, $color]);

        $userId = (int) $db->lastInsertId();
        return ['token' => $this->generateToken($userId, $username, $color)];
    }

    public function login(string $username, string $password): array
    {
        $db = Database::get();
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password'])) {
            return ['error' => 'credenziali non valide'];
        }

        if ($user['is_banned']) {
            return ['error' => 'account bannato'];
        }

        return ['token' => $this->generateToken($user['id'], $user['username'], $user['color'])];
    }

    public function generateToken(int $userId, string $username, string $color): string
    {
        return JWT::encode([
            'sub' => $userId,
            'username' => $username,
            'color' => $color,
            'iat' => time(),
            'exp' => time() + 86400 * 7,
        ], $this->secret, 'HS256');
    }

    public function verify(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, 'HS256'));
            return (array) $decoded;
        } catch (\Exception) {
            return null;
        }
    }
}