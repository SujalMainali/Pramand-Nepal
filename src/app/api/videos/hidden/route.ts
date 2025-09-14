// app/api/moderation/videos/hidden/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/database/mongoose";
import { getCurrentUser } from "@/utilities/auth";
import mongoose from "mongoose";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";

// OPTIONAL: if you have a User model file path, you don't need to import it for $lookup;
// we'll join via collection name "users" in the pipeline.

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Restrict to admin/moderator
        const role = (user as any).role ?? "general";
        if (!["admin", "moderator"].includes(role))
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await connectDB();

        // --- Pagination / filters ---
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
        const afterId = searchParams.get("afterId"); // cursor-based pagination (_id)
        const q = (searchParams.get("q") || "").trim();

        const match: any = { status: "hidden" };
        if (afterId) {
            match._id = { $lt: new mongoose.Types.ObjectId(afterId) };
        }
        if (q) {
            match.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        }

        const items = await Video.aggregate([
            { $match: match },
            { $sort: { _id: -1 } },
            { $limit: limit },

            // Join thumbnails
            {
                $lookup: {
                    from: "thumbnails",
                    localField: "_id",
                    foreignField: "videoId",
                    as: "thumbnails",
                },
            },
            {
                $addFields: {
                    coverThumb: {
                        $first: {
                            $filter: { input: "$thumbnails", as: "t", cond: { $eq: ["$$t.isCover", true] } },
                        },
                    },
                    anyThumb: { $first: "$thumbnails" },
                },
            },
            { $addFields: { thumbnail: { $ifNull: ["$coverThumb", "$anyThumb"] } } },

            // Join owner (basic info for moderation)
            {
                $lookup: {
                    from: "users",
                    localField: "ownerId",
                    foreignField: "_id",
                    as: "owner",
                },
            },
            { $addFields: { owner: { $first: "$owner" } } },

            // Shape response
            {
                $project: {
                    _id: 1,
                    title: 1,
                    address: 1,
                    blobUrl: 1,
                    downloadUrl: 1,
                    blobPath: 1,
                    contentType: 1,
                    sizeBytes: 1,
                    durationSec: 1,
                    width: 1,
                    height: 1,
                    status: 1,
                    createdAt: 1,

                    "thumbnail.url": 1,
                    "thumbnail.width": 1,
                    "thumbnail.height": 1,
                    "thumbnail.timecodeSec": 1,

                    "owner._id": 1,
                    "owner.name": 1,
                    "owner.email": 1,
                    "owner.role": 1,
                },
            },
        ]);

        const nextCursor = items.length ? String(items[items.length - 1]._id) : null;

        return NextResponse.json({ items, nextCursor });
    } catch (e: any) {
        console.error("moderation/hidden error:", e);
        return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
    }
}
