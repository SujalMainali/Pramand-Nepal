// lib/oauth.ts
import { randomBytes, createHash } from "crypto";

export function base64url(input: Buffer | string) {
    const b64 = (typeof input === "string" ? Buffer.from(input) : input).toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generateCodeVerifier() {
    return base64url(randomBytes(32)); // 43-128 chars URL-safe
}

export function codeChallengeFromVerifier(verifier: string) {
    const hash = createHash("sha256").update(verifier).digest();
    return base64url(hash);
}

export function generateState() {
    return base64url(randomBytes(16));
}
