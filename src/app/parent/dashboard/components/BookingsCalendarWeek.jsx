"use client";

import BookingsCalendarWeekGrid from "./BookingsCalendarWeekGrid";

/**
 * BookingsCalendarWeek
 * Weekly calendar for parent bookings.
 * Shows student name + status in each block.
 *
 * Props:
 * - bookings: array of booking rows (already filtered to this parent)
 * - students: array of student rows (optional, used for fallback matching)
 */
export default function BookingsCalendarWeek({ bookings = [], students = [] }) {
    // Basic "week starts Monday" view
    const now = new Date();
    const start = startOfWeekMonday(now);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    // Convert Date objects into the shape BookingsCalendarWeekGrid expects
    const weekDays = days.map((d) => ({
        iso: toISODate(d),          // "YYYY-MM-DD"
        label: formatDayHeader(d),  // "Mon 19 Jan" style label
    }));

    // Time slots (you can tweak later)
    const slots = buildHalfHourSlots("08:00", "20:00");

    // Index bookings by date for faster lookups
    const byDate = groupBy(bookings, (b) => b.session_date);

    return (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 950, marginBottom: 12 }}>Calendar (week)</div>

            <BookingsCalendarWeekGrid
                weekDays={weekDays}
                bookings={bookings}
            />
        </div>
    );

}

function Cell({ children }) {
    return (
        <div style={{ padding: 6, borderBottom: "1px solid #f2f2f2", minHeight: 44 }}>
            {children || null}
        </div>
    );
}

function bookingBlockStyle(status) {
    // Minimal, readable, and consistent
    switch (status) {
        case "accepted":
            return { background: "#e9f7ef", border: "1px solid #cfeedd", color: "#0a7a3a" };
        case "declined":
            return { background: "#fdecee", border: "1px solid #f7cfd5", color: "#b00020" };
        case "cancelled":
            return { background: "#f3f3f3", border: "1px solid #e1e1e1", color: "#555" };
        case "requested":
        default:
            return { background: "#fff7e6", border: "1px solid #ffe2ad", color: "#7a4b00" };
    }
}

function timeOverlapsSlot(startTime, endTime, slot) {
    // startTime/endTime expected as "HH:MM:SS" or "HH:MM"
    const s = toMinutes(startTime);
    const e = toMinutes(endTime);
    const t = toMinutes(slot);

    // slot covers [t, t+30)
    return s < t + 30 && e > t;
}

function toMinutes(t) {
    const raw = String(t || "");
    const hh = Number(raw.slice(0, 2));
    const mm = Number(raw.slice(3, 5));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
    return hh * 60 + mm;
}

function buildHalfHourSlots(startHHMM, endHHMM) {
    const start = toMinutes(startHHMM);
    const end = toMinutes(endHHMM);
    const out = [];
    for (let m = start; m <= end; m += 30) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        out.push(`${hh}:${mm}`);
    }
    return out;
}

function startOfWeekMonday(d) {
    const x = new Date(d);
    const day = x.getDay(); // 0 Sun .. 6 Sat
    const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
}

function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

function toISODate(d) {
    // YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatDayHeader(d) {
    return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
}

function groupBy(arr, keyFn) {
    return (arr || []).reduce((acc, item) => {
        const k = keyFn(item);
        if (!k) return acc;
        acc[k] = acc[k] || [];
        acc[k].push(item);
        return acc;
    }, {});
}

function inferStudentName(booking, students) {
    // If your booking rows include student_id but not joined student,
    // this attempts a lookup.
    const sid = booking?.student_id;
    if (!sid) return "";
    const s = students.find((x) => x.id === sid);
    return s?.full_name || "";
}
