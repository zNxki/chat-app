import { logger } from './logger';

const bannedWords = ['spam', 'badword'];
const bannedUsers = new Set<string>();
const userWarnings = new Map<string, number>();

export function isBanned(username: string): boolean {
    return bannedUsers.has(username.toLowerCase());
}

export function banUser(username: string): void {
    bannedUsers.add(username.toLowerCase());
    logger.warn(`User banned: ${username}`);
}

export function unbanUser(username: string): void {
    bannedUsers.delete(username.toLowerCase());
    logger.info(`User unbanned: ${username}`);
}

export function moderateText(text: string, username: string): { ok: boolean; reason?: string } {
    for (const word of bannedWords) {
        if (text.toLowerCase().includes(word)) {
            const warnings = (userWarnings.get(username) ?? 0) + 1;
            userWarnings.set(username, warnings);
            logger.warn(`Bad word from ${username} (warning ${warnings})`);
            if (warnings >= 3) {
                banUser(username);
                return { ok: false, reason: 'bannato per comportamento ripetuto' };
            }
            return { ok: false, reason: `parola non consentita (avviso ${warnings}/3)` };
        }
    }
    return { ok: true };
}

export function getBannedList(): string[] {
    return Array.from(bannedUsers);
}