// app/api/videos/self/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuthNext } from "@/utilities/withAuth";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
import "@/database/models/Thumbnail"; // ensure model is registered for $lookup

export const GET = withAuthNext(async ({ user }) => {
    try {
        await connectDB();
        const ownerId = new mongoose.Types.ObjectId(String(user._id));

        const items = await Video.aggregate([
            { $match: { ownerId } },
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
            {
                $project: {
                    _id: 1,
                    title: 1,
                    blobUrl: 1,
                    downloadUrl: 1,
                    createdAt: 1,
                    "thumbnail.url": 1,
                },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 60 },
        ]);

        return NextResponse.json({ items });
    } catch (e: any) {
        console.error("videos/self error:", e);
        return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
    }
});
