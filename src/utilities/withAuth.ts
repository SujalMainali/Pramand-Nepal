// utilities/withAuthNext.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/utilities/auth";

type Role = "admin" | "moderator" | "general";
type WithAuthNextOptions = { roles?: Role[] };
type ParamsShape = Record<string, string>;

type Handler<P extends ParamsShape> = (ctx: {
    req: NextRequest;
    params?: P;    // resolved params (not a Promise)
    user: any;
}) => Promise<Response> | Response;

export function withAuthNext<P extends ParamsShape = Record<string, never>>(
    handler: Handler<P>,
    opts?: WithAuthNextOptions
) {
    // IMPORTANT: match Next's route handler signature exactly:
    return async (
        req: NextRequest,
        context: { params: P | Promise<P> }   // your project types params as Promise<...>
    ): Promise<Response> => {
        // 1) Auth
        const user = await getCurrentUser().catch(() => null);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2) Role check
        const role: Role = (user.role as Role) ?? "general";
        if (opts?.roles && !opts.roles.includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3) Resolve params if your type system provides a Promise
        const p = context?.params as P | Promise<P>;
        const resolvedParams =
            p && typeof (p as any)?.then === "function" ? await (p as Promise<P>) : (p as P | undefined);

        // 4) Call your handler
        return handler({ req, params: resolvedParams, user });
    };
}
