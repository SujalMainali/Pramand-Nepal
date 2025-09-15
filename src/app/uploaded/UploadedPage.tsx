"use client";

import { useEffect, useState } from "react";
import { VideoItem } from "@/components/ContentSection";
import VideoRow from "@/components/VideoRow";
import { useLoading } from "@/context/LoadingContext";
import { invalidateSelfCache } from "@/utilities/myVideosCache";

export default function UploadedPage() {
    const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
    const { isLoading, setLoading } = useLoading();

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/videos/self", { cache: "no-store" });
                setMyVideos(res.ok ? (await res.json()).items ?? [] : []);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this video?")) return;

        try {
            const res = await fetch(`/api/videos/${id}/delete`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data?.error || "Failed to delete video");
                return;
            }

            // Remove the deleted video from the UI list
            setMyVideos((prev) => prev.filter((v) => v._id !== id));

            invalidateSelfCache();
            alert("Video deleted successfully!");
        } catch (err) {
            console.error(err);
            alert("Something went wrong while deleting the video");
        }
    };


    return (
        <div className="p-8 bg-white rounded-2xl shadow-md animate-slideUp">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 relative">
                My Uploaded Videos
                <span className="absolute -bottom-[14px] left-0 w-16 h-1 bg-blue-500 rounded" />
            </h1>

            {isLoading ? (
                <p className="text-gray-500">Loading...</p>
            ) : myVideos.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-gray-500">
                    No videos uploaded yet.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full bg-white rounded-lg overflow-hidden">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    S.N.
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    Thumbnail
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    Title
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {myVideos.map((video, index) => (
                                <VideoRow
                                    key={video._id}
                                    index={index + 1}
                                    video={video}
                                    onDelete={() => handleDelete(video._id)}
                                    showDelete
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
