// app/api/videos/self/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/database/mongoose";
import { getCurrentUser } from "@/utilities/auth";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";

export const runtime = "nodejs";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const ownerId = new mongoose.Types.ObjectId(String((user as any)._id));

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
                        }
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
        console.error("videos/list error:", e);
        return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
    }
}
