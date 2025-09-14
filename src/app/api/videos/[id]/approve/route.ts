// app/api/videos/[id]/approve/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/database/mongoose";
import { getCurrentUser } from "@/utilities/auth";
import Video from "@/database/models/video";
import mongoose from "mongoose";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const role = (user as any).role ?? "general";
        if (!["admin", "moderator"].includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        await connectDB();

        // Only approve items that are currently hidden
        const updated = await Video.findOneAndUpdate(
            { _id: id, status: "hidden" },
            { $set: { status: "ready", updatedAt: new Date() } },
            { new: true, projection: { _id: 1, title: 1, status: 1 } }
        );

        if (!updated) {
            // Either not found or not in hidden state
            const exists = await Video.exists({ _id: id });
            return NextResponse.json(
                { error: exists ? "Not in 'hidden' state" : "Not found" },
                { status: exists ? 409 : 404 }
            );
        }

        return NextResponse.json({ ok: true, video: updated });
    } catch (e: any) {
        console.error("approve error:", e);
        return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
    }
}
