// utilities/withAuthNext.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/utilities/auth";

type Role = "admin" | "moderator" | "general";

type WithAuthNextOptions = { roles?: Role[] };

type Handler = (ctx: {
    req: NextRequest | Request;                  // works with both
    params?: Record<string, string>;
    user: any;
}) => Promise<Response> | Response;

export function withAuthNext(handler: Handler, opts?: WithAuthNextOptions) {
    return async (req: NextRequest | Request, ctx?: { params?: Record<string, string> }) => {
        // 1) Auth
        const user = await getCurrentUser().catch(() => null);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2) Role check (optional)
        const role = (user.role as Role) ?? "general";
        if (opts?.roles && !opts.roles.includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3) Call your handler with user injected
        return handler({ req, params: ctx?.params, user });
    };
}
