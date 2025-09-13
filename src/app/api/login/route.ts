// app/api/login/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/database/mongoose";
import User from "@/database/models/User";
import { createSession } from "@/utilities/auth";


type ReqBody = {
    email?: string;
    password?: string;
};

export async function POST(req: Request) {
    try {
        await connectDB();

        const { email, password } = (await req.json()) as ReqBody;

        // --- Validate input ---
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required." },
                { status: 400 }
            );
        }

        // --- Find user ---
        const user = await User.findOne({ email }).exec();
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Invalid email or password." },
                { status: 401 }
            );
        }

        // --- Compare password ---
        const isValid = await bcrypt.compare(password, user.hashedPassword as string);
        if (!isValid) {
            return NextResponse.json(
                { success: false, error: "Invalid email or password." },
                { status: 401 }
            );
        }

        // --- Create session + cookie ---
        await createSession(user.id);

        // --- Return safe user data (your schema toJSON already strips hash) ---
        return NextResponse.json(
            {
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("❌ Login error:", err);
        return NextResponse.json(
            { success: false, error: "Internal server error." },
            { status: 500 }
        );
    }
}
