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
    // 🚀 FIX: Query the 'profiles' table where we actually saved the token
    const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("google_refresh_token")
        .eq("id", userId)
        .single();

    if (error || !profile?.google_refresh_token) {
        throw new Error("Google Calendar not connected (no refresh token found in profiles)");
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: profile.google_refresh_token,
            grant_type: "refresh_token",
        }),
    });

    const json = await tokenRes.json();

    // This will now catch that "Bad Request" and tell us exactly what Google didn't like
    if (!tokenRes.ok) {
        console.error("Google Refresh API Error:", json);
        throw new Error(json?.error_description || "Failed to refresh access token");
    }

    return json.access_token;
}
