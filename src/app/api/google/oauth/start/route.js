import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

function randomState(len = 32) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

export async function POST(req) {
    try {
        const { context } = await req.json(); // "parent_compare" | "tutor_busy"
        if (!["parent_compare", "tutor_busy"].includes(context)) {
            return NextResponse.json({ error: "Invalid context" }, { status: 400 });
        }

        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

        // Validate Supabase JWT -> user id
        const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userRes?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
        const userId = userRes.user.id;

        const state = randomState();

        // Store state in DB (server-only access)
        const { error: stateErr } = await supabaseAdmin
            .from("google_oauth_states")
            .insert({ state, user_id: userId, context });

        if (stateErr) return NextResponse.json({ error: stateErr.message }, { status: 500 });

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return NextResponse.json({ error: "Google OAuth env vars missing" }, { status: 500 });
        }

        // Read-only is enough for listing calendars + freeBusy.
        const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar.readonly");

        const url =
            "https://accounts.google.com/o/oauth2/v2/auth" +
            `?client_id=${encodeURIComponent(clientId)}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&scope=${scope}` +
            `&access_type=offline` +
            `&prompt=consent` +
            `&state=${encodeURIComponent(state)}`;

        return NextResponse.json({ url });
    } catch (e) {
        return NextResponse.json({ error: e?.message || "OAuth start failed" }, { status: 500 });
    }
}
