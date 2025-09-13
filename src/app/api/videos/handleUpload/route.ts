// app/api/videos/handle-upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video"; // your schema file
import { getCurrentUser } from "@/utilities/auth"; // from the session helper we built
import { PutBlobResult } from "@vercel/blob";
import { generateAndSaveThumbnail } from "@/utilities/thumbnail";

export async function POST(req: Request) {
    const body = (await req.json()) as HandleUploadBody;

    try {
        const json = await handleUpload({
            body,
            request: req,

            // 1) Gate the upload before issuing a token
            onBeforeGenerateToken: async (pathname: string, clientPayload: string | null, multipart: boolean) => {
                const parsedClientPayload = clientPayload ? JSON.parse(clientPayload) : {};
                // Optional: require auth
                const user = await getCurrentUser();
                if (!user) {
                    throw new Error("Unauthorized");
                }

                return {
                    allowedContentTypes: ["video/mp4", "video/webm", "video/ogg"],
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({
                        userId: user._id,
                        clientPayload: parsedClientPayload,
                    }),
                };
            },

            // 2) After Vercel finishes receiving the file, save metadata in MongoDB
            onUploadCompleted: async ({ blob, tokenPayload }: { blob: PutBlobResult; tokenPayload?: string | null }) => {
                await connectDB();

                // tokenPayload contains userId and clientPayload (stringified JSON)
                let userId: string | undefined;
                let title = "";
                let address: string | undefined;

                if (tokenPayload) {
                    const parsed = JSON.parse(tokenPayload);
                    userId = parsed?.userId;
                    const cp = parsed?.clientPayload ? JSON.parse(parsed.clientPayload) : {};
                    title = (cp?.title ?? "").toString();
                    address = cp?.address ? cp.address.toString() : undefined;
                }

                if (!userId) throw new Error("Missing userId in token payload");

                const video = await Video.create({
                    ownerId: userId,
                    title,
                    blobUrl: blob.url,
                    downloadUrl: blob.downloadUrl,
                    blobPath: blob.pathname,
                    contentType: blob.contentType,
                    // sizeBytes: blob.fileSize, // Assuming 'fileSize' is the correct property
                    uploadedAt: new Date(), // Replace with the correct property or use the current date
                    // If you add `address` field to schema (see below), include it:
                    // ...(address ? { address } : {}),
                    // durationSec/width/height can be filled later by a processor
                    status: "ready",
                });

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
