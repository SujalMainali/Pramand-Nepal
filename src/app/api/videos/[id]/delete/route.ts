// app/api/videos/[id]/delete/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuthNext } from "@/utilities/withAuth";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";
import { del } from "@vercel/blob";

export const DELETE = withAuthNext<{ id: string }>(async ({ params, user }) => {
    const id = params?.id;
    if (!id && !mongoose.isValidObjectId(id)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    // Fetch the video with minimal fields we need for auth + cleanup
    const video = await Video.findById(id)
        .select("_id ownerId blobPath")
        .lean();

    if (!video) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const role = (user.role as "admin" | "moderator" | "general") ?? "general";
    const isStaff = role === "admin" || role === "moderator";
    const isOwner = String(video.ownerId) === String(user._id);

    if (!isOwner && !isStaff) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Collect thumbnail paths for blob cleanup
    const thumbs = await Thumbnail.find({ videoId: video._id })
        .select("_id path")
        .lean();

    const blobPaths = [
        video.blobPath,
        ...thumbs.map((t) => t.path).filter(Boolean),
    ].filter(Boolean);

    // Try to delete from Blob first (best-effort)
    let blobDeleteError: string | null = null;
    try {
        if (blobPaths.length) {
            await del(blobPaths);
        }
    } catch (e: any) {
        // Don't block DB deletion if Blob deletion fails
        blobDeleteError = e?.message || "Blob delete failed";
        console.warn("[videos.delete] Blob deletion error:", e);
    }

    // Delete DB records (thumbnails first due to references/UX)
    await Thumbnail.deleteMany({ videoId: video._id });
    await Video.deleteOne({ _id: video._id });

    return NextResponse.json({ ok: true });
}, { roles: ["admin", "moderator", "general"] }); // everyone can hit; auth wrapper still enforces login
