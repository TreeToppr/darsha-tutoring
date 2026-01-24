import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    return NextResponse.json({
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasResendFrom: !!process.env.RESEND_FROM,
        nodeEnv: process.env.NODE_ENV,
    });
}
