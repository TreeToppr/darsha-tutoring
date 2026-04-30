import { NextResponse } from 'next/server';

export async function GET() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

    const options = {
        // Matches your exact .env key
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/calendar.events',
        ].join(' '),
    };

    console.log("--- OAUTH START DEBUG ---");
    console.log("USING CLIENT ID:", process.env.GOOGLE_OAUTH_CLIENT_ID);
    console.log("USING REDIRECT URI:", process.env.GOOGLE_OAUTH_REDIRECT_URI);

    const qs = new URLSearchParams(options);
    return NextResponse.redirect(`${rootUrl}?${qs.toString()}`);
}