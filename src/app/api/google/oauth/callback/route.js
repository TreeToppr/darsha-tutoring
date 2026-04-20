import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY // Uses your secure server key
    );

    try {
        // 1. Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();
        if (tokens.error) throw new Error(tokens.error_description);

        // 2. Get the Google User info just to find the right profile
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const googleUser = await userRes.json();

        // 3. Update ONLY the refresh token
        // We removed 'google_email' because it's missing from your table
        const updatePayload = {};
        if (tokens.refresh_token) {
            updatePayload.google_refresh_token = tokens.refresh_token;
        }

        if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(updatePayload)
                .eq('email', googleUser.email);

            if (updateError) throw updateError;
        }

        return NextResponse.redirect(`${process.env.APP_BASE_URL}/tutor-dashboard?sync=success`);

    } catch (error) {
        console.error("Sync Error:", error.message);
        return NextResponse.redirect(`${process.env.APP_BASE_URL}/tutor-dashboard?error=sync_failed`);
    }
}