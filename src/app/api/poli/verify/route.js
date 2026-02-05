// import { NextResponse } from "next/server";
// import { supabase } from "../../../../lib/supabaseClient"; // adjust if needed

// function getBasicAuthHeader() {
//     const merchant = process.env.POLI_MERCHANT_CODE;
//     const auth = process.env.POLI_AUTH_CODE;
//     const token = Buffer.from(`${merchant}:${auth}`).toString("base64");
//     return `Basic ${token}`;
// }

// export async function POST(req) {
//     try {
//         const { bookingId, token } = await req.json();

//         if (!bookingId || !token) {
//             return NextResponse.json({ error: "Missing bookingId or token" }, { status: 400 });
//         }

//         const {
//             data: { user },
//         } = await supabase.auth.getUser();

//         if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

//         const { data: booking } = await supabase
//             .from("bookings")
//             .select("id, parent_id, amount_total, payment_status")
//             .eq("id", bookingId)
//             .single();

//         if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
//         if (booking.parent_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

//         const base = process.env.POLI_API_BASE_URL || process.env.POLI_API_BASE || "https://poliapi.apac.paywithpoli.com/api"; // :contentReference[oaicite:3]{index=3}

//         // Docs snippet indicates: GETTransaction with token in query string. :contentReference[oaicite:4]{index=4}
//         const url = `${base}/Transaction/GetTransaction?token=${encodeURIComponent(token)}`; // if path differs, change here

//         const poliRes = await fetch(url, {
//             method: "GET",
//             headers: {
//                 Authorization: getBasicAuthHeader(),
//                 Accept: "application/json",
//             },
//         });

//         const poliJson = await poliRes.json().catch(() => ({}));
//         if (!poliRes.ok) {
//             return NextResponse.json(
//                 { error: poliJson?.Message || poliJson?.error || "POLi verify failed", details: poliJson },
//                 { status: 502 }
//             );
//         }

//         // We must not assume exact field names. Handle common variants:
//         const status = String(poliJson?.TransactionStatus || poliJson?.Status || "").toLowerCase();
//         const amountPaid = Number(poliJson?.AmountPaid ?? poliJson?.Amount ?? NaN);

//         const expected = Number(booking.amount_total);

//         const isCompleted = status === "completed" || status === "success" || status === "paid";

//         // Conservative check: require completion AND amount match (within 1 cent)
//         const amountMatches =
//             Number.isFinite(amountPaid) && Math.abs(amountPaid - expected) < 0.01;

//         if (isCompleted && amountMatches) {
//             await supabase
//                 .from("bookings")
//                 .update({
//                     payment_status: "paid",
//                     paid_at: new Date().toISOString(),
//                 })
//                 .eq("id", booking.id);

//             return NextResponse.json({ ok: true, status: "paid" });
//         }

//         // If cancelled/failed, mark as unpaid (or keep pending if you prefer)
//         if (status === "cancelled" || status === "canceled" || status === "failed") {
//             await supabase
//                 .from("bookings")
//                 .update({ payment_status: "unpaid" })
//                 .eq("id", booking.id);
//         }

//         return NextResponse.json({
//             ok: false,
//             status: status || "unknown",
//             amountPaid: Number.isFinite(amountPaid) ? amountPaid : null,
//             expected,
//         });
//     } catch (e) {
//         return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
//     }
// }

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin"; // Ensure this path matches your file structure

export async function POST(request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        // 1. Ask POLi for transaction details using the token
        const auth = Buffer.from(
            `${process.env.POLI_MERCHANT_CODE}:${process.env.POLI_AUTH_CODE}`
        ).toString("base64");

        const poliResponse = await fetch(
            `${process.env.POLI_API_BASE_URL}/v2/Transaction/GetTransaction?token=${encodeURIComponent(token)}`,
            {
                method: "GET",
                headers: { Authorization: `Basic ${auth}` },
            }
        );

        const transaction = await poliResponse.json();

        if (!poliResponse.ok) {
            console.error("POLi GetTransaction failed:", transaction);
            return NextResponse.json({ error: "Failed to verify transaction" }, { status: 500 });
        }

        // 2. Check if the payment was actually successful
        const isSuccess = transaction.TransactionStatusCode === "Completed";

        const merchantRef = String(transaction.MerchantReference || "");

        // 3. Build update payload (used for both single and bulk)
        const updatePayload = {
            poli_status: transaction.TransactionStatusCode,
            poli_transaction_ref: transaction.TransactionRefNo,
            payment_method: "POLi",
        };

        if (isSuccess) {
            updatePayload.payment_status = "paid";
            updatePayload.paid_at = new Date().toISOString();
        }

        // Two supported references:
        // - booking-<uuid>  -> single booking
        // - intent-<uuid>   -> poli_payment_intents row (bulk pay)

        if (merchantRef.startsWith("intent-")) {
            const intentId = merchantRef.replace("intent-", "");

            const { data: intent, error: intentErr } = await supabaseAdmin
                .from("poli_payment_intents")
                .select("id, booking_ids")
                .eq("id", intentId)
                .single();

            if (intentErr || !intent?.id) {
                console.error("Intent lookup failed:", intentErr);
                return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
            }

            // Update intent for traceability
            await supabaseAdmin
                .from("poli_payment_intents")
                .update({
                    status: transaction.TransactionStatusCode,
                    poli_transaction_ref: transaction.TransactionRefNo,
                })
                .eq("id", intentId);

            if (isSuccess && Array.isArray(intent.booking_ids) && intent.booking_ids.length) {
                const { error: bulkErr } = await supabaseAdmin
                    .from("bookings")
                    .update(updatePayload)
                    .in("id", intent.booking_ids);

                if (bulkErr) {
                    console.error("Bulk booking update failed:", bulkErr);
                    return NextResponse.json({ error: "Failed to update bookings", details: bulkErr }, { status: 500 });
                }
            }

            return NextResponse.json({
                success: isSuccess,
                status: transaction.TransactionStatusCode,
                intentId,
                bookingIds: intent.booking_ids || [],
            });
        }

        // Default: single booking
        const bookingId = merchantRef.startsWith("booking-") ? merchantRef.replace("booking-", "") : merchantRef;

        const { error: dbError } = await supabaseAdmin
            .from("bookings")
            .update(updatePayload)
            .eq("id", bookingId);

        if (dbError) {
            console.error("Database update failed:", dbError);
            return NextResponse.json({ error: "Failed to update booking", details: dbError }, { status: 500 });
        }

        return NextResponse.json({ success: isSuccess, status: transaction.TransactionStatusCode, bookingId });

    } catch (err) {
        console.error("Verify API error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}