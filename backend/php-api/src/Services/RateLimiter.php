<?php
namespace Api\Services;

use Api\Database\Database;

class RateLimiter
{
    private int $maxPerMinute;

    public function __construct(int $maxPerMinute = 10)
    {
        $this->maxPerMinute = $maxPerMinute;
    }

    public function check(int $userId): bool
    {
        $db = Database::get();
        $minute = date('Y-m-d H:i');

        $stmt = $db->prepare("
            INSERT INTO rate_limits (user_id, minute, count)
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, minute) DO UPDATE SET count = count + 1
        ");
        $stmt->execute([$userId, $minute]);

        $row = $db->prepare("SELECT count FROM rate_limits WHERE user_id = ? AND minute = ?");
        $row->execute([$userId, $minute]);
        $count = (int) ($row->fetchColumn() ?? 0);

        return $count <= $this->maxPerMinute;
    }
}