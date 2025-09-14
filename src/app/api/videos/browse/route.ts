// app/api/videos/browse/route.ts
export const runtime = "nodejs";            // using mongoose
export const dynamic = "force-dynamic";     // not statically prerendered

import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";
import "@/database/models/Thumbnail"; // registers collection for $lookup
import crypto from "node:crypto";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        // NOTE: keep this response the same for the same URL (no user cookies)
        const items = await Video.aggregate([
            { $match: { status: "ready", isHidden: { $ne: true }, isPublic: { $ne: false } } },
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
                    createdAt: 1,
                    blobUrl: 1,          // <-- include
                    downloadUrl: 1,
                    // expose only harmless, public metadata; keep actual media behind another route
                    "thumbnail.url": 1,
                },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 100 },
        ]);

        // Optional: strong ETag so browsers can 304 when they bypass CDN
        const body = JSON.stringify({ items });
        const etag = `W/"${crypto.createHash("sha1").update(body).digest("base64")}"`;
        const ifNoneMatch = req.headers.get("if-none-match");
        if (ifNoneMatch && ifNoneMatch === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: {
                    ETag: etag,
                    // Keep CDN cache policy visible even on 304
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                    "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                },
            });
        }

        const res = new NextResponse(body, {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                // CDN will serve same response to many users:
                //  - cache for 60s
                //  - keep serving stale for 5 minutes while revalidating in background
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                // Optional: explicit CDN directive (Vercel respects this too)
                "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                ETag: etag,
                // Avoid accidental user-specific variance
                Vary: "Accept", // (don’t include Cookie)
            },
        });

        return res;
    } catch (e: any) {
        console.error("videos/browse error:", e);
        return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
    }
}
