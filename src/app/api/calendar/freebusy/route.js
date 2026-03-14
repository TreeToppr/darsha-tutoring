import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { tutorId, timeMin, timeMax } = await request.json();

        // 1. Initialize Supabase Admin to bypass RLS and securely grab the refresh token
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Fetch the tutor's Google Refresh Token from the profiles table
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('google_refresh_token')
            .eq('id', tutorId)
            .single();

        if (!profile || !profile.google_refresh_token) {
            // If they haven't connected Google Calendar, we just assume they are fully available
            return NextResponse.json({ busy: [] });
        }

        // 2. Exchange the Refresh Token for a fresh Access Token directly with Google
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
                refresh_token: profile.google_refresh_token,
                grant_type: 'refresh_token',
            }),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) throw new Error("Failed to refresh Google token");

        // 3. Query Google Calendar's Free/Busy API
        const freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timeMin: timeMin, // Start of the week
                timeMax: timeMax, // End of the week
                items: [{ id: 'primary' }], // Check their primary calendar
            }),
        });

        const freeBusyData = await freeBusyResponse.json();

        // Extract the busy time blocks
        const busySlots = freeBusyData.calendars?.primary?.busy || [];

        return NextResponse.json({ busy: busySlots });

    } catch (error) {
        console.error("Free/Busy Error:", error);
        return NextResponse.json({ error: "Could not fetch calendar availability" }, { status: 500 });
    }
}