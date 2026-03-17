
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class MemoryCache {
    private store = new Map<string, CacheEntry<unknown>>();

    set<T>(key: string, data: T, ttlMs = 2000): void {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key) as CacheEntry<T> | undefined;
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }

        return entry.data;
    }

    invalidate(pattern: string): void {
        for (const key of this.store.keys()) {
            if (key.includes(pattern))
                this.store.delete(key);
        }
    }

    stats(): { keys: number } {
        return { keys: this.store.size };
    }
}

export const cache = new MemoryCache();