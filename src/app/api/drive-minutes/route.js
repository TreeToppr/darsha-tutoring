import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { address } = await req.json();

        if (!address || typeof address !== "string" || !address.trim()) {
            return NextResponse.json({ error: "Missing address" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing GOOGLE_MAPS_API_KEY env var" }, { status: 500 });
        }

        // Origin: your base location. Keep it stable.
        const origin = "9 Benbow Street, St Heliers, Auckland, New Zealand";
        const destination = address.trim();

        const url =
            "https://maps.googleapis.com/maps/api/distancematrix/json" +
            `?origins=${encodeURIComponent(origin)}` +
            `&destinations=${encodeURIComponent(destination)}` +
            `&mode=driving` +
            `&key=${encodeURIComponent(apiKey)}`;

        const r = await fetch(url);
        if (!r.ok) {
            return NextResponse.json({ error: "Distance Matrix fetch failed" }, { status: 502 });
        }

        const data = await r.json();

        const el = data?.rows?.[0]?.elements?.[0];
        const status = el?.status;

        if (status !== "OK") {
            return NextResponse.json(
                { error: "Could not calculate drive time", details: status || "UNKNOWN" },
                { status: 400 }
            );
        }

        const seconds = el?.duration?.value;
        if (typeof seconds !== "number") {
            return NextResponse.json({ error: "No duration returned" }, { status: 400 });
        }

        const minutes = Math.max(0, Math.round(seconds / 60));
        return NextResponse.json({ minutes });
    } catch (e) {
        return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
    }
}
