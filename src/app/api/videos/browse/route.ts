// app/api/videos/browse/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
import Thumbnail from "@/database/models/Thumbnail";

export const runtime = "nodejs";

export async function GET() {
    try {
        await connectDB();

        const items = await Video.aggregate([
            { $match: { status: "ready" } }, // ← enforce visibility here
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
            { $limit: 100 },
        ]);

        return NextResponse.json({ items });
    } catch (e: any) {
        console.error("videos/browse error:", e);
        return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
    }
}
