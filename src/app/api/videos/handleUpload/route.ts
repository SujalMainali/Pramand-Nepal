// app/api/videos/handle-upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import mongoose from "mongoose";

import { withAuthNext } from "@/utilities/withAuth";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";

export const POST = withAuthNext(async ({ req, user }) => {
    const body = (await req.json()) as HandleUploadBody;

    try {
        const json = await handleUpload({
            body,
            // NextRequest is compatible with Request; cast for TS
            request: req as Request,

            // 1) Issue a short-lived token to upload to Vercel Blob
            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                // Optional: connectDB() here if you enforce quotas/limits by role
                const cp = clientPayload ? JSON.parse(clientPayload) : {};

                return {
                    allowedContentTypes: ["video/mp4", "video/webm", "video/ogg"],
                    addRandomSuffix: true,
                    // Carry identity + client payload forward; read back in onUploadCompleted
                    tokenPayload: JSON.stringify({
                        userId: String(user._id),
                        role: (user.role as "admin" | "moderator" | "general") ?? "general",
                        clientPayload: cp,
                    }),
                };
            },

            // 2) After Blob stores the file, persist a Video doc
            onUploadCompleted: async ({ blob, tokenPayload }: { blob: PutBlobResult; tokenPayload?: any }) => {
                await connectDB();

                const parsed =
                    tokenPayload == null
                        ? {}
                        : typeof tokenPayload === "string"
                            ? JSON.parse(tokenPayload)
                            : tokenPayload;

                const { userId, role, clientPayload } = (parsed as {
                    userId?: string;
                    role?: "admin" | "moderator" | "general";
                    clientPayload?: {
                        title?: string;
                        address?: string;
                        durationSec?: number;
                        width?: number;
                        height?: number;
                    };
                });

                if (!userId) throw new Error("Missing userId");

                // Visibility rule: general → hidden; staff → ready
                const status = role === "general" ? "hidden" : "ready";

                await Video.create({
                    ownerId: new mongoose.Types.ObjectId(userId),
                    title: (clientPayload?.title ?? "").toString().trim().slice(0, 200),
                    address: (clientPayload?.address ?? "").toString().trim().slice(0, 200),
                    blobUrl: blob.url,
                    downloadUrl: `${blob.url}?download=1`,
                    blobPath: blob.pathname,
                    contentType: blob.contentType,
                    sizeBytes: (blob as any).size ?? null,
                    durationSec: clientPayload?.durationSec ?? null,
                    width: clientPayload?.width ?? null,
                    height: clientPayload?.height ?? null,
                    status,
                    uploadedAt: new Date(),
                });
            },
        });

        return NextResponse.json(json);
    } catch (err: any) {
        console.error("handle-upload error:", err);
        return NextResponse.json({ error: err?.message ?? "Upload error" }, { status: 400 });
    }
});
