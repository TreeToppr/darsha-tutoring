"use client";

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

/**
 * BookingsCalendarWeekGrid
 * Desktop: full 7-day grid
 * Mobile: horizontal scroll container (grid keeps readable widths)
 */
export default function BookingsCalendarWeekGrid({
    weekDays,
    bookings,
    dayStart = "08:00",
    dayEnd = "20:00",
    onBookingClick,
    onEmptySlotClick,
    getBlockTitle,
    getBlockSub,
    getBlockMeta,
    getBlockStyle,
}) {
    const startMin = timeToMinutes(dayStart);
    const endMin = timeToMinutes(dayEnd);
    const totalMinutes = endMin - startMin;

    // ✅ ADD THESE TWO LINES
    const slotMinutes = 30;
    const slotHeight = 34;

    const totalSlots = Math.ceil(totalMinutes / slotMinutes);


    // Group bookings by day
    const byDay = {};
    for (const d of weekDays) byDay[d.iso] = [];
    for (const b of bookings || []) {
        if (byDay[b.session_date]) byDay[b.session_date].push(b);
    }

    return (
        <div className="scrollWrap">
            <div className="gridCard">
                {/* Header row */}
                <div className="headerRow">
                    <div className="timeHead">Time</div>
                    {weekDays.map((d) => (
                        <div key={d.iso} className="dayHead">
                            {d.label}
                            <div className="dayIso">{d.iso}</div>
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="bodyRow">
                    {/* Time labels */}
                    <div className="timeCol">
                        {Array.from({ length: totalSlots }).map((_, i) => {
                            const mins = startMin + i * slotMinutes;
                            const showLabel = mins % 60 === 0;
                            return (
                                <div
                                    key={i}
                                    className="timeSlot"
                                    style={{ height: slotHeight }}
                                >
                                    <span style={{ opacity: showLabel ? 1 : 0 }}>
                                        {minutesToTime(mins)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((d) => {
                        const dayBookings = (byDay[d.iso] || [])
                            .slice()
                            .sort((a, b) =>
                                String(a.start_time).localeCompare(String(b.start_time))
                            );

                        return (
                            <div key={d.iso} className="dayCol" style={{ height: totalSlots * slotHeight }}>
                                {/* Clickable empty slots */}
                                {Array.from({ length: totalSlots }).map((_, i) => {
                                    const mins = startMin + i * slotMinutes;
                                    const slotTime = minutesToTime(mins);

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            className="gridSlot"
                                            style={{ height: slotHeight }}
                                            onClick={() => onEmptySlotClick?.({ date: d.iso, time: slotTime })}
                                            aria-label={`Add busy block ${d.iso} ${slotTime}`}
                                        />
                                    );
                                })}


                                {/* Booking blocks */}
                                {dayBookings.map((b) => {
                                    const s = timeToMinutes(b.start_time);
                                    const e = timeToMinutes(b.end_time);
                                    const top = Math.max(
                                        0,
                                        Math.round((s - startMin) / slotMinutes) * slotHeight
                                    );
                                    const height = Math.max(
                                        slotHeight,
                                        Math.round((e - s) / slotMinutes) * slotHeight
                                    );

                                    const fallbackTitle = b.students?.full_name || "Student";
                                    const timeRange = `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}`;

                                    const title = getBlockTitle ? getBlockTitle(b) : fallbackTitle;
                                    const sub = getBlockSub ? getBlockSub(b) : timeRange;
                                    const meta = getBlockMeta
                                        ? getBlockMeta(b)
                                        : `${String(b.status || "").toLowerCase()} - ${b.payment_status || "unpaid"}`;

                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            className="block"
                                            title={`${title} (${timeRange})`}
                                            style={{
                                                top: top + 2,
                                                height: height - 4,
                                                ...(getBlockStyle ? (getBlockStyle(b) || {}) : {}),
                                            }}
                                            onClick={() => onBookingClick?.(b)}
                                        >
                                            <div className="blockTitle">{title}</div>
                                            <div className="blockSub">{sub}</div>
                                            <div className="blockMeta">{meta}</div>
                                        </button>
                                    );

                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                .scrollWrap {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;                 /* helps inside CSS grid/flex parents */
                    overflow-x: auto;
                    overflow-y: hidden;           /* prevents weird vertical scrollbars */
                    -webkit-overflow-scrolling: touch;
                }

                .gridCard {
                    border: 1px solid #eee;
                    border-radius: 16px;
                    overflow: hidden;
                    background: #fff;

                    /* Keep the calendar readable; mobile users scroll horizontally */
                    min-width: 920px;
                }


                .headerRow {
                    display: grid;
                    grid-template-columns: 80px repeat(7, 1fr);
                    border-bottom: 1px solid #eee;
                }

                .timeHead {
                padding: 10px;
                font-weight: 900;
                color: #666;
                }

                .dayHead {
                    padding: 10px;
                    font-weight: 900;
                }

                .dayIso {
                    font-size: 12px;
                    color: #777;
                    margin-top: 2px;
                }

                .bodyRow {
                    display: grid;
                    grid-template-columns: 80px repeat(7, 1fr);
                }

                .timeCol {
                    border-right: 1px solid #eee;
                }

                .timeSlot {
                    border-bottom: 1px dashed #f0f0f0;
                    padding-left: 10px;
                    display: flex;
                    align-items: center;
                    font-size: 12px;
                    color: #666;
                    font-weight: 800;
                }

                .dayCol {
                    position: relative;
                    border-right: 1px solid #eee;
                }

                .gridLine {
                    border-bottom: 1px dashed #f0f0f0;
                }

                .gridSlot {
                    width: 100%;
                    border: none;
                    background: transparent;
                    padding: 0;
                    margin: 0;
                    cursor: pointer;
                    border-bottom: 1px dashed #f0f0f0;
                    z-index: 1;
                    position: relative;
                }

                .gridSlot:hover {
                    background: #fafafa;
                }

                .block {
                    position: absolute;
                    left: 6px;
                    right: 6px;
                    border-radius: 12px;
                    border: 2px solid #111;
                    background: #fff;
                    padding: 0 6px;
                    box-sizing: border-box;
                    overflow: hidden;
                    text-align: left;
                    cursor: pointer;
                    z-index: 2;
                }

                .blockTitle {
                    font-weight: 900;
                    font-size: 13px;
                    color: #111;
                }

                .blockSub {
                    margin-top: 4px;
                    font-size: 12px;
                    color: #555;
                }

                .blockMeta {
                    margin-top: 4px;
                    font-size: 12px;
                    color: #777;
                }

                @media (max-width: 640px) {
                    .gridCard {
                        min-width: 860px;
                    }
                }
            `}</style>
        </div>
    );
}
