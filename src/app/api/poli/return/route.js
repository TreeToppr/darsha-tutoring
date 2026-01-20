"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PoliReturnPage() {
    const sp = useSearchParams();
    const [state, setState] = useState({ loading: true, message: "Finalising payment..." });

    useEffect(() => {
        const run = async () => {
            // token name varies. Support several:
            const token =
                sp.get("token") || sp.get("TransactionToken") || sp.get("transactionToken") || sp.get("ref");

            const bookingId = sp.get("bookingId") || sp.get("booking_id");

            if (!token || !bookingId) {
                setState({ loading: false, message: "Missing payment details in return URL." });
                return;
            }

            const res = await fetch("/api/poli/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId, token }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                setState({ loading: false, message: "Payment successful. Your booking is now marked as PAID." });
            } else {
                setState({ loading: false, message: `Payment not completed (${data.status || "unknown"}).` });
            }
        };

        run();
    }, [sp]);

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>POLi Payment</h1>
            <p>{state.message}</p>
        </div>
    );
}
