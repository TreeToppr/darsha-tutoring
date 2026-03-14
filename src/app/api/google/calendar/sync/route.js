import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

export async function POST(request) {
    const { bookingId } = await request.json();

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Get Booking + Tutor's Token
        const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select('*, students(name), profiles:tutor_id(google_refresh_token)')
            .eq('id', bookingId)
            .single();

        if (!booking?.profiles?.google_refresh_token) return NextResponse.json({ error: "No Google Token" });

        // 2. Setup Google Auth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_OAUTH_CLIENT_ID,
            process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            process.env.GOOGLE_OAUTH_REDIRECT_URI
        );
        oauth2Client.setCredentials({ refresh_token: booking.profiles.google_refresh_token });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 3. Create Event [cite: 2026-01-25]
        const event = {
            summary: `Tutoring: ${booking.students.name} (${booking.subject})`,
            location: booking.lesson_mode === 'in_person' ? booking.location : 'Online / Video Call',
            description: `Duration: ${booking.duration} mins`,
            start: { dateTime: `${booking.session_date}T${booking.start_time}:00`, timeZone: 'Pacific/Auckland' },
            end: { dateTime: `${booking.session_date}T${booking.start_time}:00`, timeZone: 'Pacific/Auckland' }, // You'd calculate actual end time here
        };

        const res = await calendar.events.insert({ calendarId: 'primary', resource: event });

        // 4. Save the Google Event ID back to Supabase so we can sync updates
        await supabaseAdmin.from('bookings').update({ google_event_id: res.data.id }).eq('id', bookingId);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}