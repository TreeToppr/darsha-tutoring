import React, { useState } from "react";

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
    onSelectCash,
    onPayWithCredit,
    creditBalance,
    onCopied,
    onCopyFailed,
}) {
    if (!payment) return null;

    const studentName = (payment.studentName || "").trim();
    const sessionDate = payment.sessionDate || "";
    const lessonMode = payment.lessonMode || "online";

    // Step 1: choose payment option, then show details.
    // - bank_transfer: show POLi button + bank details (parents can still do manual transfer)
    // - cash: in-person only
    const [paymentChoice, setPaymentChoice] = useState(null); // null | "pay_now" | "cash"
    const canPayCash = lessonMode === "in_person";

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

    const handleDone = () => {
        if (typeof onDone === "function") return onDone();
        if (typeof onClose === "function") return onClose();
    };

    const handleChoosePayNow = async () => {
        setPaymentChoice("pay_now");

        // UX: choosing Pay now should immediately start the POLi flow.
        // If bookingId is missing, we cannot redirect.
        if (typeof onStartPoliPay === "function" && payment?.bookingId) {
            await onStartPoliPay(payment.bookingId);
        }
    };

    const handleChooseCash = async () => {
        setPaymentChoice("cash");

        // Best-effort: store cash choice, then close.
        if (typeof onSelectCash === "function" && payment?.bookingId) {
            await onSelectCash(payment.bookingId);
        }

        handleDone();
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
            // onClick={onClose}
            onClick={() => {
                // Do not allow dismiss until a payment option is chosen
                if (paymentChoice) onClose?.();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Payment details"
        >
            <div
                onClick={(e) => e.stopPropagation()}
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

                    {/* POLi is shown only after user selects Bank transfer */}
                    {/* {paymentChoice === "pay_now" && typeof onStartPoliPay === "function" && payment.bookingId ? (
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
                    ) : null} */}

                    {/* <button
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
                    </button> */}
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
                        {paymentChoice === "cash" ? "Cash" : paymentChoice === "pay_now" ? "Pay now" : "Choose payment"}
                    </span>

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

                {/* Step 1: payment choice */}
                <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
                    <div style={{ fontWeight: 900 }}>Choose payment option</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={handleChoosePayNow}
                            style={{
                                border: paymentChoice === "pay_now" ? "1px solid #111" : "1px solid #ddd",
                                background: "#fff",
                                borderRadius: 10,
                                padding: "10px 12px",
                                cursor: "pointer",
                                fontWeight: 900,
                            }}
                        >
                            Pay now (POLi)
                        </button>

                        {canPayCash ? (
                            <button
                                type="button"
                                onClick={handleChooseCash}
                                style={{
                                    border: paymentChoice === "cash" ? "1px solid #111" : "1px solid #ddd",
                                    background: "#fff",
                                    borderRadius: 10,
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    fontWeight: 900,
                                }}
                            >
                                Cash (in person)
                            </button>
                        ) : null}

                        {/* {paymentChoice ? (
                            <button
                                type="button"
                                onClick={() => setPaymentChoice(null)}
                                style={{
                                    border: "1px solid #eee",
                                    background: "transparent",
                                    borderRadius: 10,
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    fontWeight: 900,
                                    color: "#555",
                                }}
                                title="Change payment option"
                            >
                                Change
                            </button>
                        ) : null} */}
                    </div>

                    {!canPayCash ? (
                        <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
                            Cash is only available for <strong>in person</strong> lessons.
                        </div>
                    ) : null}

                    {paymentChoice === null ? (
                        <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
                            If you choose <strong>Bank transfer</strong>, you can pay manually or use <strong>POLi</strong>.
                        </div>
                    ) : null}
                </div>

                {/* Step 2: show details based on choice */}
                {/* {paymentChoice === "bank_transfer" ? (
                    <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}>
                        <div style={{ fontWeight: 900 }}>Bank transfer details</div>

                        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 6, columnGap: 10, fontSize: 14 }}>
                            <div style={{ color: "#666", fontWeight: 800 }}>Account</div>
                            <div style={{ fontWeight: 900 }}>{accountText}</div>

                            <div style={{ color: "#666", fontWeight: 800 }}>Reference</div>
                            <div style={{ fontWeight: 900 }}>{referenceText}</div>
                        </div>

                        <div style={{ marginTop: 10, color: "#555", fontSize: 13 }}>
                            After payment, the tutor will mark the booking as <strong>PAID</strong>.
                            {typeof onStartPoliPay === "function" && payment.bookingId ? (
                                <>
                                    <br />
                                    Prefer instant confirmation? Use the <strong>Pay with POLi</strong> button at the top.
                                </>
                            ) : null}
                        </div>
                    </div>
                ) : null} */}
                {paymentChoice === "pay_now" ? (
                    <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}>
                        <div style={{ fontWeight: 900 }}>Pay now (POLi)</div>
                        <div style={{ marginTop: 8, color: "#555", fontSize: 13 }}>
                            You’ll be redirected to your bank to confirm payment. Once completed, your booking will be marked as paid automatically.

                        </div>
                        {/* POLi is shown only after user selects Bank transfer */}
                        {paymentChoice === "pay_now" && typeof onStartPoliPay === "function" && payment.bookingId ? (
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
                    </div>
                ) : null}

                {paymentChoice === "cash" ? (
                    <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}>
                        <div style={{ fontWeight: 900 }}>Cash (in person)</div>
                        <div style={{ marginTop: 8, color: "#555", fontSize: 13 }}>
                            Pay cash at the lesson time, if agreed with the tutor.
                        </div>
                    </div>
                ) : null}

                <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {/* {paymentChoice === "bank_transfer" ? (
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
                    ) : null} */}

                    {/* <button
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
                    </button> */}
                </div>
            </div>
        </div>
    );
}
