// app/api/saveData/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/database/mongoose";
import User from "@/database/models/User";
import isEmail from "validator/lib/isEmail";

type ReqBody = {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
};

function badRequest(message: string, code = 400) {
    return NextResponse.json({ success: false, error: message }, { status: code });
}

export async function POST(req: Request) {
    try {
        await connectDB();

        const body = (await req.json()) as ReqBody;

        const firstName = body.firstName?.trim() ?? "";
        const lastName = body.lastName?.trim() ?? "";
        const email = body.email?.trim().toLowerCase() ?? "";
        const password = body.password ?? "";
        const confirmPassword = body.confirmPassword ?? "";

        // Basic validation
        if (!firstName || !lastName) return badRequest("First and last name are required.");
        if (!email) return badRequest("Email is required.");
        if (!isEmail(email)) return badRequest("Invalid email address.");   // ✅ using validator
        if (!password || !confirmPassword) return badRequest("Password and confirm password are required.");
        if (password !== confirmPassword) return badRequest("Passwords do not match.");
        if (password.length < 8) return badRequest("Password must be at least 8 characters.");

        // Duplicate email check
        const exists = await User.findOne({ email }).select({ _id: 1 }).lean().exec();
        if (exists) return badRequest("An account with this email already exists.", 409);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const name = `${firstName} ${lastName}`.trim();

        // Create user
        const created = await User.create({ name, email, hashedPassword });

        const user = created.toJSON();

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            },
            { status: 201 }
        );
    } catch (err: any) {
        if (err?.code === 11000 && err?.keyPattern?.email) {
            return badRequest("Email is already registered.", 409);
        }
        console.error("Registration error:", err);
        return badRequest("Internal server error.", 500);
    }
}



