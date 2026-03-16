import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const { tutorId, timeMin, timeMax } = await request.json();

        // 🚀 THE FIX: Translate the profile_id into the real tutor table ID!
        const { data: realTutor } = await supabaseAdmin
            .from('tutors')
            .select('id')
            .eq('profile_id', tutorId)
            .single();

        const actualTutorId = realTutor?.id || tutorId;

        // 1. FETCH TUTOR'S PERMANENT REFRESH TOKEN (Uses profile_id)
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('google_refresh_token')
            .eq('id', tutorId)
            .single();

        const liveGoogleToken = request.headers.get('x-google-token');
        let mergedBusyBlocks = [];

        // 2. FETCH LOCAL SUPABASE BOOKINGS (Uses actualTutorId)
        const { data: localBookings } = await supabaseAdmin
            .from('bookings')
            .select('session_date, start_time, duration, status')
            .eq('tutor_id', actualTutorId)
            .neq('status', 'declined');

        if (localBookings) {
            localBookings.forEach(booking => {
                const [hours, minutes] = booking.start_time.split(':');
                const startMins = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
                const endMins = startMins + (booking.duration || 60);
                mergedBusyBlocks.push({
                    start: `${booking.session_date}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`,
                    end: `${booking.session_date}T${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}:00`
                });
            });
        }

        // 3. GOOGLE CALENDAR SYNC (Now with Auto-Refresh)
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_OAUTH_CLIENT_ID,
            process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            process.env.GOOGLE_OAUTH_REDIRECT_URI
        );

        if (profile?.google_refresh_token) {
            oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });
        } else if (liveGoogleToken && liveGoogleToken !== 'undefined') {
            oauth2Client.setCredentials({ access_token: liveGoogleToken });
        }

        if (oauth2Client.credentials.access_token || oauth2Client.credentials.refresh_token) {
            try {
                const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
                const eventsRes = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin,
                    timeMax,
                    singleEvents: true,
                });

                const googleBusy = (eventsRes.data.items || []).map(event => ({
                    start: event.start.dateTime || `${event.start.date}T00:00:00`,
                    end: event.end.dateTime || `${event.end.date}T23:59:59`,
                }));
                mergedBusyBlocks = [...mergedBusyBlocks, ...googleBusy];
            } catch (gErr) {
                console.error("Background Google Sync failed:", gErr.message);
            }
        }

        // 4. FETCH TUTOR WORKING HOURS (Uses actualTutorId)
        const { data: workingHours } = await supabaseAdmin
            .from('tutor_availability')
            .select('*')
            .eq('tutor_id', actualTutorId);

        return NextResponse.json({
            busy: mergedBusyBlocks,
            workingHours: workingHours || []
        });

    } catch (error) {
        console.error("Critical Freebusy Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}