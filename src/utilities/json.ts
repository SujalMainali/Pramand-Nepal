// utilities/http.ts
import { NextResponse } from "next/server";

export function jsonOK(data: any, init?: number | ResponseInit) {
    const responseInit = typeof init === "number" ? { status: init } : init;
    return NextResponse.json(data, responseInit);
}
export function jsonError(status: number, message: string, extra?: any) {
    return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}
