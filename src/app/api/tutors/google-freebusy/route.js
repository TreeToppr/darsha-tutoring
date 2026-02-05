import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireUserIdFromBearer, getGoogleAccessTokenForUser } from "../../google/_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message, status = 400) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req) {
    try {
        // Require auth (parent must be signed in to see tutor busy blocks)
        await requireUserIdFromBearer(req);

        const { searchParams } = new URL(req.url);
        const tutorId = searchParams.get("tutorId");
        const timeMin = searchParams.get("timeMin");
        const timeMax = searchParams.get("timeMax");

        if (!tutorId) return jsonError("Missing tutorId", 400);
        if (!timeMin || !timeMax) return jsonError("Missing timeMin/timeMax", 400);

        // Find the tutor's profile_id (the Supabase auth user id)
        const { data: tutor, error: tErr } = await supabaseAdmin
            .from("tutors")
            .select("id, profile_id")
            .eq("id", tutorId)
            .single();

        if (tErr || !tutor?.profile_id) return jsonError("Tutor not found", 404);

        // If tutor hasn't connected Google, return ok:true with empty busy
        let accessToken = null;
        try {
            accessToken = await getGoogleAccessTokenForUser(tutor.profile_id);
        } catch {
            return NextResponse.json({ ok: true, connected: false, busy: [] });
        }

        const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

        const googleRes = await fetch(FREEBUSY_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                timeMin,
                timeMax,
                items: [{ id: "primary" }],
            }),
        });

        const data = await googleRes.json().catch(() => ({}));

        if (!googleRes.ok) {
            const msg = data?.error?.message || `Google freebusy failed (${googleRes.status})`;
            return jsonError(msg, 502);
        }

        const busy = data?.calendars?.primary?.busy || [];
        return NextResponse.json({ ok: true, connected: true, busy });
    } catch (e) {
        return jsonError(e?.message || "Failed", 500);
    }
}
