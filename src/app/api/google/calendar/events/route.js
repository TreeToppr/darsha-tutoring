import { NextResponse } from "next/server";
import { requireUserIdFromBearer, getGoogleAccessTokenForUser } from "../../_util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message, status = 400) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req) {
    try {
        const userId = await requireUserIdFromBearer(req);
        const accessToken = await getGoogleAccessTokenForUser(userId);

        const body = await req.json();
        const {
            calendarId = "primary",
            summary = "Busy",
            description = "",
            startISO,
            endISO,
            attendees = [],
            sendUpdates = "none", // "none" | "all"
        } = body || {};

        if (!startISO || !endISO) return jsonError("Missing startISO/endISO", 400);

        const url =
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
            `?sendUpdates=${encodeURIComponent(sendUpdates)}`;

        const event = {
            summary,
            description,
            start: { dateTime: new Date(startISO).toISOString() },
            end: { dateTime: new Date(endISO).toISOString() },
            transparency: "opaque",
            visibility: "default",
            attendees: Array.isArray(attendees)
                ? attendees
                    .filter((e) => typeof e === "string" && e.includes("@"))
                    .map((email) => ({ email }))
                : [],
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
            return jsonError(msg, 400);
        }

        return NextResponse.json({ ok: true, event: json });
    } catch (e) {
        return jsonError(e?.message || "Failed", 500);
    }
}
