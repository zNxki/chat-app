<?php
namespace Api\Controllers;

use Api\Database\Database;
use Api\Models\Message;
use Api\Services\RateLimiter;

class MessageController
{
    private \PDO $db;
    private RateLimiter $limiter;

    public function __construct()
    {
        $this->db = Database::get();
        $this->limiter = new RateLimiter(10);
    }

    public function getAll(int $roomId): array
    {
        $stmt = $this->db->prepare("
            SELECT m.*, u.username, u.color
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.room_id = ?
            ORDER BY m.created_at ASC
            LIMIT 100
        ");
        $stmt->execute([$roomId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $messages = array_map(fn($r) => Message::fromRow($r), $rows);

        foreach ($messages as $msg) {
            $msg->reactions = $this->getReactions($msg->id);
        }

        return array_map(fn($m) => $m->toArray(), $messages);
    }

    public function create(array $payload, int $roomId, string $text): array
    {
        $userId = $payload['sub'];

        if (!$this->limiter->check($userId)) {
            http_response_code(429);
            return ['error' => 'troppi messaggi, aspetta un po\''];
        }

        if (strlen(trim($text)) === 0) {
            http_response_code(400);
            return ['error' => 'messaggio vuoto'];
        }

        $stmt = $this->db->prepare(
            "INSERT INTO messages (user_id, room_id, text) VALUES (?, ?, ?)"
        );
        $stmt->execute([$userId, $roomId, trim($text)]);
        $id = (int) $this->db->lastInsertId();

        $row = $this->db->query("
            SELECT m.*, u.username, u.color
            FROM messages m JOIN users u ON u.id = m.user_id
            WHERE m.id = $id
        ")->fetch(\PDO::FETCH_ASSOC);

        $msg = Message::fromRow($row);
        $msg->reactions = [];

        http_response_code(201);
        return $msg->toArray();
    }

    public function delete(array $payload, int $id): array
    {
        $stmt = $this->db->prepare(
            "DELETE FROM messages WHERE id = ? AND user_id = ?"
        );
        $stmt->execute([$id, $payload['sub']]);

        if ($stmt->rowCount() === 0) {
            http_response_code(403);
            return ['error' => 'non puoi eliminare questo messaggio'];
        }

        return ['success' => true];
    }

    private function getReactions(int $messageId): array
    {
        $stmt = $this->db->prepare("
            SELECT emoji, COUNT(*) as count,
                   GROUP_CONCAT(u.username) as users
            FROM reactions r
            JOIN users u ON u.id = r.user_id
            WHERE r.message_id = ?
            GROUP BY emoji
        ");
        $stmt->execute([$messageId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}