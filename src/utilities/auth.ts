// lib/auth.ts
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { connectDB } from "@/database/mongoose";
import Session from "@/database/models/Session";
import User from "@/database/models/User";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session_token";
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? "30"); // default 30 days

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

/** Create a new session for a user and set an HTTP-only cookie */
export async function createSession(userId: string) {
    await connectDB();

    const token = crypto.randomBytes(32).toString("hex"); // random token
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const h = await headers();
    const userAgent = h.get("user-agent") ?? undefined;
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    await Session.create({ userId, tokenHash, expiresAt, userAgent, ip });

    (await cookies()).set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
    });
}

/** Retrieve the currently logged-in user from the session cookie */
export async function getCurrentUser() {
    await connectDB();

    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;

    const tokenHash = sha256(token);
    const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } }).lean() as { userId: string } | null;
    if (!session) return null;

    const user = await User.findById(session.userId)
        .select({ name: 1, email: 1, createdAt: 1, role: 1 })
        .lean({ virtuals: true });

    return user ?? null;
}

/** Delete the current session (logout) */
export async function deleteSession() {
    await connectDB();

    const cookie = (await cookies()).get(COOKIE_NAME);
    if (cookie?.value) {
        const tokenHash = sha256(cookie.value);
        await Session.deleteOne({ tokenHash });
    }

    (await cookies()).set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
}
