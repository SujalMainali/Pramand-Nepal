// app/api/videos/handle-upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/Video"; // your schema file
import { getCurrentUser } from "@/lib/auth"; // from the session helper we built

export async function POST(req: Request) {
    const body = (await req.json()) as HandleUploadBody;

    try {
        const json = await handleUpload({
            body,
            request: req,

            // 1) Gate the upload before issuing a token
            onBeforeGenerateToken: async (pathname: string, clientPayload: Record<string, unknown>) => {
                // Optional: require auth
                const user = await getCurrentUser();
                if (!user) {
                    throw new Error("Unauthorized");
                }

                return {
                    allowedContentTypes: ["video/mp4", "video/webm", "video/ogg"],
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({
                        userId: user.id,
                        // Echo through whatever the client sent
                        clientPayload,
                    }),
                };
            },

            // 2) After Vercel finishes receiving the file, save metadata in MongoDB
            onUploadCompleted: async ({ blob, tokenPayload }: { blob: { url: string; downloadUrl: string; pathname: string; contentType: string; size: number; uploadedAt: string }, tokenPayload?: string }) => {
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

                await Video.create({
                    ownerId: userId,
                    title,
                    blobUrl: blob.url,
                    downloadUrl: blob.downloadUrl,
                    blobPath: blob.pathname,
                    contentType: blob.contentType,
                    sizeBytes: blob.size,
                    uploadedAt: new Date(blob.uploadedAt),
                    // If you add `address` field to schema (see below), include it:
                    // ...(address ? { address } : {}),
                    // durationSec/width/height can be filled later by a processor
                    status: "ready",
                });
            },
        });

        return NextResponse.json(json);
    } catch (err: any) {
        console.error("handle-upload error:", err);
        return NextResponse.json({ error: err.message ?? "Upload error" }, { status: 400 });
    }
}
