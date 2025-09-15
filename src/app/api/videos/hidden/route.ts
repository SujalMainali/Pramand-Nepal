// app/api/moderation/videos/hidden/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuthNext } from "@/utilities/withAuth";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";

export const GET = withAuthNext(
    async ({ req }) => {
        try {
            await connectDB();

            // --- Pagination / filters ---
            const url = new URL(req.url as string);
            const limit = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 100);
            const afterId = url.searchParams.get("afterId"); // cursor-based pagination (_id)
            const q = (url.searchParams.get("q") || "").trim();

            const match: any = { status: "hidden" };
            if (afterId) match._id = { $lt: new mongoose.Types.ObjectId(afterId) };
            if (q) match.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

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
    },
    { roles: ["admin", "moderator"] } // ✅ only staff can access
);
