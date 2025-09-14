// app/moderation/hidden/page.tsx
"use client";

import { useEffect, useState } from "react";

type Item = {
    _id: string;
    title: string;
    createdAt: string;
    blobUrl: string;
    downloadUrl?: string;
    thumbnail?: { url?: string | null };
    owner?: { name?: string; email?: string };
};

export default function HiddenModerationPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

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

    async function approve(id: string) {
        try {
            setBusyId(id);
            const res = await fetch(`/api/videos/${id}/approve`, { method: "POST" });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err?.error || "Approve failed");
                return;
            }
            // Remove the approved item from the list
            setItems((prev) => prev.filter((x) => x._id !== id));
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="mx-auto max-w-6xl px-4 pt-10">
                <h2 className="mb-6 text-2xl font-bold text-gray-800">Hidden Videos (Moderation)</h2>

                {loading ? (
                    <div className="text-gray-500">Loading…</div>
                ) : items.length === 0 ? (
                    <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-gray-500">
                        Nothing to review.
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((v) => {
                            const dl = v.downloadUrl || `${v.blobUrl}?download=1`;
                            return (
                                <li key={v._id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                                    <a href={v.blobUrl} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-gray-100">
                                        {v.thumbnail?.url ? (
                                            <img
                                                src={v.thumbnail.url}
                                                alt={v.title || "Video thumbnail"}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : null}
                                    </a>

                                    <div className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="line-clamp-2 text-base font-medium text-gray-900">
                                                    {v.title || "Untitled video"}
                                                </h3>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Uploaded: {new Date(v.createdAt).toLocaleString()}
                                                    {v.owner?.name ? ` • by ${v.owner.name}` : ""}
                                                </p>
                                            </div>
                                            <a
                                                href={dl}
                                                download
                                                title="Download"
                                                className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                            >
                                                Download
                                            </a>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => approve(v._id)}
                                                disabled={busyId === v._id}
                                                className="inline-flex flex-1 items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                                            >
                                                {busyId === v._id ? "Approving…" : "Approve"}
                                            </button>

                                            {/* Optional: add Reject later
                      <button
                        onClick={() => reject(v._id)}
                        className="inline-flex flex-1 items-center justify-center rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                      */}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
