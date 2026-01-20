import React from "react";

function timeToMinutes(t) {
    const [hh, mm] = String(t).slice(0, 5).split(":").map(Number);
    return hh * 60 + mm;
}

function minutesToTime(m) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

export default function BookingsCalendarWeekGrid({
    weekDays,
    bookings,
    dayStart = "08:00",
    dayEnd = "20:00",
    slotMinutes = 30,
    slotHeight = 22,
    onBookingClick,
}) {
    const startMin = timeToMinutes(dayStart);
    const endMin = timeToMinutes(dayEnd);
    const totalMinutes = endMin - startMin;
    const totalSlots = Math.ceil(totalMinutes / slotMinutes);

    // Group bookings by day
    const byDay = {};
    for (const d of weekDays) byDay[d.iso] = [];
    for (const b of bookings || []) {
        if (byDay[b.session_date]) byDay[b.session_date].push(b);
    }

    return (
        <div style={{ border: "1px solid #eee", borderRadius: 16, overflow: "hidden", background: "#fff" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: `80px repeat(7, 1fr)`, borderBottom: "1px solid #eee" }}>
                <div style={{ padding: 10, fontWeight: 900, color: "#666" }}>Time</div>
                {weekDays.map((d) => (
                    <div key={d.iso} style={{ padding: 10, fontWeight: 900 }}>
                        {d.label}
                        <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{d.iso}</div>
                    </div>
                ))}
            </div>

            {/* Body */}
            <div style={{ display: "grid", gridTemplateColumns: `80px repeat(7, 1fr)` }}>
                {/* Time labels */}
                <div style={{ borderRight: "1px solid #eee" }}>
                    {Array.from({ length: totalSlots }).map((_, i) => {
                        const mins = startMin + i * slotMinutes;
                        const showLabel = mins % 60 === 0; // show hourly labels
                        return (
                            <div
                                key={i}
                                style={{
                                    height: slotHeight,
                                    borderBottom: "1px dashed #f0f0f0",
                                    paddingLeft: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    fontSize: 12,
                                    color: showLabel ? "#666" : "transparent",
                                    fontWeight: 800,
                                }}
                            >
                                {minutesToTime(mins)}
                            </div>
                        );
                    })}
                </div>

                {/* Day columns */}
                {weekDays.map((d) => {
                    const dayBookings = (byDay[d.iso] || []).slice().sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

                    return (
                        <div
                            key={d.iso}
                            style={{
                                position: "relative",
                                borderRight: "1px solid #eee",
                                height: totalSlots * slotHeight,
                            }}
                        >
                            {/* Grid lines */}
                            {Array.from({ length: totalSlots }).map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        height: slotHeight,
                                        borderBottom: "1px dashed #f0f0f0",
                                    }}
                                />
                            ))}

                            {/* Booking blocks */}
                            {dayBookings.map((b) => {
                                const s = timeToMinutes(b.start_time);
                                const e = timeToMinutes(b.end_time);
                                const top = Math.max(0, Math.round((s - startMin) / slotMinutes) * slotHeight);
                                const height = Math.max(slotHeight, Math.round((e - s) / slotMinutes) * slotHeight);

                                const studentName = b.students?.full_name || "Student";
                                const timeRange = `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}`;

                                return (
                                    <div
                                        key={b.id}
                                        title={`${studentName} (${timeRange})`}
                                        onClick={() => onBookingClick?.(b.id)}
                                        style={{
                                            position: "absolute",
                                            left: 6,
                                            right: 6,
                                            top: top + 2,
                                            height: height - 4,
                                            borderRadius: 12,
                                            border: "2px solid #111",
                                            background: "#fff",
                                            padding: 0,
                                            paddingLeft: 5,
                                            boxSizing: "border-box",
                                            overflow: "hidden",
                                            cursor: onBookingClick ? "pointer" : "default",
                                        }}
                                    >
                                        <div style={{ fontWeight: 900, fontSize: 13 }}>{studentName}</div>
                                        <div style={{ marginTop: 4, fontSize: 12, color: "#555" }}>{timeRange}</div>
                                        <div style={{ marginTop: 4, fontSize: 12, color: "#777" }}>
                                            {String(b.status || "").toLowerCase()} · {b.payment_status || "unpaid"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
