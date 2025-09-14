// app/api/thumbnails/handle-upload/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";

import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";
import { getCurrentUser } from "@/utilities/auth";

export async function POST(req: NextRequest) {
    let body: HandleUploadBody;
    try {
        body = (await req.json()) as HandleUploadBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    try {
        const json = await handleUpload({
            body,
            // NextRequest extends Request; cast keeps TS happy with the client lib
            request: req as unknown as Request,

            // Phase 1: browser → this route (has cookies) → authenticate here
            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                const user = await getCurrentUser();
                if (!user) throw new Error("Unauthorized");

                const cp = clientPayload ? JSON.parse(clientPayload) : {};

                return {
                    allowedContentTypes: ["image/jpeg", "image/webp", "image/png"],
                    addRandomSuffix: false,
                    maximumSizeInBytes: 2_000_000,
                    tokenPayload: JSON.stringify({
                        userId: String((user as any)._id),
                        clientPayload: cp, // { videoBlobPath, width, height, timecodeSec, isCover }
                    }),
                };
            },

            // Phase 2: Vercel → this route (no cookies) → rely on the tokenPayload we issued above
            onUploadCompleted: async ({
                blob,
                tokenPayload,
            }: {
                blob: PutBlobResult;
                tokenPayload?: string | Record<string, unknown> | null;
            }) => {
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

                const { userId, clientPayload } = parsed as {
                    userId?: string;
                    clientPayload?: ThumbPayload;
                };

                if (!userId) throw new Error("Missing userId");
                if (!clientPayload?.videoBlobPath) throw new Error("Missing videoBlobPath");

                const { videoBlobPath, width, height, timecodeSec, isCover } = clientPayload;

                // Ensure the uploader owns the target video
                const video = await Video.findOne({ blobPath: videoBlobPath, ownerId: userId }).select("_id");
                if (!video) throw new Error("Video not found or not owned by user");

                // If this should be the cover, unset any existing cover first (unique partial index)
                if (isCover) {
                    await Thumbnail.updateMany({ videoId: video._id, isCover: true }, { $set: { isCover: false } });
                }

                // Create the thumbnail (handle race on unique cover)
                try {
                    await Thumbnail.create({
                        videoId: video._id,
                        url: blob.url,
                        path: blob.pathname, // unique
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
}
