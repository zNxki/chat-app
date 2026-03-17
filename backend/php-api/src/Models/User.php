<?php
namespace App\Models;

class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $username,
        public readonly string $color,
        public readonly bool $isBanned,
        public readonly string $createdAt
    ) {
    }

    public static function fromRow(array $row): self
    {
        return new self(
            id: (int) $row['id'],
            username: $row['username'],
            color: $row['color'],
            isBanned: (bool) $row['is_banned'],
            createdAt: $row['created_at']
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'color' => $this->color,
            'is_banned' => $this->isBanned,
            'created_at' => $this->createdAt,
        ];
    }
}