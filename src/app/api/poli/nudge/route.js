import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing ${name}`);
    return v;
}

export async function POST(request) {
    try {
        // POLi sends x-www-form-urlencoded with Token, so formData is correct
        const formData = await request.formData();
        const token = formData.get("Token");

        if (!token) return new Response("No Token", { status: 400 });

        const merchant = requireEnv("POLI_MERCHANT_CODE");
        const authCode = requireEnv("POLI_AUTH_CODE");
        const apiBase = requireEnv("POLI_API_BASE_URL").replace(/\/$/, "");

        const auth = Buffer.from(`${merchant}:${authCode}`).toString("base64");

        // POLi recommends you call GetTransaction when nudged :contentReference[oaicite:3]{index=3}
        const poliRes = await fetch(
            `${apiBase}/v2/Transaction/GetTransaction?token=${encodeURIComponent(token)}`,
            { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } }
        );

        const tx = await poliRes.json().catch(() => ({}));

        if (!poliRes.ok) {
            console.error("POLi Nudge GetTransaction failed:", tx);
            // Return 200 so POLi doesn't keep flagging delivery failures endlessly,
            // but log loudly so you can see it in Vercel logs.
            return new Response("OK", { status: 200 });
        }

        const status = tx?.TransactionStatusCode;
        const merchantRef = String(tx?.MerchantReference || "");
        const bookingId = merchantRef.startsWith("booking-")
            ? merchantRef.replace("booking-", "")
            : merchantRef;

        if (!bookingId) {
            console.error("No bookingId parsed from MerchantReference:", merchantRef);
            return new Response("OK", { status: 200 });
        }

        const updatePayload = {
            poli_status: status,
            poli_transaction_ref: tx?.TransactionRefNo || null,
            payment_method: "POLi",
        };

        if (status === "Completed") {
            updatePayload.payment_status = "paid";
            updatePayload.paid_at = new Date().toISOString();
        } else if (status === "Cancelled" || status === "Failed" || status === "TimedOut") {
            updatePayload.payment_status = "unpaid";
        }

        const { error } = await supabaseAdmin
            .from("bookings")
            .update(updatePayload)
            .eq("id", bookingId);

        if (error) {
            console.error("Nudge DB update failed:", error);
            // Still return 200 to POLi; your logs are the source of truth here.
        }

        return new Response("OK", { status: 200 });
    } catch (err) {
        console.error("Nudge handler error:", err);
        // Same idea: don't cause POLi to mark the endpoint as failing
        return new Response("OK", { status: 200 });
    }
}
