"use client";

/**
 * TutorBookingsList
 * Tutor-facing list view with:
 * - Student + subject + parent name
 * - Status + payment
 * - Accept/Reject (single) and optional series actions for recurring bookings
 * - Mark paid
 *
 * Booking shape is defined by tutor/dashboard/page.js loadBookings().
 */

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

const formatMoneyNZD = (n) => {
    const num = Number(n || 0);
    return `$${num.toFixed(2)} NZD`;
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

const modePillStyle = (mode) => {
    if (mode === "in_person") return pill("#f5f5f5", "#e0e0e0", "#333");
    return pill("#e9eefc", "#cdd9ff", "#1f7aea");
};

const actionBtnStyle = (kind = "default") => {
    const base = {
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid #ddd",
        background: "#fff",
        fontWeight: 900,
        cursor: "pointer",
        whiteSpace: "nowrap",
    };

    if (kind === "primary") return { ...base, border: "2px solid #111" };
    if (kind === "danger") return { ...base, border: "1px solid #f5c2c7", background: "#fdecea" };
    return base;
};

export default function TutorBookingsList({
    bookings,
    selectedBookingId,
    updatingKey,
    onAccept,
    onReject,
    onAcceptSeries,
    onRejectSeries,
    onMarkPaid,
    onMarkPaidSeries,
    onCancel,
}) {

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
                    const subjectName = b?.subjects?.name || "Subject";
                    const parentName = b?.parent?.full_name || "Parent";
                    const parentPhone = b?.parent?.phone_number || "";

                    const when = `${formatDate(b.session_date)} · ${formatTimeRange(b.start_time, b.end_time)}`;

                    const total = Number(b?.amount_total || 0);
                    const owed = b?.payment_status === "paid" ? 0 : total;

                    const status = String(b?.status || "unknown");
                    const payment = String(b?.payment_status || "unpaid");
                    const mode = b?.lesson_mode ? String(b.lesson_mode) : "";

                    const isSelected = selectedBookingId === b.id;

                    const isRecurring = !!b?.is_recurring && !!b?.recurring_group_id;
                    const canDecide = String(b?.status || "").toLowerCase() === "requested";
                    const canMarkPaid = (b?.payment_status || "unpaid") !== "paid";
                    const canCancel = String(b?.status || "").toLowerCase() === "accepted";

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
                                scrollMarginTop: 90,
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                <div>
                                    <div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.2 }}>
                                        {studentName} · {subjectName}

                                    </div>

                                    <div style={{ marginTop: 4, color: "#555", fontSize: 13 }}>{when}</div>

                                    <div style={{ marginTop: 4, color: "#777", fontSize: 13 }}>
                                        Parent: <span style={{ fontWeight: 900, color: "#111" }}>{parentName}</span>
                                        {parentPhone ? <span style={{ color: "#555" }}> · {parentPhone}</span> : null}
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    <span style={statusPillStyle(status)}>{status}</span>
                                    <span style={paymentPillStyle(payment)}>{payment}</span>
                                    {mode ? <span style={modePillStyle(mode)}>{mode === "in_person" ? "in person" : "online"}</span> : null}
                                    {isRecurring ? <span style={pill("#f3f4f6", "#e5e7eb", "#374151")}>series</span> : null}
                                </div>
                            </div>

                            {mode === "in_person" && b?.booking_address_text ? (
                                <div style={{ color: "#555", fontSize: 13 }}>
                                    Address: <span style={{ fontWeight: 800 }}>{b.booking_address_text}</span>
                                </div>
                            ) : null}

                            <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
                                <div style={{ fontWeight: 900 }}>Payment</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#333", fontSize: 13 }}>
                                    <div>
                                        <span style={{ color: "#666" }}>Total:</span> <span style={{ fontWeight: 900 }}>{formatMoneyNZD(total)}</span>
                                    </div>
                                    <div>
                                        <span style={{ color: "#666" }}>Owed:</span> <span style={{ fontWeight: 900 }}>{formatMoneyNZD(owed)}</span>
                                    </div>
                                    {b?.payment_method ? (
                                        <div>
                                            <span style={{ color: "#666" }}>Method:</span> <span style={{ fontWeight: 900 }}>{String(b.payment_method)}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                {canDecide ? (
                                    <>
                                        <button
                                            type="button"
                                            style={actionBtnStyle("primary")}
                                            disabled={updatingKey === `booking-${b.id}-accepted` || updatingKey === `group-${b.recurring_group_id}-accepted`}
                                            onClick={() => onAccept?.(b)}
                                        >
                                            {updatingKey === `booking-${b.id}-accepted` ? "Accepting…" : "Accept"}
                                        </button>

                                        <button
                                            type="button"
                                            style={actionBtnStyle("danger")}
                                            disabled={updatingKey === `booking-${b.id}-rejected` || updatingKey === `group-${b.recurring_group_id}-rejected`}
                                            onClick={() => onReject?.(b)}
                                        >
                                            {updatingKey === `booking-${b.id}-rejected` ? "Rejecting…" : "Reject"}
                                        </button>

                                        {isRecurring ? (
                                            <>
                                                <div style={{ width: 1, background: "#eee", margin: "0 2px" }} />
                                                <button
                                                    type="button"
                                                    style={actionBtnStyle()}
                                                    disabled={updatingKey === `group-${b.recurring_group_id}-accepted`}
                                                    onClick={() => onAcceptSeries?.(b)}
                                                >
                                                    {updatingKey === `group-${b.recurring_group_id}-accepted` ? "Accepting series…" : "Accept series"}
                                                </button>

                                                <button
                                                    type="button"
                                                    style={actionBtnStyle("danger")}
                                                    disabled={updatingKey === `group-${b.recurring_group_id}-rejected`}
                                                    onClick={() => onRejectSeries?.(b)}
                                                >
                                                    {updatingKey === `group-${b.recurring_group_id}-rejected` ? "Rejecting series…" : "Reject series"}
                                                </button>
                                            </>
                                        ) : null}
                                    </>
                                ) : (
                                    <div style={{ color: "#666", fontSize: 13 }}>
                                        This booking is <span style={{ fontWeight: 900 }}>{status}</span>.
                                    </div>
                                )}

                                {canMarkPaid ? (
                                    <>
                                        <div style={{ flex: 1 }} />
                                        <button
                                            type="button"
                                            style={actionBtnStyle()}
                                            disabled={updatingKey === `paid-${b.id}` || updatingKey === `paid-group-${b.recurring_group_id}`}
                                            onClick={() => onMarkPaid?.(b)}
                                        >
                                            {updatingKey === `paid-${b.id}` ? "Updating…" : "Mark paid"}
                                        </button>

                                        {isRecurring ? (
                                            <button
                                                type="button"
                                                style={actionBtnStyle()}
                                                disabled={updatingKey === `paid-group-${b.recurring_group_id}`}
                                                onClick={() => onMarkPaidSeries?.(b)}
                                            >
                                                {updatingKey === `paid-group-${b.recurring_group_id}` ? "Updating series…" : "Mark series paid"}
                                            </button>
                                        ) : null}
                                    </>
                                ) : null}

                                {canCancel ? (
                                    <button
                                        type="button"
                                        style={actionBtnStyle("danger")}
                                        disabled={updatingKey === `cancel-${b.id}`}
                                        onClick={() => onCancel?.(b)}
                                    >
                                        {updatingKey === `cancel-${b.id}` ? "Cancelling…" : "Cancel"}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
