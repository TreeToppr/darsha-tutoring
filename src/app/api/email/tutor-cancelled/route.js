import { NextResponse } from "next/server";
// import { sendEmail } from "@/lib/email/resend";
import { sendEmail } from "../../../../lib/email/resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req) {
    try {
        const body = await req.json();
        const { bookingId } = body || {};

        if (!bookingId) {
            return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }

        // 1) Load booking details
        const { data: booking, error: bErr } = await supabaseAdmin
            .from("bookings")
            .select(`
        id,
        session_date,
        start_time,
        end_time,
        parent_id,
        tutor_id,
        students(full_name)
      `)
            .eq("id", bookingId)
            .single();

        if (bErr || !booking) {
            return NextResponse.json({ error: bErr?.message || "Booking not found" }, { status: 404 });
        }

        // 2) Tutor details
        const { data: tutor, error: tErr } = await supabaseAdmin
            .from("tutors")
            .select("email, display_name")
            .eq("id", booking.tutor_id)
            .single();

        const tutorEmail = tutor?.email || "";
        const tutorName = tutor?.display_name || "Tutor";

        // 3) Parent email from Supabase Auth
        let parentEmail = "";
        const { data: parentAuth, error: pErr } = await supabaseAdmin.auth.admin.getUserById(
            booking.parent_id
        );

        if (!pErr) parentEmail = parentAuth?.user?.email || "";

        const studentFirstName =
            (booking?.students?.full_name || "").trim().split(/\s+/)[0] || "Student";

        const timeRange = `${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)}`;
        const whenLine = `${booking.session_date} • ${timeRange}`;

        // Parent email
        if (parentEmail) {
            await sendEmail({
                to: parentEmail,
                subject: `Lesson cancelled by tutor (${studentFirstName})`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.4">
                        <h2 style="margin: 0 0 12px 0;">Lesson cancelled by tutor</h2>
                        <p style="margin: 0 0 8px 0;">
                            <strong>${studentFirstName}</strong><br/>
                            ${whenLine}
                        </p>
                        <p style="margin: 0 0 8px 0; color:#555;">Tutor: ${tutorName}</p>
                        <p style="margin: 16px 0 0 0; color:#555;">Please re-book another time in DarshaTutor.</p>
                    </div>
                `,
                text: `Lesson cancelled by tutor: ${studentFirstName} - ${whenLine} (Tutor: ${tutorName})`,
            });
        }

        // Tutor confirmation email
        if (tutorEmail) {
            await sendEmail({
                to: tutorEmail,
                subject: `You cancelled a lesson (${studentFirstName})`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.4">
                        <h2 style="margin: 0 0 12px 0;">Lesson cancelled</h2>
                        <p style="margin: 0 0 8px 0;">
                            <strong>${studentFirstName}</strong><br/>
                            ${whenLine}
                        </p>
                        <p style="margin: 16px 0 0 0; color:#555;">This is a confirmation for your records.</p>
                    </div>
                `,
                text: `You cancelled a lesson: ${studentFirstName} - ${whenLine}`,
            });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
