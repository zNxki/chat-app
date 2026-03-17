<?php
namespace Api\Controllers;

use Api\Database\Database;

class ReactionController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::get();
    }

    public function toggle(array $payload, int $messageId, string $emoji): array
    {
        $userId = $payload['sub'];
        $allowed = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

        if (!in_array($emoji, $allowed)) {
            http_response_code(400);
            return ['error' => 'emoji non permessa'];
        }

        $check = $this->db->prepare(
            "SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?"
        );
        $check->execute([$messageId, $userId, $emoji]);

        if ($check->fetch()) {
            $this->db->prepare(
                "DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?"
            )->execute([$messageId, $userId, $emoji]);
            return ['action' => 'removed'];
        }

        $this->db->prepare(
            "INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)"
        )->execute([$messageId, $userId, $emoji]);

        return ['action' => 'added'];
    }
}