import { NextResponse } from "next/server";
import { requireUserIdFromBearer, getGoogleAccessTokenForUser } from "../../_util";

// Google Calendar FreeBusy endpoint
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

function jsonError(message, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

async function handleFreeBusy(req, { calendarId, timeMin, timeMax }) {
    if (!calendarId) return jsonError("Missing calendarId", 400);

    // Identify the signed-in Supabase user from the Bearer token
    const userId = await requireUserIdFromBearer(req);

    // Load Google token stored for THIS Supabase user
    const accessToken = await getGoogleAccessTokenForUser(userId);

    // Sensible defaults (week window) if not supplied
    const now = new Date();
    const start = timeMin ? new Date(timeMin) : new Date(now);
    const end = timeMax ? new Date(timeMax) : new Date(now);

    if (!timeMin) start.setDate(start.getDate() - 3);
    if (!timeMax) end.setDate(end.getDate() + 10);

    const body = {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
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
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!googleRes.ok) {
        const msg =
            data?.error?.message ||
            text ||
            `Google freebusy failed (${googleRes.status})`;
        return jsonError(msg, 400);
    }

    const busy = data?.calendars?.[String(calendarId)]?.busy || [];
    return NextResponse.json({ busy });
}

// Support GET (your UI uses GET with query params)
export async function GET(req) {
    const url = new URL(req.url);
    const calendarId = url.searchParams.get("calendarId");
    const timeMin = url.searchParams.get("timeMin");
    const timeMax = url.searchParams.get("timeMax");
    return handleFreeBusy(req, { calendarId, timeMin, timeMax });
}

// Also support POST (in case any part of your UI still POSTs)
export async function POST(req) {
    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }
    const { calendarId, timeMin, timeMax } = payload || {};
    return handleFreeBusy(req, { calendarId, timeMin, timeMax });
}
