// app/api/videos/[id]/approve/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuthNext } from "@/utilities/withAuth";
import { connectDB } from "@/database/mongoose";
import Video from "@/database/models/video";

export const POST = withAuthNext<{ id: string }>( // 👈 generic
    async ({ params }) => {
        const id = params!.id;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        await connectDB();
        const updated = await Video.findOneAndUpdate(
            { _id: id, status: "hidden" },
            { $set: { status: "ready", updatedAt: new Date() } },
            { new: true, projection: { _id: 1, title: 1, status: 1 } }
        );

        if (!updated) {
            const exists = await Video.exists({ _id: id });
            return NextResponse.json(
                { error: exists ? "Not in 'hidden' state" : "Not found" },
                { status: exists ? 409 : 404 }
            );
        }

        return NextResponse.json({ ok: true, video: updated });
    },
    { roles: ["admin", "moderator"] }
);
