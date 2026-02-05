import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabaseAdmin";
import { requireUserIdFromBearer, getGoogleAccessTokenForUser } from "../../../google/_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message, status = 400) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req) {
    try {
        const userId = await requireUserIdFromBearer(req);
        const { bookingId } = await req.json();

        if (!bookingId) return jsonError("Missing bookingId", 400);

        // Confirm tutor owns this booking
        const { data: tutorRow, error: tutorErr } = await supabaseAdmin
            .from("tutors")
            .select("id")
            .eq("profile_id", userId)
            .single();

        if (tutorErr || !tutorRow?.id) return jsonError("Tutor not found", 403);

        const { data: booking, error: bErr } = await supabaseAdmin
            .from("bookings")
            .select("id, tutor_id, parent_id, session_date, start_time, end_time, lesson_mode, booking_address_text")
            .eq("id", bookingId)
            .single();

        if (bErr || !booking) return jsonError("Booking not found", 404);
        if (booking.tutor_id !== tutorRow.id) return jsonError("Not your booking", 403);

        // Update status
        const { error: upErr } = await supabaseAdmin
            .from("bookings")
            .update({ status: "accepted" })
            .eq("id", bookingId);

        if (upErr) return jsonError(upErr.message, 500);

        // Parent email (best effort)
        let parentEmail = null;
        try {
            const userRes = await supabaseAdmin.auth.admin.getUserById(booking.parent_id);
            parentEmail = userRes?.data?.user?.email || null;
        } catch {
            parentEmail = null;
        }

        // Create Google event (invite parent)
        const accessToken = await getGoogleAccessTokenForUser(userId);

        const startISO = new Date(`${booking.session_date}T${String(booking.start_time).slice(0, 5)}:00`).toISOString();
        const endISO = new Date(`${booking.session_date}T${String(booking.end_time).slice(0, 5)}:00`).toISOString();

        const summary = "Tutoring lesson (DarshaTutor)";
        const location =
            booking.lesson_mode === "in_person" ? (booking.booking_address_text || "") : "Online";

        const event = {
            summary,
            location,
            start: { dateTime: startISO },
            end: { dateTime: endISO },
            transparency: "opaque",
            attendees: parentEmail ? [{ email: parentEmail }] : [],
        };

        const url =
            `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
            `?sendUpdates=all`;

        const googleRes = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
            body: JSON.stringify(event),
        });

        const text = await googleRes.text();
        let json = null;
        try { json = JSON.parse(text); } catch { }

        if (!googleRes.ok) {
            const msg = json?.error?.message || text || `Google invite failed (${googleRes.status})`;
            // Booking is accepted already; return error so tutor can see it and you can retry manually
            return jsonError(`Booking accepted, but calendar invite failed: ${msg}`, 400);
        }

        return NextResponse.json({ ok: true, googleEvent: json, parentEmail });
    } catch (e) {
        return jsonError(e?.message || "Failed", 500);
    }
}
