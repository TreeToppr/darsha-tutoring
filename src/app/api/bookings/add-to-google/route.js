import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireUserIdFromBearer, getGoogleAccessTokenForUser } from "../../google/_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message, status = 400) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

async function getUserEmail(userId) {
    try {
        const res = await supabaseAdmin.auth.admin.getUserById(userId);
        return res?.data?.user?.email || null;
    } catch {
        return null;
    }
}

export async function POST(req) {
    try {
        const parentUserId = await requireUserIdFromBearer(req);
        const { bookingId } = await req.json();

        if (!bookingId) return jsonError("Missing bookingId", 400);

        // booking must belong to this parent
        const { data: booking, error: bErr } = await supabaseAdmin
            .from("bookings")
            .select("id, tutor_id, parent_id, session_date, start_time, end_time, lesson_mode, booking_address_text, status, google_event_id, google_event_link")
            .eq("id", bookingId)
            .single();

        if (bErr || !booking) return jsonError("Booking not found", 404);
        if (booking.parent_id !== parentUserId) return jsonError("Not your booking", 403);

        // Don't create calendar events for rejected/cancelled
        const status = String(booking.status || "").toLowerCase();
        if (["rejected", "declined", "cancelled"].includes(status)) {
            return jsonError("This booking cannot be added to calendar", 400);
        }

        // If already created, return it
        if (booking.google_event_id) {
            return NextResponse.json({ ok: true, already: true, google_event_id: booking.google_event_id, google_event_link: booking.google_event_link || null });
        }

        // Find tutor's auth user id (profile_id) to use their Google connection
        const { data: tutor, error: tErr } = await supabaseAdmin
            .from("tutors")
            .select("id, profile_id")
            .eq("id", booking.tutor_id)
            .single();

        if (tErr || !tutor?.profile_id) return jsonError("Tutor not found", 404);

        // Tutor must have Google connected
        let accessToken = null;
        try {
            accessToken = await getGoogleAccessTokenForUser(tutor.profile_id);
        } catch {
            return jsonError("Tutor has not connected Google Calendar", 400);
        }

        const parentEmail = await getUserEmail(booking.parent_id);

        const startLocal = `${booking.session_date}T${String(booking.start_time).slice(0, 5)}:00`;
        const endLocal = `${booking.session_date}T${String(booking.end_time).slice(0, 5)}:00`;

        const location = booking.lesson_mode === "in_person" ? (booking.booking_address_text || "") : "Online";
        const summary = "Tutoring lesson (DarshaTutor)";
        const description = "Created by DarshaTutor booking.";

        const event = {
            summary,
            location,
            description,
            start: { dateTime: startLocal, timeZone: "Pacific/Auckland" },
            end: { dateTime: endLocal, timeZone: "Pacific/Auckland" },
            transparency: "opaque",
            attendees: parentEmail ? [{ email: parentEmail }] : [],
        };

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all`;

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
            return jsonError(msg, 400);
        }

        // Persist link so UI can hide button
        const { error: uErr } = await supabaseAdmin
            .from("bookings")
            .update({
                google_event_id: json?.id || null,
                google_event_link: json?.htmlLink || null,
            })
            .eq("id", bookingId);

        if (uErr) return jsonError(`Calendar created, but failed to store event id: ${uErr.message}`, 500);

        return NextResponse.json({
            ok: true,
            google_event_id: json?.id || null,
            google_event_link: json?.htmlLink || null,
            parentEmail,
        });
    } catch (e) {
        return jsonError(e?.message || "Failed", 500);
    }
}
