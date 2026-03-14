import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const body = await request.json();
        const { bookingIds, parentId } = body;

        if (!bookingIds || bookingIds.length === 0) {
            return NextResponse.json({ error: "No bookings selected" }, { status: 400 });
        }

        // 1. Fetch the actual bookings to ensure they exist and calculate the true total
        const { data: bookings, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('id, amount_total, parent_id')
            .in('id', bookingIds)
            .eq('payment_status', 'unpaid');

        if (fetchError || !bookings || bookings.length === 0) {
            throw new Error("Valid unpaid bookings not found");
        }

        const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount_total), 0);

        // 2. Create the Payment Intent in your database
        const { data: intent, error: intentError } = await supabaseAdmin
            .from('poli_payment_intents')
            .insert({
                parent_id: parentId || bookings[0].parent_id,
                booking_ids: bookings.map(b => b.id),
                amount_total: totalAmount,
                status: 'pending'
            })
            .select()
            .single();

        if (intentError) throw new Error("Failed to create payment intent");

        // 3. Send to POLi
        const auth = Buffer.from(`${process.env.POLI_MERCHANT_CODE}:${process.env.POLI_AUTH_CODE}`).toString('base64');

        const payload = {
            Amount: totalAmount.toFixed(2),
            CurrencyCode: "NZD",
            MerchantReference: `intent-${intent.id}`, // 🚀 Tells verify.js this is a bulk payment!
            MerchantHomepageURL: baseUrl,
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
            return NextResponse.json({ error: data.ErrorMessage || "POLi rejected the request" }, { status: 400 });
        }

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}