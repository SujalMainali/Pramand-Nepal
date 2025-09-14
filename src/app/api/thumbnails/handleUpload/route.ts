// app/api/thumbnails/handle-upload/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";

import { connectDB } from "@/database/mongoose";
import { getCurrentUser } from "@/utilities/auth";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";

export async function POST(req: NextRequest) {
    const body = (await req.json()) as HandleUploadBody;

    try {
        const json = await handleUpload({
            body,
            request: req,

            // 1) Auth + token config
            // app/api/thumbnails/handle-upload/route.ts

            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                const user = await getCurrentUser();
                if (!user) throw new Error("Unauthorized");

                const cp = clientPayload ? JSON.parse(clientPayload) : {};

                return {
                    allowedContentTypes: ["image/jpeg", "image/webp", "image/png"],
                    addRandomSuffix: false,
                    maximumSizeInBytes: 2_000_000,
                    // ✅ Stringify explicitly
                    tokenPayload: JSON.stringify({
                        userId: String(user._id),
                        clientPayload: cp,
                    }),
                };
            },


            // 2) After Blob has stored the file, persist in Mongo
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                await connectDB();

                // ✅ Parse robustly
                const parsed: unknown =
                    tokenPayload == null
                        ? {}
                        : typeof tokenPayload === "string"
                            ? JSON.parse(tokenPayload)
                            : tokenPayload;

                // Type helpers
                type ThumbPayload = {
                    videoBlobPath: string;
                    width?: number;
                    height?: number;
                    timecodeSec?: number;
                    isCover?: boolean;
                };

                const { userId, clientPayload } = (parsed as {
                    userId?: string;
                    clientPayload?: ThumbPayload;
                });

                if (!userId) throw new Error("Missing userId");
                if (!clientPayload?.videoBlobPath) throw new Error("Missing videoBlobPath");

                // Now safely destructure (no default = {})
                const {
                    videoBlobPath,
                    width,
                    height,
                    timecodeSec,
                    isCover,
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
