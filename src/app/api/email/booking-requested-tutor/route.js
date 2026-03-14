export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sendEmail } from "../../../../lib/email/resend";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req) {
    try {
        const body = await req.json();
        // Match the data exactly as StepSix sends it
        const { tutorId, studentName, date, time, endTime, parentEmail, subject } = body || {};

        if (!tutorId) {
            return NextResponse.json({ error: "Missing tutorId" }, { status: 400 });
        }

        // 1. Look up the Tutor's private Auth Profile ID
        const { data: tutor } = await supabaseAdmin
            .from('tutors')
            .select('profile_id')
            .eq('id', tutorId)
            .single();

        if (!tutor?.profile_id) {
            console.log(`[Email Skipped] Test tutor ${tutorId} is missing a profile_id.`);
            return NextResponse.json({ ok: true, skipped: true }); // Return OK so the frontend doesn't panic
        }

        // 2. Fetch the Tutor's Email securely from Supabase Auth
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(tutor.profile_id);
        const tutorEmail = authData?.user?.email;

        if (!tutorEmail) {
            console.log(`[Email Skipped] No email found for test tutor.`);
            return NextResponse.json({ ok: true, skipped: true }); // Return OK so the frontend doesn't panic
        }

        const emailSubject = `New booking request (${studentName || "Student"})`;
        const timeRange = endTime ? `${time} - ${endTime}` : time;

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.4">
                <h2 style="margin: 0 0 12px 0;">New booking request</h2>
                <p style="margin: 0 0 8px 0;">
                    <strong>${studentName || "Student"}</strong><br/>
                    Subject: ${subject || "Lesson"}<br/>
                    ${date} • ${timeRange}
                </p>
                ${parentEmail ? `<p style="margin: 0 0 8px 0; color:#555;">Parent: ${parentEmail}</p>` : ""}
                <p style="margin: 16px 0 0 0; color: #555;">
                    Please review this booking in your DarshaTutor Dashboard.
                </p>
            </div>
        `;

        await sendEmail({
            to: tutorEmail,
            subject: emailSubject,
            html,
            text: `New booking request: ${studentName || "Student"} on ${date} at ${timeRange}`,
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Email Send Error:", e);
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}