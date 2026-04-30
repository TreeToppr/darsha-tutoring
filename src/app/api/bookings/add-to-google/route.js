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
        // 1. Safely attempt to get the user ID (This will fail for guest students)
        let userId = null;
        try {
            userId = await requireUserIdFromBearer(req);
        } catch (err) {
            // Ignore the "Not signed in" error, we will fallback to checking the payload
        }

        // 2. Extract both the bookingId AND our new studentId
        const { bookingId, studentId } = await req.json();

        if (!bookingId) return jsonError("Missing bookingId", 400);

        const { data: booking, error: bErr } = await supabaseAdmin
            .from("bookings")
            .select("id, tutor_id, parent_id, student_id, session_date, start_time, end_time, lesson_mode, booking_address_text, status, google_event_id, google_event_link")
            .eq("id", bookingId)
            .single();

        if (bErr || !booking) return jsonError("Booking not found", 404);

        // 3. 🚀 THE GUEST STUDENT AUTH FIX
        let isAuthorized = false;

        // Condition A: Caller has a valid Auth Token (Parents)
        if (userId) {
            if (booking.parent_id === userId || booking.student_id === userId) {
                isAuthorized = true;
            } else {
                const { data: studentRow } = await supabaseAdmin.from("students").select("profile_id").eq("id", booking.student_id).single();
                if (studentRow && studentRow.profile_id === userId) {
                    isAuthorized = true;
                }
            }
        }

        // Condition B: Caller has NO token, but matches the student ID (Guest Students)
        if (!isAuthorized && studentId && booking.student_id === studentId) {
            isAuthorized = true;
        }

        if (!isAuthorized) return jsonError("Not authorized to generate link", 403);

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
        } catch (err) {
            // 🚀 NEW: Print the exact reason Google is failing to the terminal!
            console.error("🚨 GOOGLE TOKEN EXCHANGE ERROR:", err);
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

        // Persist link so UI can hide button
        // 🚀 THE FIX: Use 'meet_link' to match your Supabase column name
        const { error: uErr } = await supabaseAdmin
            .from("bookings")
            .update({
                google_event_id: json?.id || null,
                meet_link: json?.hangoutLink || json?.htmlLink || null, 
            })
            .eq("id", bookingId);

        if (uErr) {
            // 🚀 THIS WILL TELL US EXACTLY WHY IT'S NOT SAVING
            console.error("🚨 SUPABASE UPDATE ERROR:", uErr);
            return jsonError(`Calendar created, but failed to store: ${uErr.message}`, 500);
        }

        // console.log("✅ SUPABASE UPDATE SUCCESS:", updateData);

        return NextResponse.json({
            ok: true,
            google_event_id: json?.id || null,
            // Update this line to match your database logic!
            google_event_link: json?.hangoutLink || json?.htmlLink || null,
            parentEmail,
        });
    } catch (e) {
        return jsonError(e?.message || "Failed", 500);
    }
}