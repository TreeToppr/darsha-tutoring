export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendEmail } from "../../../../lib/email/resend";

export async function POST(req) {
    try {
        const body = await req.json();
        const { parentEmail, studentFirstName, tutorName, startTime, endTime, generatedCount } = body || {};

        if (!parentEmail) {
            return NextResponse.json({ error: "Missing parentEmail" }, { status: 400 });
        }

        const subject = `Recurring booking requested (${studentFirstName || "Student"})`;
        const timeRange = `${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}`;
        const count = Number(generatedCount || 0);

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.4">
                <h2 style="margin: 0 0 12px 0;">Recurring booking requested</h2>
                <p style="margin: 0 0 8px 0;">
                    <strong>${studentFirstName || "Student"}</strong><br/>
                    Weekly • ${timeRange}
                </p>
                ${tutorName ? `<p style="margin: 0 0 8px 0;">Tutor: <strong>${tutorName}</strong></p>` : ""}
                <p style="margin: 0 0 8px 0; color:#555;">Lessons generated: <strong>${count}</strong></p>
                <p style="margin: 16px 0 0 0; color: #555;">
                    Your tutor will review and confirm the series.
                </p>
            </div>
        `;

        await sendEmail({
            to: parentEmail,
            subject,
            html,
            text: `Recurring booking requested: ${studentFirstName || "Student"} weekly ${timeRange}${tutorName ? ` (Tutor: ${tutorName})` : ""}. Lessons generated: ${count}.`,
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
