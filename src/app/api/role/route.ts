// app/api/users/me/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utilities/auth";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // role should be in your User model; default to "general" if missing
    return NextResponse.json({
        user: {
            id: String((user as any)._id),
            name: (user as any).name,
            email: (user as any).email,
            role: (user as any).role ?? "general",
        },
    });
}
