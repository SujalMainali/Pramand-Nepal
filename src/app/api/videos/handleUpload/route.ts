// app/api/videos/handle-upload/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";
import mongoose from "mongoose";

import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
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
            // NextRequest is a Request subclass; cast keeps TS happy with the client lib
            request: req as unknown as Request,

            // Phase 1 (browser -> this route): authenticate BEFORE issuing token
            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                const user = await getCurrentUser();
                if (!user) throw new Error("Unauthorized");

                const cp = clientPayload ? JSON.parse(clientPayload) : {};

                return {
                    allowedContentTypes: ["video/mp4", "video/webm", "video/ogg"],
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({
                        userId: String((user as any)._id),
                        role: ((user as any).role as "admin" | "moderator" | "general") ?? "general",
                        clientPayload: cp,
                    }),
                };
            },

            // Phase 2 (Vercel -> this route): no cookies; rely on the tokenPayload we created above
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

                const status = role === "general" ? "hidden" : "ready";
                console.log(`New upload by user ${userId} (${role ?? "general"}), status: ${status}`);
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
}
