import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { requireUserIdFromBearer, getGoogleAccessTokenForUser } from "../../google/_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message, status = 400) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req) {
    try {
        const userId = await requireUserIdFromBearer(req);

        // Must be a tutor
        const { data: tutorRow, error: tutorErr } = await supabaseAdmin
            .from("tutors")
            .select("id")
            .eq("profile_id", userId)
            .single();

        if (tutorErr || !tutorRow?.id) return jsonError("Tutor not found for this user", 403);

        const body = await req.json();
        const {
            date,          // "YYYY-MM-DD"
            startTime,     // "HH:MM"
            endTime,       // "HH:MM"
            title = "Busy - DarshaTutor",
            calendarId = "primary",
        } = body || {};

        if (!date || !startTime || !endTime) return jsonError("Missing date/startTime/endTime", 400);

        // 1) Write DB override (your booking page already subtracts tutor_date_overrides)
        const { error: insErr } = await supabaseAdmin
            .from("tutor_date_overrides")
            .insert({
                tutor_id: tutorRow.id,
                date,
                start_time: startTime,
                end_time: endTime,
            });

        if (insErr) return jsonError(insErr.message, 500);

        // 2) Write Google event
        const accessToken = await getGoogleAccessTokenForUser(userId);
        const startISO = new Date(`${date}T${startTime}:00`).toISOString();
        const endISO = new Date(`${date}T${endTime}:00`).toISOString();

        const url =
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
            `?sendUpdates=none`;

        const event = {
            summary: title,
            start: { dateTime: startISO },
            end: { dateTime: endISO },
            transparency: "opaque",
        };

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
            const msg = json?.error?.message || text || `Google events.insert failed (${googleRes.status})`;
            // DB is already written; return useful error so you can see it
            return jsonError(`DB busy block saved, but Google event failed: ${msg}`, 400);
        }

        return NextResponse.json({ ok: true, googleEvent: json });
    } catch (e) {
        return jsonError(e?.message || "Failed", 500);
    }
}
