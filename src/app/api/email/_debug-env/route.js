import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({
        ok: true,
        has_RESEND_API_KEY: !!process.env.RESEND_API_KEY,
        has_RESEND_FROM: !!process.env.RESEND_FROM,
        RESEND_FROM_value: process.env.RESEND_FROM || null,
    });
}
