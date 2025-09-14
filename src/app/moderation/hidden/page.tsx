// app/moderation/hidden/page.tsx
"use client";

import { useEffect, useState } from "react";
// adjust the import path to your project structure
import ContentSection from "@/components/ContentSection";
import { VideoItem } from "@/components/ContentSection";

export default function HiddenModerationPage() {
    const [hiddenVideos, setHiddenVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                // Fetch hidden videos (admin/moderator only; API should enforce auth/role)
                const res = await fetch("/api/videos/hidden?limit=60", { cache: "no-store" });
                if (!res.ok) {
                    // Optional: handle 401/403 here (e.g., redirect or toast)
                    setHiddenVideos([]);
                    return;
                }
                const data = await res.json();
                setHiddenVideos(data.items ?? []);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="max-w-6xl pt-10 mx-auto px-4">
                <ContentSection
                    title="Hidden Videos"
                    videos={loading ? [] : hiddenVideos}
                // no upload button on moderation page
                />
            </div>
        </div>
    );
}
