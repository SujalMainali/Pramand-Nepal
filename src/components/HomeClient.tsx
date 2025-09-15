"use client";

import { useEffect, useState } from "react";
import ContentSection, { VideoItem } from "../components/ContentSection";
import {
    getSelfCache,
    setSelfCache,
    readSelfFromSession,
} from "@/utilities/myVideosCache";

// --- public browse cache (unchanged) ---
let browseCache: { items: VideoItem[]; ts: number } | null = null;
const BROWSE_TTL_MS = 60_000;

export default function HomeClient() {
    const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
    const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState({ mine: true, all: true });

    useEffect(() => {
        // SELF (private): memory + sessionStorage prefill, then background refresh
        (async () => {
            let prefilled = false;

            const mem = getSelfCache();
            if (mem) {
                setMyVideos(mem as VideoItem[]);
                prefilled = true;
            } else {
                const ss = readSelfFromSession();
                if (ss) {
                    setMyVideos(ss as VideoItem[]);
                    prefilled = true;
                }
            }
            setLoading((s) => ({ ...s, mine: !prefilled }));

            try {
                const res = await fetch("/api/videos/self", { cache: "no-store" });
                const items: VideoItem[] = res.ok ? (await res.json()).items ?? [] : [];
                setMyVideos(items);
                setSelfCache(items);
            } finally {
                setLoading((s) => ({ ...s, mine: false }));
            }
        })();

        // BROWSE (public): in-memory + CDN
        (async () => {
            const now = Date.now();
            const cached = browseCache && now - browseCache.ts < BROWSE_TTL_MS;
            if (cached) {
                setAllVideos(browseCache!.items);
                setLoading((s) => ({ ...s, all: false }));
                return;
            }
            try {
                setLoading((s) => ({ ...s, all: true }));
                const res = await fetch("/api/videos/browse");
                const items: VideoItem[] = res.ok ? (await res.json()).items ?? [] : [];
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
                <ContentSection title="My Uploaded Videos" showUpload videos={loading.mine ? [] : myVideos} />
                <ContentSection title="Browse Videos" videos={loading.all ? [] : allVideos} />
            </div>
        </div>
    );
}
