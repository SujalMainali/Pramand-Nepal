"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function UploadPage() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [description, setDescription] = useState("");
    const [address, setAddress] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVideoFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!videoFile) {
            toast.error("Please select a video file!");
            return;
        }

        toast.success("Video uploaded successfully!");
        setVideoFile(null);
        setDescription("");
        setAddress("");
    };

    return (
        <div className="flex min-h-screen items-center justify-center  bg-gray-100 px-4">
            <Toaster position="top-right" />
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
                <h1 className="mb-8 text-center text-2xl font-bold text-gray-800 relative">
                    Upload Video
                </h1>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Video Upload */}
                    <div>
                        <label className="block text-md font-medium text-gray-700 mb-2">
                            Select Video
                        </label>
                        <div className="border border-gray-300 rounded-md ">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
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
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Submit
                    </button>
                </form>
            </div>
        </div>
    );
}
