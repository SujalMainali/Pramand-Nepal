// app/api/auth/google/start/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, codeChallengeFromVerifier, generateState } from "@/utilities/oauth"

export async function GET(req: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = codeChallengeFromVerifier(codeVerifier);

    // Store state + code_verifier in short-lived, httpOnly cookies
    const res = NextResponse.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent("openid email profile")}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256` +
        `&state=${encodeURIComponent(state)}` +
        `&prompt=consent` +                // ensures refresh token first time
        `&access_type=offline`
    );

    const cookieOpts: Parameters<typeof res.cookies.set>[2] = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60, // 10 minutes
    };

    res.cookies.set("oauth_state", state, cookieOpts);
    res.cookies.set("oauth_verifier", codeVerifier, cookieOpts);

    return res;
}
