// app/api/auth/google/callback/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/database/mongoose";
import User from "@/database/models/User";
import { createSession } from "@/utilities/auth";

type GoogleTokenResp = {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    id_token: string;
    token_type: "Bearer";
};

type GoogleUserInfo = {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
};

export async function GET(req: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookieState = req.cookies.get("oauth_state")?.value || "";
    const codeVerifier = req.cookies.get("oauth_verifier")?.value || "";

    if (!code || !state || !cookieState || !codeVerifier || state !== cookieState) {
        return NextResponse.redirect(`${req.nextUrl.origin}/login?oauth=error`);
    }

    // Exchange code -> tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            code_verifier: codeVerifier,
        }),
    });

    if (!tokenRes.ok) {
        console.error("Google token exchange failed", await tokenRes.text());
        return NextResponse.redirect(`${req.nextUrl.origin}/login?oauth=token_error`);
    }

    const tokenJson = (await tokenRes.json()) as GoogleTokenResp;

    // Fetch userinfo
    const userinfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        cache: "no-store",
    });

    if (!userinfoRes.ok) {
        console.error("Google userinfo failed", await userinfoRes.text());
        return NextResponse.redirect(`${req.nextUrl.origin}/login?oauth=userinfo_error`);
    }

    const profile = (await userinfoRes.json()) as GoogleUserInfo;

    const email = (profile.email || "").toLowerCase();
    if (!email || profile.email_verified === false) {
        return NextResponse.redirect(`${req.nextUrl.origin}/login?oauth=email_unverified`);
    }

    // Upsert user in your DB
    await connectDB();

    // Try to find existing user by email
    let user = await User.findOne({ email }).exec();

    if (!user) {
        // Create a placeholder hash to satisfy schema constraint
        const placeholderHash = await bcrypt.hash(`oauth:${profile.sub}:${Date.now()}`, 10);

        user = await User.create({
            name: profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim() || email,
            email,
            hashedPassword: placeholderHash,
            role: "general",
            // optionally store provider ids/picture fields in your schema if you add them
            // googleId: profile.sub,
            // picture: profile.picture,
            // authProvider: "google",
        });
    } else {
        // Optionally update name/picture on login
        const nextName =
            profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim() || user.name;
        if (nextName !== user.name) {
            user.name = nextName;
            await user.save();
        }
    }

    // Create your app's session (sets cookie)
    await createSession(user.id);

    // Clear the temp cookies
    const res = NextResponse.redirect(`${req.nextUrl.origin}/`);
    res.cookies.set("oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("oauth_verifier", "", { path: "/", maxAge: 0 });
    return res;
}
