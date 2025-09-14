// app/api/thumbnails/handle-upload/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import { withAuthNext } from "@/utilities/withAuth";

import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";

export const POST = withAuthNext(async ({ req, user }) => {
    const body = (await req.json()) as HandleUploadBody;

    try {
        const json = await handleUpload({
            body,
            // NextRequest is compatible with Request; cast for TS
            request: req as Request,

            // 1) Issue token for Blob upload (user is already authenticated by wrapper)
            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                // clientPayload came from your client upload() call
                const cp = clientPayload ? JSON.parse(clientPayload) : {};

                return {
                    allowedContentTypes: ["image/jpeg", "image/webp", "image/png"],
                    addRandomSuffix: false,
                    maximumSizeInBytes: 2_000_000,
                    // Carry the userId + client payload forward so we can trust it after upload
                    tokenPayload: JSON.stringify({
                        userId: String(user._id),
                        clientPayload: cp,
                    }),
                };
            },

            // 2) After Blob stores the file, persist thumbnail in Mongo
            onUploadCompleted: async ({ blob, tokenPayload }: { blob: PutBlobResult; tokenPayload?: any }) => {
                await connectDB();

                const parsed: unknown =
                    tokenPayload == null
                        ? {}
                        : typeof tokenPayload === "string"
                            ? JSON.parse(tokenPayload)
                            : tokenPayload;

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

                const { videoBlobPath, width, height, timecodeSec, isCover } = clientPayload;

                // Ensure the uploader owns the target video
                const video = await Video.findOne({
                    blobPath: videoBlobPath,
                    ownerId: userId,
                }).select("_id");

                if (!video) {
                    throw new Error("Video not found or not owned by user");
                }

                // If this should be cover, unset existing cover first (unique partial index)
                if (isCover) {
                    await Thumbnail.updateMany(
                        { videoId: video._id, isCover: true },
                        { $set: { isCover: false } }
                    );
                }

                // Create thumbnail doc (handle race on unique index gracefully)
                try {
                    await Thumbnail.create({
                        videoId: video._id,
                        url: blob.url,
                        path: blob.pathname,
                        width,
                        height,
                        isCover,
                        timecodeSec,
                    });
                } catch (e: any) {
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
        return NextResponse.json({ error: err?.message ?? "Upload error" }, { status: 400 });
    }
});
