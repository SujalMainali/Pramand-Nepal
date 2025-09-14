// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Use a FIXED WINDOW to minimize Redis commands and save free-tier budget
// 60 requests/minute per key (IP). Tweak to taste.
const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(60, "1 m"),
    // analytics: false, // keep it off to save 1 command per request
    prefix: "rl:browse",
});

function clientKey(req: NextRequest) {
    // Try common proxy headers in order of reliability
    const ip =
        req.headers.get("x-real-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-vercel-ip") || // sometimes present on Vercel
        "0.0.0.0"; // fallback (esp. in local dev)

    return ip;
}

export default async function middleware(req: NextRequest) {
    // Only rate-limit the public browse endpoint (GETs)
    if (req.method === "GET" && req.nextUrl.pathname.startsWith("/api/videos/browse")) {
        const key = clientKey(req);
        const { success, reset, remaining, limit } = await limiter.limit(key);
        if (!success) {
            const retrySec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
            return new NextResponse("Too Many Requests", {
                status: 429,
                headers: {
                    "Retry-After": String(retrySec),
                    "X-RateLimit-Limit": String(limit),
                    "X-RateLimit-Remaining": "0",
                },
            });
        }

        const res = NextResponse.next();
        // These headers pass through to help you observe in dev; CDN still caches the body.
        res.headers.set("X-RateLimit-Limit", String(limit));
        res.headers.set("X-RateLimit-Remaining", String(remaining));
        return res;
    }

    return NextResponse.next();
}

// Only run on the browse API (edge middleware runs before CDN cache)
export const config = {
    matcher: ["/api/videos/browse"],
};
