import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { requireUserIdFromBearer, getGoogleAccessTokenForUser } from "../../../google/_util";

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
        const tutorUserId = await requireUserIdFromBearer(req);
        const { bookingId } = await req.json();

        if (!bookingId) return jsonError("Missing bookingId", 400);

        // Tutor row
        const { data: tutorRow, error: tutorErr } = await supabaseAdmin
            .from("tutors")
            .select("id")
            .eq("profile_id", tutorUserId)
            .single();

        if (tutorErr || !tutorRow?.id) return jsonError("Tutor not found", 403);

        // Booking must belong to tutor
        const { data: booking, error: bErr } = await supabaseAdmin
            .from("bookings")
            .select("id, tutor_id, parent_id, session_date, start_time, end_time, lesson_mode, booking_address_text, status, google_event_id")
            .eq("id", bookingId)
            .single();

        if (bErr || !booking) return jsonError("Booking not found", 404);
        if (booking.tutor_id !== tutorRow.id) return jsonError("Not your booking", 403);

        const status = String(booking.status || "").toLowerCase();
        if (["rejected", "declined", "cancelled"].includes(status)) {
            return jsonError("This booking cannot be added to calendar", 400);
        }

        if (booking.google_event_id) {
            return NextResponse.json({ ok: true, already: true, google_event_id: booking.google_event_id });
        }

        const accessToken = await getGoogleAccessTokenForUser(tutorUserId);
        const parentEmail = await getUserEmail(booking.parent_id);

        const startLocal = `${booking.session_date}T${String(booking.start_time).slice(0, 5)}:00`;
        const endLocal = `${booking.session_date}T${String(booking.end_time).slice(0, 5)}:00`;

        const location = booking.lesson_mode === "in_person" ? (booking.booking_address_text || "") : "Online";

        const event = {
            summary: "Tutoring lesson (DarshaTutor)",
            location,
            description: "Created by DarshaTutor booking.",
            start: { dateTime: startLocal, timeZone: "Pacific/Auckland" },
            end: { dateTime: endLocal, timeZone: "Pacific/Auckland" },
            transparency: "opaque",
            attendees: parentEmail ? [{ email: parentEmail }] : [],
        };

        // Conditionally request a Google Meet link if the lesson is not in-person
        if (booking.lesson_mode !== "in_person") {
            event.conferenceData = {
                createRequest: {
                    // Google requires a unique ID for the creation request
                    requestId: `meet-${bookingId}`,
                    conferenceSolutionKey: { type: "hangoutsMeet" }
                }
            };
        }

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1`;

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

        const { error: uErr } = await supabaseAdmin
            .from("bookings")
            .update({
                google_event_id: json?.id || null,
                // Save the Meet link if it exists, otherwise fallback to the Calendar page link
                google_event_link: json?.hangoutLink || json?.htmlLink || null,
            })
            .eq("id", bookingId);

        if (uErr) return jsonError(`Calendar created, but failed to store event id: ${uErr.message}`, 500);

        // Update the google_event_link here as well!
        return NextResponse.json({ ok: true, google_event_id: json?.id || null, google_event_link: json?.hangoutLink || json?.htmlLink || null });
    } catch (e) {
        return jsonError(e?.message || "Failed", 500);
    }
}
