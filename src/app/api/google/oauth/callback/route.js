import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    const appBaseUrl =
        process.env.APP_BASE_URL || 'https://darsha-tutoring.vercel.app';

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        if (!code) {
            throw new Error('Missing OAuth code');
        }

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

        console.log('GOOGLE TOKENS:', tokens);

        if (!tokenResponse.ok || tokens.error) {
            console.error('Google token exchange failed:', tokens);
            throw new Error(tokens.error_description || tokens.error || 'Token exchange failed');
        }

        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const googleUser = await userRes.json();

        if (!userRes.ok || !googleUser?.email) {
            console.error('Google userinfo failed:', googleUser);
            throw new Error('Failed to fetch Google user info');
        }

        const updatePayload = {};
        if (tokens.refresh_token) {
            updatePayload.google_refresh_token = tokens.refresh_token;
        }

        if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(updatePayload)
                .eq('email', googleUser.email);

            if (updateError) {
                console.error('Database Save Failed:', updateError);
                throw updateError;
            }
        }

        revalidatePath('/tutor-dashboard', 'layout');

        return NextResponse.redirect(`${appBaseUrl}/tutor-dashboard?sync=success`);
    } catch (error) {
        console.error('Sync Error:', error);
        return NextResponse.redirect(`${appBaseUrl}/tutor-dashboard?error=sync_failed`);
    }
}