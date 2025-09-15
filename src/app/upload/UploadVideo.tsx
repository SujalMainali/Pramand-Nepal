// app/upload-video/page.tsx (or your component)
"use client";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import toast from "react-hot-toast";
import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import { generateThumbnailFromFile } from "@/utilities/thumbnail";
import { useLoading } from "@/context/LoadingContext";

export default function UploadVideo() {

    const { setLoading } = useLoading();

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
            setLoading(true);

            // Path inside your Blob store (folder prefix is optional)
            const pathname = `videos/${videoFile.name}`;

            // 👇 Client upload to Vercel Blob; your API route will issue the token
            const videoBlob: PutBlobResult = await upload(pathname, videoFile, {
                access: "public",
                handleUploadUrl: "/api/videos/handleUpload",
                // This payload is echoed back to your server in onUploadCompleted
                clientPayload: JSON.stringify({
                    title: description,   // map description -> title in DB
                    address,
                }),
            });

            setLoading(false);

            toast.success(`Video uploaded! ✅ URL: ${videoBlob.url}`);
            console.log("Upload details:", videoBlob);

            // Create a cover at ~2s, max 640px wide
            const thumb = await generateThumbnailFromFile(videoFile, {
                timeSec: 2,
                maxWidth: 640,
                mime: "image/jpeg",
                quality: 0.82,
            });

            // Deterministic path per video (nice for overwrite/regenerate flows)
            const thumbPath = `thumbnails/${videoBlob.pathname.replace(/^videos\//, "").replace(/\.[^.]+$/, "")}-cover.jpg`;

            const thumbBlob: PutBlobResult = await upload(thumbPath, thumb.blob, {
                access: "public",
                handleUploadUrl: "/api/thumbnails/handleUpload",
                clientPayload: JSON.stringify({
                    // let server join thumbnail -> video
                    videoBlobPath: videoBlob.pathname,    // <-- critical: unique on Video
                    width: thumb.width,
                    height: thumb.height,
                    timecodeSec: thumb.timeSec,
                    isCover: true,                        // or false if this is just an extra
                }),
            });



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

        <div className="flex-1 flex items-center justify-center bg-gray-100 p-8">
            <Toaster position="top-right" />
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
                <h1 className="mb-8 text-center text-2xl font-bold text-gray-800">
                    Upload Video
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Video Upload */}
                    <div>
                        <label className="block text-md font-medium text-gray-700 mb-2">
                            Select Video
                        </label>
                        <div className="border border-gray-300 rounded-md">
                            <input
                                type="file"
                                accept="video/mp4,video/webm,video/ogg"
                                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                required
                                className="m-2 w-full text-gray-700
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-600
                  hover:file:bg-blue-100 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-md font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Write a little description..."
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900
                focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-md font-medium text-gray-700 mb-2">
                            Address of Incident
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter incident address"
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900
                focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-60"
                    >
                        {busy ? "Uploading…" : "Upload"}
                    </button>
                </form>
            </div>
        </div>
    );
}
