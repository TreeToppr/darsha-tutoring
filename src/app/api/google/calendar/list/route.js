import { NextResponse } from "next/server";
import { requireUserIdFromBearer, getGoogleAccessTokenForUser } from "../../_util";

export async function GET(req) {
    try {
        const userId = await requireUserIdFromBearer(req);
        const accessToken = await getGoogleAccessTokenForUser(userId);

        const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
            headers: { authorization: `Bearer ${accessToken}` },
        });

        const json = await res.json();
        if (!res.ok) return NextResponse.json({ error: json?.error?.message || "Calendar list failed" }, { status: 400 });

        const calendars = (json.items || []).map((c) => ({
            id: c.id,
            summary: c.summary,
            primary: !!c.primary,
        }));

        return NextResponse.json({ calendars });
    } catch (e) {
        return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
    }
}
