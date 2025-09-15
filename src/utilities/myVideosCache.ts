// Keep this client-side only module
// app/lib/myVideosCache.ts
export const SELF_SS_KEY = "myVideosCache_v1";

let selfCache: { items: any[]; ts: number } | null = null;

export function getSelfCache(ttlMs = 45_000) {
    if (!selfCache) return null;
    if (Date.now() - selfCache.ts > ttlMs) return null;
    return selfCache.items;
}

export function setSelfCache(items: any[]) {
    selfCache = { items, ts: Date.now() };
    try {
        sessionStorage.setItem(SELF_SS_KEY, JSON.stringify(selfCache));
    } catch { }
}

export function readSelfFromSession(ttlMs = 45_000) {
    try {
        const raw = sessionStorage.getItem(SELF_SS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { items: any[]; ts: number };
        if (Date.now() - parsed.ts > ttlMs) return null;
        selfCache = parsed;           // sync memory
        return parsed.items;
    } catch {
        return null;
    }
}

export function invalidateSelfCache() {
    selfCache = null;
    try { sessionStorage.removeItem(SELF_SS_KEY); } catch { }
}
