import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, templates } from '@/lib/email';

export async function POST(request) {
    const { searchParams } = new URL(request.url);
    const token = await request.text(); // POLi sends a token in the body

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const auth = Buffer.from(`${process.env.POLI_MERCHANT_CODE}:${process.env.POLI_AUTH_CODE}`).toString('base64');

        // Use the token to get the final status from POLi
        const response = await fetch(`${process.env.POLI_API_BASE}/Transaction/GetTransaction?token=${encodeURIComponent(token)}`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });

        const data = await response.json();

        if (data.TransactionStatusCode === 'Completed') {
            // Extract the booking ID from the MerchantReference (e.g. "B1234567")
            const bookingIdPart = data.MerchantReference.replace('B', '');

            // 💡 Search for the booking that starts with this ID snippet
            const { data: booking } = await supabaseAdmin
                .from('bookings')
                .select('id')
                .ilike('id', `${bookingIdPart}%`)
                .single();

            if (booking) {
                await supabaseAdmin
                    .from('bookings')
                    .update({
                        payment_status: 'paid',
                        status: 'confirmed' // Automatically confirm it since it's paid!
                    })
                    .eq('id', booking.id);

                const { data: parent } = await supabaseAdmin
                    .from('profiles')
                    .select('email, full_name')
                    .eq('id', booking.parent_id)
                    .single();

                if (parent) {
                    await sendEmail({
                        to: parent.email,
                        subject: `Payment Confirmed: ${booking.subject} Lesson`,
                        html: templates.paymentConfirmed(parent.full_name, booking.amount_total, booking.subject)
                    });
                }
            }
        }

        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error("POLi Notification Error:", error);
        return new Response('Error', { status: 500 });
    }
}