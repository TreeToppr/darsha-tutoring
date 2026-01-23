import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function requireUserIdFromBearer(req) {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new Error("Missing auth token");

    const { data: userRes, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !userRes?.user) throw new Error("Not signed in");

    return userRes.user.id;
}

export async function getGoogleAccessTokenForUser(userId) {
    const { data: conn, error } = await supabaseAdmin
        .from("google_calendar_connections")
        .select("refresh_token")
        .eq("user_id", userId)
        .single();

    if (error || !conn?.refresh_token) throw new Error("Google Calendar not connected");

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: conn.refresh_token,
            grant_type: "refresh_token",
        }),
    });

    const json = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(json?.error_description || "Failed to refresh access token");

    return json.access_token;
}
