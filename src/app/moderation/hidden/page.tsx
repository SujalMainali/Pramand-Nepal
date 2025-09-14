// app/moderation/page.tsx
"use client";

import { useEffect, useState } from "react";
import VideoRow from "@/components/VideoRow"; // adjust path if needed

type Item = {
    _id: string;
    title: string;
    createdAt: string;
    blobUrl: string;
    downloadUrl?: string;
    thumbnail?: { url?: string | null };
    owner?: { name?: string; email?: string };
};

export default function ModerationPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        try {
            setLoading(true);
            const res = await fetch("/api/videos/hidden?limit=60", { cache: "no-store" });
            if (!res.ok) {
                setItems([]);
                return;
            }
            const data = await res.json();
            setItems(data.items ?? []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function handleApprove(id: string) {
        const res = await fetch(`/api/videos/${id}/approve`, { method: "POST" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err?.error || "Approve failed");
            return;
        }
        setItems((prev) => prev.filter((x) => x._id !== id));
    }

    async function handleDecline(id: string) {
        if (!confirm("Are you sure you want to decline this video?")) return;

        try {
            const res = await fetch(`/api/videos/${id}/delete`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data?.error || "Failed to decline video");
                return;
            }

            // Remove the declined video from the UI list
            setItems((prev) => prev.filter((v) => v._id !== id));

            alert("Video declined successfully!");
        } catch (err) {
            console.error(err);
            alert("Something went wrong while declining the video");
        }
    }


    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="mx-auto max-w-6xl px-4 pt-10">
                <h2 className="mb-6 text-2xl font-bold text-gray-800">
                    Videos Pending Moderation
                </h2>

                {loading ? (
                    <div className="text-gray-500">Loading…</div>
                ) : items.length === 0 ? (
                    <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-gray-500">
                        No videos to review.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full text-left text-sm text-gray-700">
                            <thead className="bg-gray-100 text-sm font-semibold text-gray-700">
                                <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Thumbnail</th>
                                    <th className="px-4 py-3">Title</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((video, index) => (
                                    <VideoRow
                                        key={video._id}
                                        index={index + 1}
                                        video={video}
                                        onApprove={() => handleApprove(video._id)}
                                        onDecline={() => handleDecline(video._id)}
                                        showApproveDecline
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
