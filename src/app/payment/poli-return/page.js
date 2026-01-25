// "use client";

// import { useEffect, useState } from "react";
// import { useSearchParams } from "next/navigation";

// export default function PoliReturnPage() {
//     const sp = useSearchParams();
//     const [msg, setMsg] = useState("Checking payment result...");

//     useEffect(() => {
//         // For now we just show what POLi returned in the URL.
//         // Next step (after this works) is: call /api/poli/status and mark booking paid/unpaid.
//         const result = sp.get("result"); // success | failure | cancel (we set this in our URLs)
//         if (result === "success") setMsg("Payment completed (pending verification).");
//         else if (result === "failure") setMsg("Payment failed.");
//         else if (result === "cancel") setMsg("Payment cancelled.");
//         else setMsg("Returned from POLi.");
//     }, [sp]);

//     return (
//         <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
//             <h1 style={{ fontSize: 28, marginBottom: 8 }}>POLi Payment</h1>
//             <p>{msg}</p>
//             <p style={{ marginTop: 16 }}>
//                 You can now return to the booking page or dashboard.
//             </p>
//             <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
//                 <a href="/parent/dashboard">Go to dashboard</a>
//                 <a href="/book">Back to booking</a>
//             </div>
//         </div>
//     );
// }

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// 1. Move your logic into this inner component
function ReturnContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState("verifying"); // verifying, success, failed, error

    useEffect(() => {
        const token = searchParams.get("token");

        if (!token) {
            setStatus("error");
            return;
        }

        async function verifyPayment() {
            try {
                const res = await fetch("/api/poli/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                const data = await res.json();

                if (data.success) {
                    setStatus("success");

                    // Redirect to dashboard after 2 seconds
                    setTimeout(() => {
                        // Adjust this path if you want to go to a specific booking
                        router.push("/parent/dashboard");
                    }, 2000);
                } else {
                    console.warn("Payment not completed:", data.status);
                    setStatus("failed");
                }
            } catch (err) {
                console.error("Verification error:", err);
                setStatus("error");
            }
        }

        verifyPayment();
    }, [searchParams, router]);

    return (
        <div style={{ padding: 40, textAlign: "center", minHeight: "60vh" }}>
            {status === "verifying" && <h2>Verifying your payment...</h2>}

            {status === "success" && (
                <div style={{ color: "green" }}>
                    <h1>Payment Successful!</h1>
                    <p>Redirecting you to your dashboard...</p>
                </div>
            )}

            {status === "failed" && (
                <div style={{ color: "red" }}>
                    <h1>Payment Failed or Cancelled</h1>
                    <p>Please try again.</p>
                </div>
            )}

            {status === "error" && (
                <div style={{ color: "red" }}>
                    <h1>Error</h1>
                    <p>Invalid or missing payment token.</p>
                </div>
            )}
        </div>
    );
}

// 2. Export the Main Page with Suspense
export default function PoliReturnPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading payment status...</div>}>
            <ReturnContent />
        </Suspense>
    );
}