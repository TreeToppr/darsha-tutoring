import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    // Fallback to localhost if the ENV variable is missing
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) throw new Error("Booking not found");

        const auth = Buffer.from(`${process.env.POLI_MERCHANT_CODE}:${process.env.POLI_AUTH_CODE}`).toString('base64');

        const payload = {
            Amount: booking.amount_total.toFixed(2),
            CurrencyCode: "NZD",
            //   FIX 1: Pass the full UUID formatted exactly how verify.js expects it!
            MerchantReference: `booking-${booking.id}`,
            MerchantHomepageURL: baseUrl,
            //   FIX 2: Redirect them straight back to the payments dashboard so the token is caught!
            SuccessURL: `${baseUrl}/parent-payments?payment=success`,
            FailureURL: `${baseUrl}/parent-payments?payment=failed`,
            CancellationURL: `${baseUrl}/parent-payments?payment=cancelled`,
            NotificationURL: process.env.POLI_NOTIFICATION_URL
        };

        const response = await fetch(`${process.env.POLI_API_BASE}/Transaction/Initiate`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.Success && data.NavigateURL) {
            return NextResponse.json({ url: data.NavigateURL });
        } else {
            return NextResponse.json({
                error: data.ErrorMessage || "POLi rejected the request"
            }, { status: 400 });
        }

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}