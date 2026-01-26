import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function buildPoliInitiateBody({ amount, merchantReference }) {
    const homepageUrl = requireEnv("POLI_HOMEPAGE_URL").replace(/\/$/, "");
    const successUrl = requireEnv("POLI_SUCCESS_URL");
    const failureUrl = requireEnv("POLI_FAILURE_URL");
    const cancelUrl = process.env.POLI_CANCEL_URL || failureUrl;

    const notificationUrl = `${homepageUrl}/api/poli/nudge`;

    return {
        Amount: Number(amount).toFixed(2),
        CurrencyCode: "NZD",
        MerchantReference: merchantReference,

        MerchantHomepageURL: homepageUrl,
        NotificationURL: notificationUrl,

        SuccessURL: successUrl,
        SuccessUrl: successUrl,

        FailureURL: failureUrl,
        FailureUrl: failureUrl,

        CancellationURL: cancelUrl,
        CancellationUrl: cancelUrl,
    };
}


export async function POST(req) {
    try {
        const { bookingId } = await req.json();

        if (!bookingId) {
            return NextResponse.json({ ok: false, error: "Missing bookingId" }, { status: 400 });
        }

        // Server-side lookup of booking -> amount
        const supabase = createClient(
            requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
            requireEnv("SUPABASE_SERVICE_ROLE_KEY") // must exist in .env.local (server only)
        );

        const { data: booking, error: bookingErr } = await supabase
            .from("bookings")
            .select("amount_total") // <-- change this column name to whatever you actually store
            .eq("id", bookingId)
            .single();

        if (bookingErr || !booking) {
            return NextResponse.json(
                { ok: false, error: "Booking not found", details: bookingErr?.message },
                { status: 404 }
            );
        }

        const amount = booking.amount_total;

        const amountNumber = Number(amount);

        if (!Number.isFinite(amountNumber) || amountNumber < 0.01) {
            return NextResponse.json(
                { ok: false, error: "Invalid booking amount", amount },
                { status: 400 }
            );
        }
        console.log("booking row:", booking);

        const merchantReference = `booking-${bookingId}`;

        const baseUrl = requireEnv("POLI_API_BASE_URL").replace(/\/$/, "");
        const initiateBody = buildPoliInitiateBody({ amount, merchantReference });

        const authHeader = `Basic ${Buffer.from(
            `${requireEnv("POLI_MERCHANT_CODE")}:${requireEnv("POLI_AUTH_CODE")}`
        ).toString("base64")}`;

        console.log("POLi initiate payload:", JSON.stringify(initiateBody, null, 2));

        console.log("POLI INITIATE BODY", JSON.stringify(initiateBody, null, 2));


        const res = await fetch(`${baseUrl}/v2/Transaction/Initiate`, {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(initiateBody),
        });

        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { }

        if (!res.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: json?.ErrorMessage || json?.error || text || "POLi initiate failed",
                    status: res.status,
                    details: json,
                    sent: initiateBody,
                },
                { status: res.status }
            );
        }

        if (!json?.NavigateURL) {
            return NextResponse.json(
                { ok: false, error: "POLi response missing NavigateURL", details: json, sent: initiateBody },
                { status: 502 }
            );
        }

        return NextResponse.json({ ok: true, navigateUrl: json.NavigateURL });
    } catch (e) {
        return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
    }
}
