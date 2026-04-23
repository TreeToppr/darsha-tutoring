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
        console.log("=== STARTING CALENDAR SYNC ===");
        console.log("Target Booking ID:", bookingId);

        // Step 1: SAFELY get ONLY the booking first
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            console.log("❌ FAILED TO FETCH BOOKING:", bookingError?.message || "Not found");
            return NextResponse.json({ error: "Booking not found" });
        }

        // Step 1.5: Safely get the Student's name
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('name, first_name')
            .eq('id', booking.student_id)
            .single();

        const studentName = student?.first_name || student?.name || 'Student';

        // Step 2: BULLETPROOF TOKEN FETCHING
        const { data: tutorData } = await supabaseAdmin
            .from('tutors')
            .select('profile_id')
            .eq('id', booking.tutor_id)
            .single();

        const actualProfileId = tutorData?.profile_id || booking.tutor_id;

        const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('google_refresh_token')
            .eq('id', actualProfileId)
            .single();

        const refreshToken = profileData?.google_refresh_token;

        if (!refreshToken) {
            console.log("❌ FAILED: No Google Token found");
            return NextResponse.json({ error: "No Google Token" });
        }

        console.log("1. Google Token FOUND!");

        console.log("==== GOOGLE SYNC DEBUG ====");
        console.log("Client ID loaded?", !!process.env.GOOGLE_OAUTH_CLIENT_ID);
        console.log("Client Secret loaded?", !!process.env.GOOGLE_OAUTH_CLIENT_SECRET);
        console.log("Refresh Token loaded?", !!refreshToken);
        console.log("===========================");

        // Step 3: Setup Google Auth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_OAUTH_CLIENT_ID,
            process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            process.env.GOOGLE_OAUTH_REDIRECT_URI
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        console.log('Stored refresh token exists:', !!refreshToken);
        console.log('Refresh token preview:', refreshToken ? refreshToken.slice(0, 20) : null);

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 🚀 THE FIX: Safely deconstruct the time and rebuild it perfectly for Google
        const [startHour, startMin] = booking.start_time.split(':').map(Number);

        const cleanStartHour = startHour.toString().padStart(2, '0');
        const cleanStartMin = startMin.toString().padStart(2, '0');
        const startTimeString = `${cleanStartHour}:${cleanStartMin}:00`;

        const totalEndMins = (startHour * 60) + startMin + (booking.duration || 60);
        const endHour = Math.floor(totalEndMins / 60).toString().padStart(2, '0');
        const endMin = (totalEndMins % 60).toString().padStart(2, '0');
        const endTimeString = `${endHour}:${endMin}:00`;

        const isOnline = booking.lesson_mode !== 'in_person';

        // 🚀 THE FIX 2: Safely fallback undefined/null values
        const event = {
            summary: `Tutoring: ${studentName} (${booking.subject || 'Session'})`,
            location: isOnline ? 'Online / Video Call' : (booking.location || 'TBD'),
            description: `Duration: ${booking.duration || 60} mins`,
            start: { dateTime: `${booking.session_date}T${startTimeString}`, timeZone: 'Pacific/Auckland' },
            end: { dateTime: `${booking.session_date}T${endTimeString}`, timeZone: 'Pacific/Auckland' },
        };

        if (isOnline) {
            console.log("3. Requesting Google Meet Room...");
            event.conferenceData = {
                createRequest: {
                    requestId: `meet-${bookingId}-${Date.now()}`,
                    conferenceSolutionKey: { type: "hangoutsMeet" }
                }
            };
        }

        console.log("4. Sending event to Google...");
        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1
        });

        console.log("5. Google Event Created! ID:", res.data.id);
        const meetLink = res.data.hangoutLink;
        console.log("6. Google Meet Link:", meetLink || "NONE");

        console.log("7. Saving to Supabase...");
        const { error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({
                google_event_id: res.data.id,
                ...(meetLink && { meet_link: meetLink })
            })
            .eq('id', bookingId);

        if (updateError) {
            console.log("❌ SUPABASE UPDATE FAILED:", updateError.message);
        } else {
            console.log("✅ SUPABASE UPDATE SUCCESSFUL");
        }

        console.log("=== CALENDAR SYNC COMPLETE ===");

        return NextResponse.json({ success: true, meetLink });
    } catch (error) {
        console.error("❌ FATAL CALENDAR SYNC ERROR:", error.message);
        console.error("❌ FULL ERROR RESPONSE:", error.response?.data);
        return NextResponse.json(
            { error: error.message, details: error.response?.data || null },
            { status: 500 }
        );
    }
}