import { NextResponse } from "next/server";
// import { sendEmail } from "@/lib/email/resend";
import { sendEmail } from "../../../../lib/email/resend";

export async function POST(req) {
    try {
        const body = await req.json();
        const { parentEmail, studentFirstName, sessionDate, startTime, endTime } = body || {};

        if (!parentEmail) {
            return NextResponse.json({ error: "Missing parentEmail" }, { status: 400 });
        }

        const subject = `Lesson cancelled (${studentFirstName || "Student"})`;
        const timeRange = `${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}`;

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.4">
                <h2 style="margin: 0 0 12px 0;">Lesson cancelled</h2>
                <p style="margin: 0 0 8px 0;">
                    <strong>${studentFirstName || "Student"}</strong><br/>
                    ${sessionDate} • ${timeRange}
                </p>
                <p style="margin: 16px 0 0 0; color: #555;">
                    If this was a mistake, you can re-book in DarshaTutor.
                </p>
            </div>
        `;

        await sendEmail({
            to: parentEmail,
            subject,
            html,
            text: `Lesson cancelled: ${studentFirstName || "Student"} on ${sessionDate} ${timeRange}`,
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
