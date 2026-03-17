<?php
namespace Api\Models;

class Reaction
{
    public function __construct(
        public readonly int $id,
        public readonly int $messageId,
        public readonly int $userId,
        public readonly string $emoji,
        public readonly string $createdAt
    ) {
    }

    public static function fromRow(array $row): self
    {
        return new self(
            id: (int) $row['id'],
            messageId: (int) $row['message_id'],
            userId: (int) $row['user_id'],
            emoji: $row['emoji'],
            createdAt: $row['created_at']
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'message_id' => $this->messageId,
            'user_id' => $this->userId,
            'emoji' => $this->emoji,
            'created_at' => $this->createdAt,
        ];
    }
}