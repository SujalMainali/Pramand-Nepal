// app/api/thumbnails/handle-upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";

import { connectDB } from "@/database/mongoose";
import { getCurrentUser } from "@/utilities/auth";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";

export async function POST(req: Request) {
    const body = (await req.json()) as HandleUploadBody;

    try {
        const json = await handleUpload({
            body,
            request: req,

            // 1) Auth + token config
            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                const user = await getCurrentUser();
                if (!user) throw new Error("Unauthorized");

                const cp = clientPayload ? JSON.parse(clientPayload) : {};
                if (!cp?.videoBlobPath) throw new Error("Missing videoBlobPath");

                return {
                    allowedContentTypes: ["image/jpeg", "image/webp", "image/png"],
                    addRandomSuffix: false,            // path is deterministic
                    maximumSizeInBytes: 2_000_000,     // keep thumbs small
                    tokenPayload: JSON.stringify({
                        userId: String(user._id),
                        clientPayload: cp,
                    }),
                    // cacheControlMaxAge: 31536000,   // optional year-long cache
                };
            },

            // 2) After Blob has stored the file, persist in Mongo
            onUploadCompleted: async ({
                blob,
                tokenPayload,
            }: {
                blob: PutBlobResult;
                tokenPayload?: any;
            }) => {
                await connectDB();

                const { userId, clientPayload = { videoBlobPath: "" } } = (tokenPayload ?? {}) as {
                    userId?: string;
                    clientPayload?: {
                        videoBlobPath: string;
                        width?: number;
                        height?: number;
                        timecodeSec?: number;
                        isCover?: boolean;
                    };
                };

                if (!userId) throw new Error("Missing userId");

                const {
                    videoBlobPath,
                    width = null,
                    height = null,
                    timecodeSec = null,
                    isCover = false,
                } = clientPayload;

                // Find the target video by its unique blobPath + ownership
                const video = await Video.findOne({
                    blobPath: videoBlobPath,
                    ownerId: userId,
                }).select("_id");

                if (!video) {
                    throw new Error("Video not found or not owned by user");
                }

                // If this should be the cover, unset any existing cover first to satisfy unique index
                if (isCover) {
                    await Thumbnail.updateMany(
                        { videoId: video._id, isCover: true },
                        { $set: { isCover: false } }
                    );
                }

                // Create the thumbnail document
                try {
                    await Thumbnail.create({
                        videoId: video._id,
                        url: blob.url,
                        path: blob.pathname,           // unique
                        width,
                        height,
                        isCover,
                        timecodeSec,
                    });
                } catch (e: any) {
                    // If unique cover race happens, fall back to non-cover
                    if (isCover && /E11000/.test(String(e?.message))) {
                        await Thumbnail.create({
                            videoId: video._id,
                            url: blob.url,
                            path: blob.pathname,
                            width,
                            height,
                            isCover: false,
                            timecodeSec,
                        });
                    } else {
                        throw e;
                    }
                }
            },
        });

        return NextResponse.json(json);
    } catch (err: any) {
        console.error("thumbnail handle-upload error:", err);
        return NextResponse.json({ error: err.message ?? "Upload error" }, { status: 400 });
    }
}
