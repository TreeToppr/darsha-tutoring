import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserIdFromBearer } from "../../google/_util";

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
        const body = await req.json().catch(() => ({}));
        const bookingId = body?.bookingId || null;
        const tutorId = body?.tutorId || null;
        const scope = String(body?.scope || "single");

        // Always require auth for POLi initiation.
        // (Yes, we use service role below, but we still verify the caller is signed in.)
        const userId = await requireUserIdFromBearer(req);

        // Server-side lookup of booking(s) -> amount
        const supabase = createClient(
            requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
            requireEnv("SUPABASE_SERVICE_ROLE_KEY") // must exist in .env.local (server only)
        );

        let amount = null;
        let merchantReference = null;

        if (bookingId) {
            const { data: booking, error: bookingErr } = await supabase
                .from("bookings")
                .select("id, parent_id, amount_total")
                .eq("id", bookingId)
                .single();

            if (bookingErr || !booking) {
                return NextResponse.json(
                    { ok: false, error: "Booking not found", details: bookingErr?.message },
                    { status: 404 }
                );
            }

            if (booking.parent_id !== userId) {
                return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
            }

            amount = booking.amount_total;
            merchantReference = `booking-${bookingId}`;
        } else if (tutorId && scope === "tutor_owed") {
            // Pay the full amount owed to a tutor (all unpaid accepted bookings for this parent + tutor).
            const { data: rows, error: rowsErr } = await supabase
                .from("bookings")
                .select("id, amount_total")
                .eq("parent_id", userId)
                .eq("tutor_id", tutorId)
                .in("status", ["accepted", "requested"])
                .neq("payment_status", "paid");

            if (rowsErr) {
                return NextResponse.json({ ok: false, error: rowsErr.message }, { status: 500 });
            }

            const bookingIds = (rows || []).map((r) => r.id);
            const total = (rows || []).reduce((sum, r) => sum + Number(r?.amount_total || 0), 0);

            if (!bookingIds.length || !(total > 0)) {
                return NextResponse.json({ ok: false, error: "Nothing to pay" }, { status: 400 });
            }

            // Create a lightweight payment intent row so nudge/verify can mark multiple bookings paid.
            const { data: intent, error: intentErr } = await supabase
                .from("poli_payment_intents")
                .insert({
                    parent_id: userId,
                    tutor_id: tutorId,
                    booking_ids: bookingIds,
                    amount_total: total,
                    status: "Created",
                })
                .select("id")
                .single();

            if (intentErr || !intent?.id) {
                return NextResponse.json({ ok: false, error: "Failed to create payment intent", details: intentErr?.message }, { status: 500 });
            }

            amount = total;
            merchantReference = `intent-${intent.id}`;
        } else {
            return NextResponse.json({ ok: false, error: "Missing bookingId (single) or tutorId+scope=tutor_owed" }, { status: 400 });
        }

        const amountNumber = Number(amount);

        if (!Number.isFinite(amountNumber) || amountNumber < 0.01) {
            return NextResponse.json(
                { ok: false, error: "Invalid booking amount", amount },
                { status: 400 }
            );
        }
        // Note: we don't log sensitive booking rows here.

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
