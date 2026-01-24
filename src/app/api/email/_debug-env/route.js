import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    return NextResponse.json({
        has_RESEND_API_KEY: !!process.env.RESEND_API_KEY,
        has_RESEND_FROM: !!process.env.RESEND_FROM,
        node_env: process.env.NODE_ENV,
    });
}
