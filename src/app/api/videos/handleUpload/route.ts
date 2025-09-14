// app/api/videos/handle-upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
import { getCurrentUser } from "@/utilities/auth";
import type { PutBlobResult } from "@vercel/blob";
import { generateAndSaveThumbnail } from "@/utilities/thumbnail";

export async function POST(req: Request) {
    const body = (await req.json()) as HandleUploadBody;

    try {
        const json = await handleUpload({
            body,
            request: req,

            // 1) Authenticate/authorize BEFORE issuing a token
            onBeforeGenerateToken: async (pathname, clientPayload /*, multipart */) => {
                const user = await getCurrentUser();
                if (!user) throw new Error("Unauthorized");

                // clientPayload is a JSON string from your client (or null)
                const cp = clientPayload ? JSON.parse(clientPayload) : {};

                return {
                    allowedContentTypes: ["video/mp4", "video/webm", "video/ogg"],
                    addRandomSuffix: true, // avoid overwrites & caching issues :contentReference[oaicite:3]{index=3}
                    tokenPayload: JSON.stringify({
                        userId: String(user._id),
                        clientPayload: cp, // store as object; no need to JSON.stringify again
                    }),
                    // Optionally: cacheControlMaxAge: 60,
                };
            },

            // 2) Persist metadata AFTER Vercel finishes receiving the file
            onUploadCompleted: async ({ blob, tokenPayload }: { blob: PutBlobResult; tokenPayload?: string | null }) => {
                await connectDB();

                const parsed = tokenPayload ? JSON.parse(tokenPayload) : {};
                const { userId, clientPayload = {} } = parsed as {
                    userId?: string;
                    clientPayload?: { title?: string; address?: string };
                };

                if (!userId) throw new Error("Missing userId in token payload");

                const video = await Video.create({
                    ownerId: userId,
                    title: clientPayload.title ?? "",
                    address: clientPayload.address, // ensure your schema has this field
                    blobUrl: blob.url,
                    downloadUrl: blob.downloadUrl, // forces download if you ever need it
                    blobPath: blob.pathname,
                    contentType: blob.contentType,
                    sizeBytes: null, // ✅ correct field
                    uploadedAt: new Date(),
                    status: "ready",
                });

                if (!video) {
                    throw new Error("Failed to create video record in the database");
                }


                // Consider offloading thumbnails to a background job/queue to avoid request timeouts.
                await generateAndSaveThumbnail(video.id, blob.downloadUrl, {
                    timecodeSec: 5,
                    maxWidth: 640,
                    isCover: true,
                    nameHint: "cover",
                });
            },
        });

        return NextResponse.json(json);
    } catch (err: any) {
        console.error("handle-upload error:", err);
        return NextResponse.json({ error: err.message ?? "Upload error" }, { status: 400 });
    }
}
