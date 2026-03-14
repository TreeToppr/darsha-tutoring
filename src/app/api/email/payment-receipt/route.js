import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { emailTemplates } from '../../../../lib/email/templates';

export async function POST(req) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) { return cookieStore.get(name)?.value; },
            },
        }
    );

    try {
        const { bookingId } = await req.json();

        // 1. Fetch the booking data with Parent and Student details
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
        amount_total,
        payment_method,
        lesson_date,
        profiles!parent_id(email),
        students(name)
      `)
            .eq('id', bookingId)
            .single();

        if (error || !booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // 2. Trigger the email template
        await emailTemplates.sendPaymentReceipt({
            parentEmail: booking.profiles.email,
            bookingDetails: {
                date: booking.lesson_date,
                amount: booking.amount_total,
                method: booking.payment_method,
                studentName: booking.students.name
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Email API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}