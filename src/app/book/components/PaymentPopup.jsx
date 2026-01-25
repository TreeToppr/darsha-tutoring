import React from "react";

/**
 * PaymentPopup
 * Purpose: Show payment instructions after a booking is requested.
 *
 * Design notes:
 * - UI-only: no Supabase calls here.
 * - Parent page controls open/close via `payment` object.
 * - All side effects (POLi call, toast messages) are delegated via callbacks.
 */
export default function PaymentPopup({
    payment,
    formatISO,
    buildPaymentCopyText,
    onClose,
    onDone,
    onStartPoliPay,
    onPayWithCredit,
    creditBalance,
    onCopied,
    onCopyFailed,
}) {
    // Guardrail: if no payment object, render nothing.
    if (!payment) return null;

    const studentName = (payment.studentName || "").trim();
    const sessionDate = payment.sessionDate || "";
    const lessonMode = payment.lessonMode || "online";

    const accountText = "00-0000-0000000-00";
    const referenceText = `${studentName || "Student"}${sessionDate ? ` ${sessionDate}` : ""}`;

    const handleCopy = async () => {
        try {
            const text = buildPaymentCopyText ? buildPaymentCopyText(payment) : "";
            await navigator.clipboard.writeText(text);
            if (onCopied) onCopied();
        } catch {
            if (onCopyFailed) onCopyFailed();
        }
    };

    // "Done" can optionally do something extra (e.g., navigate to dashboard)
    // while keeping close behaviour available for overlay/X clicks.
    const handleDone = () => {
        if (typeof onDone === "function") return onDone();
        if (typeof onClose === "function") return onClose();
    };

    return (
        <div
            style={{
                position: "fixed",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.35)",
                zIndex: 10000,
                padding: 16,
            }}
            onClick={onClose} // Clicking overlay closes
            role="dialog"
            aria-modal="true"
            aria-label="Payment details"
        >
            <div
                onClick={(e) => e.stopPropagation()} // Prevent overlay-close on inner click
                style={{
                    width: "100%",
                    maxWidth: 520,
                    background: "#fff",
                    borderRadius: 12,
                    padding: 18,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                }}
            >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>Booking requested</div>
                        <div style={{ marginTop: 4, color: "#555", fontSize: 13 }}>
                            {studentName ? `${studentName} • ` : ""}
                            {sessionDate && formatISO ? formatISO(sessionDate) : sessionDate}
                        </div>
                    </div>

                    {/* Optional POLi button (only if you pass handler + bookingId exists) */}
                    {typeof onStartPoliPay === "function" && payment.bookingId ? (
                        <button
                            type="button"
                            onClick={() => onStartPoliPay(payment.bookingId)}
                            style={{
                                marginTop: 12,
                                border: "none",
                                background: "#1f7aea",
                                color: "#fff",
                                borderRadius: 10,
                                padding: "10px 12px",
                                cursor: "pointer",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                            }}
                            title="Pay securely with POLi"
                        >
                            Pay with POLi
                        </button>
                    ) : null}

                    {/* <button
                        onClick={onStartPoliPay}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #0b5fff",
                            background: "#0b5fff",
                            color: "white",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        Pay with POLi
                    </button> */}

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: "1px solid #eee",
                            background: "#fff",
                            borderRadius: 10,
                            padding: "6px 10px",
                            cursor: "pointer",
                            fontWeight: 800,
                        }}
                        aria-label="Close payment popup"
                    >
                        ✕
                    </button>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span
                        style={{
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 900,
                            border: "1px solid #ffe0a3",
                            background: "#fff7e6",
                            color: "#8a5a00",
                        }}
                    >
                        UNPAID
                    </span>

                    <span
                        style={{
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 900,
                            border: "1px solid #cdd9ff",
                            background: "#e9eefc",
                            color: "#1f7aea",
                        }}
                    >
                        Bank transfer
                    </span>

                    {/* <div style={{ marginTop: 10, fontSize: 13, color: "#555" }}>
                        Credit balance: <strong>${Number(creditBalance || 0).toFixed(2)}</strong> NZD
                    </div> */}

                    <span
                        style={{
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 900,
                            border: "1px solid #eee",
                            background: "#fafafa",
                            color: "#444",
                        }}
                    >
                        {lessonMode === "in_person" ? "In person" : "Online"}
                    </span>
                </div>

                {typeof payment.amountTotal === "number" ? (
                    <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}>
                        <div style={{ fontWeight: 900 }}>Total to pay</div>
                        <div style={{ marginTop: 6, fontSize: 16, fontWeight: 900 }}>${payment.amountTotal}</div>

                        <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
                            ${payment.amountBase} (base)
                            {payment.lessonMode === "in_person" ? ` + $${payment.amountTravel} (travel)` : ""}
                        </div>
                    </div>
                ) : null}

                <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
                    <div style={{ fontWeight: 900 }}>Bank transfer</div>

                    <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 6, columnGap: 10, fontSize: 14 }}>
                        <div style={{ color: "#666", fontWeight: 800 }}>Account</div>
                        <div style={{ fontWeight: 900 }}>{accountText}</div>

                        <div style={{ color: "#666", fontWeight: 800 }}>Reference</div>
                        <div style={{ fontWeight: 900 }}>{referenceText}</div>
                    </div>

                    <div style={{ marginTop: 10, color: "#555", fontSize: 13 }}>
                        After payment, the tutor will mark the booking as <strong>PAID</strong>.
                    </div>
                </div>

                <div style={{ marginTop: 10, color: "#555", fontSize: 13 }}>
                    Cash in person is also possible <strong>if agreed</strong>.
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {/* {typeof onPayWithCredit === "function" &&
                        payment.bookingId &&
                        typeof payment.amountTotal === "number" &&
                        creditBalance >= payment.amountTotal ? (
                        <button
                            type="button"
                            onClick={() => onPayWithCredit(payment.bookingId)}
                            style={{
                                border: "none",
                                background: "#00A45F",
                                color: "#fff",
                                borderRadius: 10,
                                padding: "10px 12px",
                                cursor: "pointer",
                                fontWeight: 900,
                            }}
                            title="Use your credit balance to pay for this booking"
                        >
                            Pay with credit (${payment.amountTotal})
                        </button>
                    ) : null} */}

                    <button
                        type="button"
                        onClick={handleCopy}
                        style={{
                            border: "1px solid #ddd",
                            background: "#fff",
                            borderRadius: 10,
                            padding: "10px 12px",
                            cursor: "pointer",
                            fontWeight: 900,
                        }}
                    >
                        Copy payment details
                    </button>

                    <button
                        type="button"
                        onClick={handleDone}
                        style={{
                            border: "none",
                            background: "#1f7aea",
                            color: "#fff",
                            borderRadius: 10,
                            padding: "10px 12px",
                            cursor: "pointer",
                            fontWeight: 900,
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}