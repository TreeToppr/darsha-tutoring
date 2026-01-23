import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
        return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json({ error: "Google OAuth env vars missing" }, { status: 500 });
    }

    // Look up state -> user_id + context, then delete it
    const { data: stateRow, error: stateErr } = await supabaseAdmin
        .from("google_oauth_states")
        .select("user_id, context")
        .eq("state", state)
        .single();

    if (stateErr || !stateRow) {
        return NextResponse.json({ error: "Invalid/expired state" }, { status: 400 });
    }

    await supabaseAdmin.from("google_oauth_states").delete().eq("state", state);

    // Exchange auth code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok) {
        return NextResponse.json({ error: tokenJson?.error_description || "Token exchange failed" }, { status: 400 });
    }

    // IMPORTANT: refresh_token only returned on first consent (or prompt=consent)
    const refreshToken = tokenJson.refresh_token;
    if (!refreshToken) {
        return NextResponse.json({
            error:
                "No refresh_token received. Remove app access in Google Account and reconnect, or keep prompt=consent.",
        }, { status: 400 });
    }

    const scope = tokenJson.scope || null;

    const { error: upsertErr } = await supabaseAdmin
        .from("google_calendar_connections")
        .upsert({
            user_id: stateRow.user_id,
            provider: "google",
            refresh_token: refreshToken,
            scope,
            updated_at: new Date().toISOString(),
        });

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    // Send user back to the right dashboard
    const redirectTo = stateRow.context === "tutor_busy" ? "/tutor/dashboard" : "/parent/dashboard";
    return NextResponse.redirect(new URL(redirectTo, req.url));
}
