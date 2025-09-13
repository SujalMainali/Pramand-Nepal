// app/upload-video/page.tsx (or your component)
"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";

export default function UploadVideo() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [description, setDescription] = useState("");
    const [address, setAddress] = useState("");
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoFile) {
            toast.error("Please select a video file!");
            return;
        }

        try {
            setBusy(true);

            // Path inside your Blob store (folder prefix is optional)
            const pathname = `videos/${videoFile.name}`;

            // 👇 Client upload to Vercel Blob; your API route will issue the token
            const blob: PutBlobResult = await upload(pathname, videoFile, {
                access: "public",
                handleUploadUrl: "/api/videos/handle-upload",
                // This payload is echoed back to your server in onUploadCompleted
                clientPayload: JSON.stringify({
                    title: description,   // map description -> title in DB
                    address,
                }),
            });

            // `blob.url` and `blob.downloadUrl` are ready
            toast.success("Video uploaded successfully!");

            // Reset form
            setVideoFile(null);
            setDescription("");
            setAddress("");
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Upload failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <input
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                required
            />
            <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border px-2 py-1 rounded w-full"
            />
            <input
                type="text"
                placeholder="Address (optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="border px-2 py-1 rounded w-full"
            />
            <button
                disabled={busy}
                className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-60"
            >
                {busy ? "Uploading…" : "Upload"}
            </button>
        </form>
    );
}
