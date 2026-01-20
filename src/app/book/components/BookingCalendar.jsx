import React, { useState } from "react";

/**
 * BookingCalendar
 * Purpose:
 * - Render the weekly booking grid (Mon-Sun, 30-min slices).
 * - Show availability (white), unavailable (grey),
 *   your bookings (yellow/green), other bookings (purple),
 *   and a single-outline hover preview for a 60-min lesson.
 *
 * Notes:
 * - UI-only. No Supabase calls here.
 * - Parent owns selectedCell + modal state. We call callbacks.
 */
export default function BookingCalendar({
    weekDays = [],
    hours = [],
    slotsByDate = {},

    bookingsByDate = {},
    otherBookingsByDate = {},

    loadingWeek = false,
    selectedStudentId = "",

    // Formatting helpers from parent
    formatISO,
    minutesToTime,
    timeToMinutes,

    // Status helper from parent
    statusToBucket,

    // Actions
    onCellClick, // ({ date, start }) => void
    onHoverRange, // optional: (range|null) => void
}) {
    const isLoading = loadingWeek;

    // Internal hover preview state (keeps BookPage cleaner)
    const [hoverPreview, setHoverPreview] = useState(null); // { date, start, end }
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

    const findOverlapAtMinute = (list, minute) => {
        return (list || []).find((b) => {
            const bs = timeToMinutes(String(b.start_time).slice(0, 5));
            const be = timeToMinutes(String(b.end_time).slice(0, 5));
            if (bs == null || be == null) return false;
            return minute >= bs && minute < be;
        });
    };

    const getCellLabel = ({ isAvailable, myBooking, otherBooking }) => {
        if (myBooking) {
            const bucket = statusToBucket(myBooking.status);

            // Try to show student name for requested blocks (best-effort)
            const studentName =
                myBooking?.students?.full_name ||
                myBooking?.student_name ||
                "";

            if (bucket === "requested") {
                return studentName ? `REQUESTED - ${studentName}` : "REQUESTED";
            }

            if (bucket === "accepted") {
                return studentName ? `ACCEPTED - ${studentName}` : "ACCEPTED";
            }

            return studentName ? `BOOKED - ${studentName}` : "BOOKED";
        }

        if (otherBooking) return "BOOKED";
        if (!isAvailable) return "–";
        return "";
    };

    const getBookingBoxBorders = (booking, minute) => {
        if (!booking) return {};

        const bs = timeToMinutes(String(booking.start_time).slice(0, 5));
        const be = timeToMinutes(String(booking.end_time).slice(0, 5));

        const isStartSlice = minute === bs;
        const isEndSlice = minute + 30 === be;

        const thick = "2px solid #000";

        return {
            borderLeft: thick,
            borderRight: thick,
            borderTop: isStartSlice ? thick : "0",
            borderBottom: isEndSlice ? thick : "0",
            borderTopLeftRadius: isStartSlice ? 6 : 0,
            borderTopRightRadius: isStartSlice ? 6 : 0,
            borderBottomLeftRadius: isEndSlice ? 6 : 0,
            borderBottomRightRadius: isEndSlice ? 6 : 0,
            boxSizing: "border-box",
        };
    };

    const isInPreview = (isoDate, minute) => {
        if (!hoverPreview) return false;
        return hoverPreview.date === isoDate && minute >= hoverPreview.start && minute < hoverPreview.end;
    };

    const slotOutlineStyle = (isoDate, minute) => {
        if (!isInPreview(isoDate, minute)) return {};

        const thick = "2px solid #000";
        const isTopHalf = hoverPreview && hoverPreview.date === isoDate && minute === hoverPreview.start;
        const isBottomHalf = hoverPreview && hoverPreview.date === isoDate && minute + 30 === hoverPreview.end;

        return {
            borderLeft: thick,
            borderRight: thick,
            borderTop: isTopHalf ? thick : "0",
            borderBottom: isBottomHalf ? thick : "0",
            borderTopLeftRadius: isTopHalf ? 6 : 0,
            borderTopRightRadius: isTopHalf ? 6 : 0,
            borderBottomLeftRadius: isBottomHalf ? 6 : 0,
            borderBottomRightRadius: isBottomHalf ? 6 : 0,
            boxSizing: "border-box",
        };
    };

    return (
        <div className="gridScroll" style={{ marginTop: 12, position: "relative" }}>
            <div
                className="gridInner"
                style={{
                    display: "grid",
                    gridTemplateColumns: "80px repeat(7,1fr)",
                    gap: 1,
                    border: "1px solid #eee",
                }}
            >
                <div style={{ padding: 8, background: "#fafafa" }} />

                {weekDays.map((d) => (
                    <div key={d.iso} style={{ padding: 8, textAlign: "center", fontWeight: 600, cursor: "default" }}>
                        {d.short}
                    </div>
                ))}

                {hours.map((h, row) => (
                    <React.Fragment key={`${row}-${h}`}>
                        <div style={{ padding: 8, textAlign: "right", background: "#fff", color: "#333", fontWeight: 600 }}>
                            {String(h).padStart(2, "0")}
                        </div>

                        {weekDays.map((d) => {
                            const start00 = h * 60;
                            const start30 = start00 + 30;

                            const daySlots = slotsByDate[d.iso] || [];
                            const isAvailable00 = daySlots.some((s) => s.start === start00);
                            const isAvailable30 = daySlots.some((s) => s.start === start30);

                            const canBook00 = isAvailable00 && !!selectedStudentId;
                            const canBook30 = isAvailable30 && !!selectedStudentId;

                            const dayBookings = bookingsByDate[d.iso] || [];
                            const otherDayBookings = otherBookingsByDate[d.iso] || [];

                            const myBooking00 = findOverlapAtMinute(dayBookings, start00);
                            const myBooking30 = findOverlapAtMinute(dayBookings, start30);

                            const otherBooking00 = findOverlapAtMinute(otherDayBookings, start00);
                            const otherBooking30 = findOverlapAtMinute(otherDayBookings, start30);

                            const finalCanBook00 = canBook00 && !myBooking00 && !otherBooking00;
                            const finalCanBook30 = canBook30 && !myBooking30 && !otherBooking30;

                            const cellTitle = (minute, myB, otherB, canBook) => {
                                if (loadingWeek) return "Loading availability...";
                                if (myB) return `Your booking (${String(myB.status || "").toLowerCase()})`;
                                if (otherB) return "Booked";
                                if (canBook) return `Click to book ${d.iso} ${minutesToTime(minute)}`;
                                return "Unavailable";
                            };

                            const renderCellLabel = (isAvailable, myB, otherB) => {
                                const label = getCellLabel({ isAvailable, myBooking: myB, otherBooking: otherB });
                                if (!label) return null;
                                return (
                                    <span
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 900,
                                            letterSpacing: 0.2,
                                            opacity: label === "–" ? 0.5 : 0.9,
                                            userSelect: "none",
                                            padding: "0 4px",
                                            textAlign: "center",
                                            lineHeight: 1.1,
                                            whiteSpace: "normal",
                                        }}
                                    >
                                        {label}
                                    </span>
                                );
                            };

                            return (
                                <div key={`${d.iso}-${h}-${row}`} style={{ borderLeft: "1px solid #eee", borderTop: "1px solid #eee", padding: 0 }}>
                                    {/* 00 block */}
                                    <div
                                        onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                        onMouseEnter={() => {
                                            if (loadingWeek) return;

                                            onHoverRange?.({ date: d.iso, start: start00, end: start00 + 60 });

                                            if (!finalCanBook00) return;
                                            setHoverPreview({ date: d.iso, start: start00, end: start00 + 60 });
                                        }}
                                        onMouseLeave={() => {
                                            onHoverRange?.(null);
                                            setHoverPreview(null);
                                        }}
                                        onClick={() => {
                                            if (!finalCanBook00) return;
                                            if (loadingWeek) return;

                                            onCellClick?.({ date: d.iso, start: start00 });
                                        }}
                                        style={{
                                            height: 22,
                                            cursor: isLoading ? "wait" : canBook00 ? "pointer" : "not-allowed",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",

                                            // If both halves are inside the 60-min preview, remove divider
                                            borderBottom: isInPreview(d.iso, start00) && isInPreview(d.iso, start30) ? "none" : "1px dashed #f0f0f0",

                                            background: isLoading ? "#fff" : isAvailable00 ? "#fff" : "#f5f5f5",
                                            color: isLoading ? "#999" : isAvailable00 ? "#000" : "#999",
                                            opacity: isLoading ? 0.6 : 1,

                                            // One continuous outline for real bookings
                                            ...getBookingBoxBorders(myBooking00 || otherBooking00, start00),

                                            // Hover preview outline
                                            ...slotOutlineStyle(d.iso, start00),
                                        }}
                                        title={cellTitle(start00, myBooking00, otherBooking00, finalCanBook00)}
                                    >
                                        {renderCellLabel(isAvailable00, myBooking00, otherBooking00)}
                                    </div>

                                    {/* 30 block */}
                                    <div
                                        onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                        onMouseEnter={() => {
                                            if (loadingWeek) return;

                                            onHoverRange?.({ date: d.iso, start: start30, end: start30 + 60 });

                                            if (!finalCanBook30) return;
                                            setHoverPreview({ date: d.iso, start: start30, end: start30 + 60 });
                                        }}
                                        onMouseLeave={() => {
                                            onHoverRange?.(null);
                                            setHoverPreview(null);
                                        }}
                                        onClick={() => {
                                            if (!finalCanBook30) return;
                                            if (loadingWeek) return;

                                            onCellClick?.({ date: d.iso, start: start30 });
                                        }}
                                        style={{
                                            height: 22,
                                            cursor: isLoading ? "wait" : canBook30 ? "pointer" : "not-allowed",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: isLoading ? "#fff" : isAvailable30 ? "#fff" : "#f5f5f5",
                                            color: isLoading ? "#999" : isAvailable30 ? "#000" : "#999",

                                            // One continuous outline for real bookings
                                            ...getBookingBoxBorders(myBooking30 || otherBooking30, start30),

                                            // Hover preview outline
                                            ...slotOutlineStyle(d.iso, start30),
                                        }}
                                        title={cellTitle(start30, myBooking30, otherBooking30, finalCanBook30)}
                                    >
                                        {renderCellLabel(isAvailable30, myBooking30, otherBooking30)}
                                    </div>
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            {/* Hover tooltip */}
            {hoverPreview && (
                <div
                    style={{
                        position: "fixed",
                        left: hoverPos.x + 12,
                        top: hoverPos.y + 12,
                        background: "#111",
                        color: "#fff",
                        padding: "6px 8px",
                        borderRadius: 6,
                        fontSize: 13,
                        zIndex: 9999,
                        pointerEvents: "none",
                    }}
                >
                    {formatISO(hoverPreview.date)} - {minutesToTime(hoverPreview.start)} - {minutesToTime(hoverPreview.end)}
                </div>
            )}
        </div>
    );
}