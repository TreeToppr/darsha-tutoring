import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient"; // adjust if your path differs

function getBasicAuthHeader() {
    const merchant = process.env.POLI_MERCHANT_CODE;
    const auth = process.env.POLI_AUTH_CODE;
    if (!merchant || !auth) throw new Error("Missing POLI credentials in env.");
    const token = Buffer.from(`${merchant}:${auth}`).toString("base64");
    return `Basic ${token}`;
}

/**
 * We keep POLi-specific field names isolated here.
 * If your POLi dashboard/docs use slightly different names, you edit this one function.
 */
function buildPoliInitiateBody({ amount, merchantReference }) {
    return {
        Amount: Number(amount).toFixed(2),
        CurrencyCode: process.env.POLI_CURRENCY_CODE || "NZD",
        MerchantReference: merchantReference,
        SuccessURL: process.env.POLI_SUCCESS_URL,
        FailureURL: process.env.POLI_FAILURE_URL,
    };
}

export async function POST(req) {
    try {
        const { bookingId } = await req.json();

        if (!bookingId) {
            return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }

        // 1) Identify user (security)
        const {
            data: { user },
            error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // 2) Load booking and verify ownership
        const { data: booking, error: bookingErr } = await supabase
            .from("bookings")
            .select("id, parent_id, amount_total, payment_status")
            .eq("id", bookingId)
            .single();

        if (bookingErr || !booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        if (booking.parent_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (String(booking.payment_status).toLowerCase() === "paid") {
            return NextResponse.json({ error: "Already paid" }, { status: 400 });
        }

        const amount = Number(booking.amount_total);
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        // 3) Initiate with POLi
        const base = process.env.POLI_API_BASE || "https://poliapi.apac.paywithpoli.com/api"; // :contentReference[oaicite:1]{index=1}
        const url = `${base}/Transaction/Initiate`; // if this path differs in your account/docs, change here

        const merchantReference = `booking-${booking.id}`;

        const poliRes = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: getBasicAuthHeader(), // :contentReference[oaicite:2]{index=2}
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(buildPoliInitiateBody({ amount, merchantReference })),
        });

        const poliJson = await poliRes.json().catch(() => ({}));
        if (!poliRes.ok) {
            return NextResponse.json(
                { error: poliJson?.Message || poliJson?.error || "POLi initiate failed", details: poliJson },
                { status: 502 }
            );
        }

        // Common patterns: RedirectURL + TransactionToken OR NavigateURL, etc.
        const redirectUrl =
            poliJson?.NavigateURL || poliJson?.RedirectURL || poliJson?.TransactionURL;

        const token =
            poliJson?.TransactionToken || poliJson?.Token || poliJson?.TransactionRefNo;

        if (!redirectUrl) {
            return NextResponse.json(
                { error: "POLi response missing redirect URL", details: poliJson },
                { status: 502 }
            );
        }

        // 4) Save token/reference on booking
        await supabase
            .from("bookings")
            .update({
                payment_method: "poli",
                payment_status: "pending",
                poli_token: token || null,
                poli_transaction_ref: merchantReference,
            })
            .eq("id", booking.id);

        return NextResponse.json({ redirectUrl });
    } catch (e) {
        return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
    }
}
