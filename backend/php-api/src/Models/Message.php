<?php
namespace Api\Models;

class Message
{
    public array $reactions = [];

    public function __construct(
        public readonly int $id,
        public readonly int $userId,
        public readonly int $roomId,
        public readonly string $username,
        public readonly string $color,
        public readonly string $text,
        public readonly string $createdAt
    ) {
    }

    public static function fromRow(array $row): self
    {
        return new self(
            id: (int) $row['id'],
            userId: (int) $row['user_id'],
            roomId: (int) $row['room_id'],
            username: $row['username'],
            color: $row['color'],
            text: $row['text'],
            createdAt: $row['created_at']
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->userId,
            'room_id' => $this->roomId,
            'username' => $this->username,
            'color' => $this->color,
            'text' => $this->text,
            'reactions' => $this->reactions,
            'created_at' => $this->createdAt,
        ];
    }
}