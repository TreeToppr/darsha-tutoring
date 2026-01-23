import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";

export async function POST(req) {
    try {
        const body = await req.json();
        const { tutorEmail, studentFirstName, startTime, endTime, generatedCount, parentEmail } = body || {};

        if (!tutorEmail) {
            return NextResponse.json({ error: "Missing tutorEmail" }, { status: 400 });
        }

        const subject = `New recurring booking request (${studentFirstName || "Student"})`;
        const timeRange = `${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}`;
        const count = Number(generatedCount || 0);

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.4">
                <h2 style="margin: 0 0 12px 0;">New recurring booking request</h2>
                <p style="margin: 0 0 8px 0;">
                    <strong>${studentFirstName || "Student"}</strong><br/>
                    Weekly • ${timeRange}
                </p>
                ${parentEmail ? `<p style="margin: 0 0 8px 0; color:#555;">Parent: ${parentEmail}</p>` : ""}
                <p style="margin: 0 0 8px 0; color:#555;">Lessons generated: <strong>${count}</strong></p>
                <p style="margin: 16px 0 0 0; color: #555;">
                    Please review and confirm in DarshaTutor.
                </p>
            </div>
        `;

        await sendEmail({
            to: tutorEmail,
            subject,
            html,
            text: `New recurring booking request: ${studentFirstName || "Student"} weekly ${timeRange}. Lessons generated: ${count}${parentEmail ? ` (Parent: ${parentEmail})` : ""}.`,
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
