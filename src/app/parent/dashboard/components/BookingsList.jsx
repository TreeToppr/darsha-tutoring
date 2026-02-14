"use client";

/**
 * BookingsList
 * Parent-facing list view of bookings with:
 * - status (requested/accepted/declined/cancelled)
 * - payment status + amount owed
 * - tutor + student + subject
 * - time/day
 * - tutor bank account info for manual transfer
 *
 * Expected booking shape comes from the parent dashboard loadBookings() select.
 */

const formatMoneyNZD = (n) => {
    const num = Number(n || 0);
    return `$${num.toFixed(2)} NZD`;
};

const formatDate = (ymd) => {
    if (!ymd) return "Date not set";
    const d = new Date(`${ymd}T00:00:00`);
    return d.toLocaleDateString("en-NZ", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const formatTimeRange = (start, end) => {
    const s = start ? String(start).slice(0, 5) : "";
    const e = end ? String(end).slice(0, 5) : "";
    if (!s || !e) return "Time not set";
    return `${s} - ${e}`;
};

const pill = (bg, border, colour) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: bg,
    border: `1px solid ${border}`,
    color: colour,
    whiteSpace: "nowrap",
});

const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(String(text || ""));
        return true;
    } catch {
        return false;
    }
};

const statusPillStyle = (status) => {
    if (status === "accepted") return pill("#e9f7ef", "#b7e1c5", "#1b5e20");
    if (status === "requested") return pill("#fff7e6", "#ffe0a3", "#8a5a00");
    if (status === "declined" || status === "rejected") return pill("#fdecea", "#f5c2c7", "#8a1f11");
    if (status === "cancelled") return pill("#f5f5f5", "#e0e0e0", "#555");
    return pill("#eef2ff", "#c7d2fe", "#1f3a8a");
};

const paymentPillStyle = (paymentStatus) => {
    if (paymentStatus === "paid") return pill("#e9f7ef", "#b7e1c5", "#1b5e20");
    return pill("#fff7e6", "#ffe0a3", "#8a5a00");
};

export default function BookingsList({ bookings, selectedBookingId, onCancel, onPayNow }) {
    const rows = Array.isArray(bookings) ? bookings : [];

    if (!rows.length) {
        return (
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Bookings</div>
                <div style={{ marginTop: 8, color: "#666" }}>No bookings yet.</div>
            </div>
        );
    }

    return (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Bookings</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {rows.map((b) => {
                    const studentName = b?.students?.full_name || "Student";
                    const tutorName = b?.tutors?.display_name || "Tutor";
                    const subjectName = b?.subjects?.name || "Subject";
                    const when = `${formatDate(b.session_date)} · ${formatTimeRange(b.start_time, b.end_time)}`;

                    // Amount owed rule (simple and honest):
                    // - If payment_status === "paid", owed is 0
                    // - Otherwise owed = amount_total (if present)
                    const total = Number(b?.amount_total || 0);

                    const status = String(b?.status || "").toLowerCase();
                    const payStatus = String(b?.payment_status || "unpaid").toLowerCase();

                    // New rule: allow paying requested + accepted (but never rejected/declined/cancelled)
                    const isPayable =
                        ["accepted", "requested"].includes(status) &&
                        payStatus !== "paid" &&
                        total > 0;

                    const owed = isPayable ? total : 0;
                    const canPayNow = isPayable;

                    const bankMasked = b?.tutors?.bank_account_masked || "";
                    const bankFull = b?.tutors?.tutor_payment_details?.bank_account || "";
                    const payeeName = b?.tutors?.tutor_payment_details?.payee_name || "";

                    const tutorEmail = b?.tutors?.email || "";
                    const tutorPhone = b?.tutors?.phone || "";

                    const isSelected = selectedBookingId === b.id;

                    return (
                        <div
                            key={b.id}
                            id={`booking-${b.id}`}
                            style={{
                                border: isSelected ? "2px solid #111" : "1px solid #eee",
                                boxShadow: isSelected ? "0 8px 22px rgba(0,0,0,0.08)" : "none",
                                borderRadius: 14,
                                padding: 14,
                                display: "grid",
                                gap: 10,
                                scrollMarginTop: 90, // helps when you scroll to it
                            }}
                        >
                            {/* Top line */}
                            {/* Top line */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 12,
                                }}
                            >
                                {/* Left: booking info */}
                                <div>
                                    <div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.2 }}>
                                        {studentName} · {subjectName}
                                    </div>

                                    <div style={{ marginTop: 4, color: "#555", fontSize: 13 }}>{when}</div>

                                    <div style={{ marginTop: 4, color: "#777", fontSize: 13 }}>
                                        Tutor: <span style={{ fontWeight: 800, color: "#111" }}>{tutorName}</span>
                                    </div>
                                </div>

                                {/* Right: status pills + cancel button (all aligned together) */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        flexWrap: "wrap",
                                        justifyContent: "flex-end",
                                    }}
                                >
                                    <span style={statusPillStyle(b.status)}>{String(b.status || "unknown")}</span>
                                    <span style={paymentPillStyle(b.payment_status)}>{String(b.payment_status || "unpaid")}</span>

                                    {b.status !== "cancelled" ? (
                                        <button
                                            type="button"
                                            onClick={() => onCancel?.(b)}
                                            style={{
                                                padding: "7px 10px",
                                                borderRadius: 10,
                                                border: "1px solid #ddd",
                                                background: "#fff",
                                                fontWeight: 900,
                                                cursor: "pointer",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    ) : null}
                                </div>
                            </div>


                            {/* Payment info */}
                            <div
                                style={{
                                    background: "#fafafa",
                                    border: "1px solid #eee",
                                    borderRadius: 12,
                                    padding: 12,
                                    display: "grid",
                                    gap: 6,
                                }}
                            >
                                <div style={{ fontWeight: 900 }}>Payment</div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 12,
                                        color: "#333",
                                        fontSize: 13,
                                    }}
                                >
                                    {/* LEFT side */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                                        <div>
                                            <span style={{ color: "#666" }}>Total:</span>{" "}
                                            <span style={{ fontWeight: 900 }}>{formatMoneyNZD(total)}</span>
                                        </div>

                                        <div>
                                            <span style={{ color: "#666" }}>Owed:</span>{" "}
                                            <span style={{ fontWeight: 900 }}>{formatMoneyNZD(owed)}</span>
                                        </div>
                                    </div>

                                    {/* RIGHT side */}
                                    {canPayNow ? (
                                        <button
                                            type="button"
                                            onClick={() => onPayNow?.(b)}
                                            style={{
                                                padding: "7px 10px",
                                                borderRadius: 10,
                                                border: "1px solid #1f7aea",
                                                background: "#1f7aea",
                                                color: "#fff",
                                                fontWeight: 900,
                                                cursor: "pointer",
                                                whiteSpace: "nowrap",
                                            }}
                                            title="Pay this lesson"
                                        >
                                            Pay (POLi)
                                        </button>
                                    ) : null}
                                </div>


                                {/* Bank transfer details (only show if unpaid and we have a bank account) */}
                                {/* {owed > 0 && (bankFull || bankMasked) ? (
                                    <div style={{ marginTop: 6, color: "#444", fontSize: 13 }}>
                                        <div style={{ fontWeight: 900, marginBottom: 4 }}>Bank transfer details</div>

                                        {payeeName ? (
                                            <div>
                                                Payee: <span style={{ fontWeight: 900 }}>{payeeName}</span>
                                            </div>
                                        ) : null}

                                        <div>
                                            Bank account:{" "}
                                            <span style={{ fontWeight: 900 }}>
                                                {bankFull || bankMasked}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: 6, color: "#666" }}>
                                            Reference: <span style={{ fontFamily: "monospace" }}>{b.id}</span>
                                        </div>

                                        {(tutorEmail || tutorPhone) ? (
                                            <div style={{ marginTop: 6, color: "#666" }}>
                                                {tutorEmail ? <div>Email: {tutorEmail}</div> : null}
                                                {tutorPhone ? <div>Phone: {tutorPhone}</div> : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null} */}

                            </div>

                            {/* Meta row (recurring flag etc) */}
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", color: "#666", fontSize: 12 }}>
                                {b.lesson_mode ? <span>Mode: {String(b.lesson_mode)}</span> : null}
                                {b.is_recurring ? <span>Recurring: Yes</span> : <span>Recurring: No</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
