import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    const { bookingId } = await request.json();

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Update Booking Status to 'confirmed'
        const { data: booking, error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', bookingId)
            .select('*, profiles(full_name, email)') // Join to get parent details
            .single();

        if (updateError) throw updateError;

        // 2. TODO: Add logic here to create the Google Calendar Event 
        // using the tutor's refresh token (similar to our free/busy logic)

        return NextResponse.json({ success: true, booking });
    } catch (error) {
        console.error("Accept Booking Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}