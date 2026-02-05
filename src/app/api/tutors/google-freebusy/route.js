import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getGoogleAccessTokenForUser } from "../../google/_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

function jsonError(message, status = 400) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req) {
    try {
        const url = new URL(req.url);

        const tutorId = url.searchParams.get("tutorId");
        const timeMin = url.searchParams.get("timeMin");
        const timeMax = url.searchParams.get("timeMax");
        const calendarId = url.searchParams.get("calendarId") || "primary";

        if (!tutorId) return jsonError("Missing tutorId", 400);
        if (!timeMin || !timeMax) return jsonError("Missing timeMin/timeMax", 400);

        // Map tutorId -> profile_id (Supabase auth user id)
        const { data: tutorRow, error: tutorErr } = await supabaseAdmin
            .from("tutors")
            .select("profile_id")
            .eq("id", tutorId)
            .single();

        if (tutorErr || !tutorRow?.profile_id) {
            return jsonError("Tutor not found or missing profile_id", 404);
        }

        // Use tutor's Google connection (stored against profile_id)
        const accessToken = await getGoogleAccessTokenForUser(tutorRow.profile_id);

        const body = {
            timeMin: new Date(timeMin).toISOString(),
            timeMax: new Date(timeMax).toISOString(),
            items: [{ id: String(calendarId) }],
        };

        const googleRes = await fetch(FREEBUSY_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const text = await googleRes.text();
        let data = null;
        try { data = JSON.parse(text); } catch { }

        if (!googleRes.ok) {
            const msg = data?.error?.message || text || `Google freebusy failed (${googleRes.status})`;
            return jsonError(msg, 400);
        }

        const busy = data?.calendars?.[String(calendarId)]?.busy || [];
        return NextResponse.json({ ok: true, busy });
    } catch (e) {
        return jsonError(e?.message || "Failed", 500);
    }
}
