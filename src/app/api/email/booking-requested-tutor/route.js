import { NextResponse } from "next/server";
// import { sendEmail } from "@/lib/email/resend";
import { sendEmail } from "../../../../lib/email/resend";

export async function POST(req) {
    try {
        const body = await req.json();
        const { tutorEmail, studentFirstName, sessionDate, startTime, endTime, parentEmail } = body || {};

        if (!tutorEmail) {
            return NextResponse.json({ error: "Missing tutorEmail" }, { status: 400 });
        }

        const subject = `New booking request (${studentFirstName || "Student"})`;
        const timeRange = `${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}`;

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.4">
                <h2 style="margin: 0 0 12px 0;">New booking request</h2>
                <p style="margin: 0 0 8px 0;">
                    <strong>${studentFirstName || "Student"}</strong><br/>
                    ${sessionDate} • ${timeRange}
                </p>
                ${parentEmail ? `<p style="margin: 0 0 8px 0; color:#555;">Parent: ${parentEmail}</p>` : ""}
                <p style="margin: 16px 0 0 0; color: #555;">
                    Please review this booking in DarshaTutor.
                </p>
            </div>
        `;

        await sendEmail({
            to: tutorEmail,
            subject,
            html,
            text: `New booking request: ${studentFirstName || "Student"} on ${sessionDate} ${timeRange}${parentEmail ? ` (Parent: ${parentEmail})` : ""}`,
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
