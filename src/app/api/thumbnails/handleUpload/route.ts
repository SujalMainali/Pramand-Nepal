// app/api/thumbnails/handle-upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
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
            request: req as Request, // NextRequest -> Request for the blob SDK

            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                const cp = clientPayload ? JSON.parse(clientPayload) : {};
                return {
                    allowedContentTypes: ["image/jpeg", "image/webp", "image/png"],
                    addRandomSuffix: false,
                    maximumSizeInBytes: 2_000_000,
                    tokenPayload: JSON.stringify({
                        userId: String(user._id),
                        clientPayload: cp,
                    }),
                };
            },

            onUploadCompleted: async ({ blob, tokenPayload }: { blob: PutBlobResult; tokenPayload?: any }) => {
                await connectDB();

                const parsed =
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

                const video = await Video.findOne({ blobPath: videoBlobPath, ownerId: userId }).select("_id");
                if (!video) throw new Error("Video not found or not owned by user");

                if (isCover) {
                    await Thumbnail.updateMany({ videoId: video._id, isCover: true }, { $set: { isCover: false } });
                }

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
