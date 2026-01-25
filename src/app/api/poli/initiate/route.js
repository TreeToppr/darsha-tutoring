import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

function requireEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing ${name}`);
    return v;
}

export async function POST(req) {
    try {
        const { bookingId } = await req.json();

        if (!bookingId) {
            return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }

        const POLI_MERCHANT_CODE = requireEnv("POLI_MERCHANT_CODE");
        const POLI_AUTH_CODE = requireEnv("POLI_AUTH_CODE");
        const POLI_API_BASE_URL = requireEnv("POLI_API_BASE_URL");
        const POLI_SUCCESS_URL = requireEnv("POLI_SUCCESS_URL");
        const POLI_FAILURE_URL = requireEnv("POLI_FAILURE_URL");
        const POLI_CANCEL_URL = requireEnv("POLI_CANCEL_URL");

        // 1) Fetch booking details (adjust select if your schema differs)
        const { data: booking, error: bErr } = await supabaseAdmin
            .from("bookings")
            .select(`
        id,
        session_date,
        start_time,
        end_time,
        price_cents,
        tutors:tutor_id (
          id,
          display_name
        ),
        parents:parent_id (
          id
        )
      `)
            .eq("id", bookingId)
            .single();

        if (bErr || !booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // You might store price as cents or dollars. Adjust here.
        const amountNZD =
            typeof booking.price_cents === "number"
                ? (booking.price_cents / 100).toFixed(2)
                : "0.00";

        // 2) Initiate POLi transaction
        // POLi expects basic auth. (POLi dashboard/docs tells you exact format/base URL)
        const basic = Buffer.from(`${POLI_MERCHANT_CODE}:${POLI_AUTH_CODE}`).toString("base64");

        const homepageUrl = requireEnv("POLI_HOMEPAGE_URL");
        const notificationUrl = `${homepageUrl.replace(/\/$/, "")}/api/poli/nudge`;

        const payload = {
            Amount: amountNZD,
            CurrencyCode: "NZD",

            // keep a single consistent format; your verify code expects "booking-<uuid>"
            MerchantReference: `booking-${booking.id}`,
            MerchantData: JSON.stringify({ bookingId: booking.id }),

            // POLi expects these exact field names
            MerchantHomepageURL: homepageUrl,
            NotificationURL: notificationUrl,

            SuccessURL: POLI_SUCCESS_URL,
            FailureURL: POLI_FAILURE_URL,
            CancellationURL: POLI_CANCEL_URL,
        };


        const poliRes = await fetch(`${POLI_API_BASE_URL.replace(/\/$/, "")}/v2/Transaction/Initiate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${basic}`,
            },
            body: JSON.stringify(payload),
        });

        const poliJson = await poliRes.json().catch(() => ({}));

        if (!poliRes.ok) {
            return NextResponse.json(
                { error: "POLi initiate failed", details: poliJson },
                { status: 500 }
            );
        }

        // Usually includes a NavigateURL / RedirectURL style field.
        const navigateUrl = poliJson?.NavigateURL || poliJson?.navigateUrl || poliJson?.RedirectURL;

        if (!navigateUrl) {
            return NextResponse.json(
                { error: "POLi response missing NavigateURL", details: poliJson },
                { status: 500 }
            );
        }

        return NextResponse.json({
            navigateUrl,
            poli: poliJson,
        });
    } catch (e) {
        return NextResponse.json(
            { error: e?.message || "Server error" },
            { status: 500 }
        );
    }
}
