"use client";

import { useEffect, useState } from "react";
import ContentSection, { VideoItem } from "../components/ContentSection";

// --- simple in-memory cache for the public browse feed ---
let browseCache: { items: VideoItem[]; ts: number } | null = null;
const BROWSE_TTL_MS = 60_000; // keep in sync with API s-maxage=60

export default function HomeClient() {
    const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
    const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState({ mine: true, all: true });

    useEffect(() => {
        // --- private list: fetch fresh every time (no-store) ---
        (async () => {
            try {
                setLoading((s) => ({ ...s, mine: true }));
                const res = await fetch("/api/videos/self", { cache: "no-store" });
                setMyVideos(res.ok ? (await res.json()).items ?? [] : []);
            } finally {
                setLoading((s) => ({ ...s, mine: false }));
            }
        })();

        // --- public browse: use in-memory cache + CDN-cached response ---
        (async () => {
            const now = Date.now();
            const cached = browseCache && now - browseCache.ts < BROWSE_TTL_MS;

            if (cached) {
                // instant render from memory
                setAllVideos(browseCache!.items);
                setLoading((s) => ({ ...s, all: false }));
                return;
            }

            try {
                setLoading((s) => ({ ...s, all: true }));
                // IMPORTANT: no `cache: "no-store"` here—let CDN/browser caching work
                const res = await fetch("/api/videos/browse");
                const items: VideoItem[] = res.ok ? (await res.json()).items ?? [] : [];
                // update component + cache
                setAllVideos(items);
                browseCache = { items, ts: now };
            } finally {
                setLoading((s) => ({ ...s, all: false }));
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="max-w-6xl pt-10 mx-auto px-4">
                <ContentSection
                    title="My Uploaded Videos"
                    showUpload
                    videos={loading.mine ? [] : myVideos}
                />
                <ContentSection
                    title="Browse Videos"
                    videos={loading.all ? [] : allVideos}
                />
            </div>
        </div>
    );
}
