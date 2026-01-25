import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
    try {
        // POLi sends the Token inside the POST body directly
        const { Token } = await request.json();

        if (!Token) {
            console.warn("POLi Nudge received without Token");
            return NextResponse.json({ status: "No Token" }, { status: 400 });
        }

        console.log(`Received Nudge for Token: ${Token}`);

        // 1. Verify transaction with POLi
        const auth = Buffer.from(
            `${process.env.POLI_MERCHANT_CODE}:${process.env.POLI_AUTH_CODE}`
        ).toString("base64");

        const poliResponse = await fetch(
            `${process.env.POLI_API_BASE_URL}/v2/Transaction/GetTransaction?token=${encodeURIComponent(Token)}`,
            {
                method: "GET",
                headers: { Authorization: `Basic ${auth}` },
            }
        );

        const transaction = await poliResponse.json();

        if (!poliResponse.ok) {
            console.error("POLi Nudge verification failed:", transaction);
            return NextResponse.json({ status: "Failed to verify" }, { status: 500 });
        }

        // 2. Prepare Update
        // Note: We duplicate the logic from verify/route.js here to ensure robustness
        const isSuccess = transaction.TransactionStatusCode === "Completed";
        const bookingId = transaction.MerchantReference.replace("booking-", "");

        const updatePayload = {
            poli_status: transaction.TransactionStatusCode,
            poli_transaction_ref: transaction.TransactionRefNo,
            payment_method: "POLi",
        };

        if (isSuccess) {
            // CAUTION: Remember the "check constraint" issue! 
            // Do NOT set status="confirmed" if your DB doesn't allow it.
            // We only update payment fields to be safe.
            updatePayload.payment_status = "paid";
            updatePayload.paid_at = new Date().toISOString();
        }

        // 3. Update Supabase
        const { error: dbError } = await supabaseAdmin
            .from("bookings")
            .update(updatePayload)
            .eq("id", bookingId);

        if (dbError) {
            console.error("Nudge DB Update Error:", dbError);
            return NextResponse.json({ status: "DB Error" }, { status: 500 });
        }

        console.log(`Nudge processed successfully for Booking ${bookingId}`);
        return NextResponse.json({ status: "OK" });

    } catch (err) {
        console.error("Nudge Server Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}