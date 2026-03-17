<?php
namespace Api\Controllers;

use Api\Database\Database;
use Api\Models\Room;

class RoomController
{
    private \PDO $db;

    public function __construct()
    {
        $this->db = Database::get();
    }

    public function getAll(): array
    {
        $rows = $this->db->query("SELECT * FROM rooms ORDER BY id ASC")
                         ->fetchAll(\PDO::FETCH_ASSOC);
        return array_map(fn($r) => Room::fromRow($r)->toArray(), $rows);
    }

    public function create(array $body): array
    {
        $name = trim($body['name'] ?? '');
        $desc = trim($body['description'] ?? '');

        if (strlen($name) < 2) {
            http_response_code(400);
            return ['error' => 'nome stanza troppo corto'];
        }

        $stmt = $this->db->prepare(
            "INSERT INTO rooms (name, description) VALUES (?, ?)"
        );
        $stmt->execute([$name, $desc]);
        $id = (int)$this->db->lastInsertId();

        $row = $this->db->query("SELECT * FROM rooms WHERE id = $id")
                        ->fetch(\PDO::FETCH_ASSOC);

        http_response_code(201);
        return Room::fromRow($row)->toArray();
    }
}