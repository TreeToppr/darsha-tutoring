import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        // 🚀 THE FIX: Catch the live Google token from the frontend
        const liveGoogleToken = request.headers.get('x-google-token');

        if (!token) {
            return NextResponse.json({ error: "No authorization token provided" }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_OAUTH_CLIENT_ID,
            process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            process.env.GOOGLE_OAUTH_REDIRECT_URI
        );

        // 🚀 THE FIX: Prioritize the live token! If it exists, use it instantly.
        if (liveGoogleToken) {
            oauth2Client.setCredentials({ access_token: liveGoogleToken });
        } else {
            // Fallback to database (if you add the column later)
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('google_refresh_token')
                .eq('id', user.id)
                .single();

            if (!profile?.google_refresh_token) {
                return NextResponse.json({ events: [] });
            }
            oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });
        }

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const futureWindow = new Date();
        futureWindow.setDate(futureWindow.getDate() + 120);

        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: twoWeeksAgo.toISOString(),
            timeMax: futureWindow.toISOString(),
            maxResults: 250,
            singleEvents: true,
            orderBy: 'startTime',
        });

        return NextResponse.json({ events: res.data.items || [] });

    } catch (error) {
        console.error("Sync Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}