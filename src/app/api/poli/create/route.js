// import { NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// function requireEnv(name) {
//     const v = process.env[name];
//     if (!v) throw new Error(`Missing env var: ${name}`);
//     return v;
// }

// function buildPoliInitiateBody({ amount, merchantReference }) {
//     const homepageUrl = requireEnv("POLI_HOMEPAGE_URL");
//     const successUrl = requireEnv("POLI_SUCCESS_URL");
//     const failureUrl = requireEnv("POLI_FAILURE_URL");
//     const cancelUrl = process.env.POLI_CANCEL_URL || failureUrl;

//     return {
//         Amount: Number(amount).toFixed(2),
//         CurrencyCode: "NZD",
//         MerchantReference: merchantReference,

//         // keep the variants if you want (harmless):
//         HomepageURL: homepageUrl,
//         HomePageURL: homepageUrl,
//         HomepageUrl: homepageUrl,
//         HomePageUrl: homepageUrl,

//         SuccessURL: successUrl,
//         SuccessUrl: successUrl,

//         FailureURL: failureUrl,
//         FailureUrl: failureUrl,

//         CancellationURL: cancelUrl,
//         CancellationUrl: cancelUrl,
//     };
// }

// export async function POST(req) {
//     try {
//         const { bookingId } = await req.json();

//         if (!bookingId) {
//             return NextResponse.json({ ok: false, error: "Missing bookingId" }, { status: 400 });
//         }

//         // Server-side lookup of booking -> amount
//         const supabase = createClient(
//             requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
//             requireEnv("SUPABASE_SERVICE_ROLE_KEY") // must exist in .env.local (server only)
//         );

//         const { data: booking, error: bookingErr } = await supabase
//             .from("bookings")
//             .select("amount_total") // <-- change this column name to whatever you actually store
//             .eq("id", bookingId)
//             .single();

//         if (bookingErr || !booking) {
//             return NextResponse.json(
//                 { ok: false, error: "Booking not found", details: bookingErr?.message },
//                 { status: 404 }
//             );
//         }

//         const amount = booking.amount_total;

//         const amountNumber = Number(amount);

//         if (!Number.isFinite(amountNumber) || amountNumber < 0.01) {
//             return NextResponse.json(
//                 { ok: false, error: "Invalid booking amount", amount },
//                 { status: 400 }
//             );
//         }
//         console.log("booking row:", booking);

//         const merchantReference = `booking-${bookingId}`;

//         const baseUrl = requireEnv("POLI_API_BASE_URL").replace(/\/$/, "");
//         const initiateBody = buildPoliInitiateBody({ amount, merchantReference });

//         const authHeader = `Basic ${Buffer.from(
//             `${requireEnv("POLI_MERCHANT_CODE")}:${requireEnv("POLI_AUTH_CODE")}`
//         ).toString("base64")}`;

//         const res = await fetch(`${baseUrl}/Transaction/Initiate`, {
//             method: "POST",
//             headers: {
//                 Authorization: authHeader,
//                 "Content-Type": "application/json",
//                 Accept: "application/json",
//             },
//             body: JSON.stringify(initiateBody),
//         });

//         const text = await res.text();
//         let json = null;
//         try { json = JSON.parse(text); } catch { }

//         if (!res.ok) {
//             return NextResponse.json(
//                 {
//                     ok: false,
//                     error: json?.ErrorMessage || json?.error || text || "POLi initiate failed",
//                     status: res.status,
//                     details: json,
//                     sent: initiateBody,
//                 },
//                 { status: res.status }
//             );
//         }

//         if (!json?.NavigateURL) {
//             return NextResponse.json(
//                 { ok: false, error: "POLi response missing NavigateURL", details: json, sent: initiateBody },
//                 { status: 502 }
//             );
//         }

//         return NextResponse.json({ ok: true, navigateUrl: json.NavigateURL });
//     } catch (e) {
//         return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
//     }
// }


import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin"; // Use admin client to ensure we can read the booking

export async function POST(request) {
    try {
        const body = await request.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }

        // 1. Fetch booking details
        const { data: booking, error: dbError } = await supabaseAdmin
            .from("bookings")
            .select("id, amount_total, status")
            .eq("id", bookingId)
            .single();

        if (dbError || !booking) {
            console.error("Database error fetching booking:", dbError);
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // 2. Validate and Format Amount
        // SAFETY CHECK: Ensure amount exists. If your DB stores CENTS, change this line to:
        // const amountValue = booking.amount_total / 100;
        const amountValue = booking.amount_total;

        if (amountValue === null || amountValue === undefined || isNaN(amountValue)) {
            console.error(`Invalid amount for booking ${bookingId}:`, booking.amount_total);
            return NextResponse.json({ error: "Booking amount is invalid or zero" }, { status: 400 });
        }

        // POLi requires a string formatted to 2 decimal places (e.g., "40.00")
        const formattedAmount = Number(amountValue).toFixed(2);

        // 3. Build POLi Payload
        // CRITICAL FIX: The field name is "MerchantHomepageURL", NOT "HomepageURL"
        const poliPayload = {
            Amount: formattedAmount,
            CurrencyCode: "NZD",
            MerchantReference: `booking-${booking.id}`.substring(0, 80), // Ensure we don't exceed max length
            MerchantHomepageURL: process.env.POLI_HOMEPAGE_URL || "http://localhost:3000",
            SuccessURL: process.env.POLI_SUCCESS_URL,
            FailureURL: process.env.POLI_FAILURE_URL,
            CancellationURL: process.env.POLI_CANCEL_URL,
            // NotificationURL is highly recommended for server-to-server confirmation (The "Nudge")
            NotificationURL: `${process.env.POLI_HOMEPAGE_URL}/api/poli/nudge`
        };

        console.log("Sending to POLi:", JSON.stringify(poliPayload, null, 2));

        // 4. Call POLi API
        const auth = Buffer.from(
            `${process.env.POLI_MERCHANT_CODE}:${process.env.POLI_AUTH_CODE}`
        ).toString("base64");

        const response = await fetch(`${process.env.POLI_API_BASE_URL}/v2/Transaction/Initiate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify(poliPayload),
        });

        const result = await response.json();

        if (!response.ok || result.Success === false) {
            console.error("POLi API Error:", result);
            return NextResponse.json(
                { error: result.ErrorMessage || "POLi transaction failed", code: result.ErrorCode },
                { status: 400 }
            );
        }

        // 5. Success - Return the NavigateURL
        return NextResponse.json({
            navigateUrl: result.NavigateURL,
            transactionRef: result.TransactionRefNo
        });

    } catch (err) {
        console.error("Server error initiating POLi:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}