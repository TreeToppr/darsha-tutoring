"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function generateSlots(start, end) {
    const slots = [];
    let current = start;
    while (current + 60 <= end) {
        slots.push({ start: current, end: current + 60 });
        current += 30; // step every 30 minutes so starts can be on :00 or :30
    }
    return slots;
}

function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(m) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function formatISO(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); // e.g. "Mon 5 Jan"
}

function getAucklandNowISODateAndMinutes() {
    const now = new Date();

    // Auckland local date string YYYY-MM-DD
    const aucklandDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Pacific/Auckland",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);

    // Auckland local time HH:MM
    const aucklandTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Pacific/Auckland",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(now);

    return {
        aucklandDate,
        aucklandMinutes: timeToMinutes(aucklandTime),
    };
}

function getDayOfWeekFromISODate(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getDay(); // 0=Sun ... 6=Sat
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

function buildISODate(y, m, d) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
}

function getDaysInMonth(year, month1Based) {
    // month1Based: 1-12
    return new Date(year, month1Based, 0).getDate();
}

function getMondayFirstIndexFromJsDay(jsDay) {
    // JS: 0=Sun..6=Sat -> Mon-first: 0=Mon..6=Sun
    return (jsDay + 6) % 7;
}

function addMonthsToYearMonth(year, month1Based, offset) {
    // month1Based: 1-12
    let y = year;
    let m = month1Based + offset;

    while (m > 12) {
        m -= 12;
        y += 1;
    }
    while (m < 1) {
        m += 12;
        y -= 1;
    }

    return { year: y, month: m };
}


export default function BookPage() {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [message, setMessage] = useState("");
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [requestingKey, setRequestingKey] = useState("");
    // const [date, setDate] = useState("");
    // const [slots, setSlots] = useState([]);
    const [terms, setTerms] = useState([]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [selectedTermId, setSelectedTermId] = useState("");
    const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, 1 = next month
    const [selectedCell, setSelectedCell] = useState(null);
    const [modalDuration, setModalDuration] = useState(60);
    const [modalNotes, setModalNotes] = useState("");
    const [hoverPreview, setHoverPreview] = useState(null); // { date, start, end }
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const [slotsByDate, setSlotsByDate] = useState({});
    const [loadingWeek, setLoadingWeek] = useState(false);
    // const [timesAreHalfHour] = useState(true);
    const isLoading = loadingWeek;
    const [hoveredCell, setHoveredCell] = useState(null); // { date, slotStart }

    const fetchSlotsForDate = async (selectedDate) => {
        const { aucklandDate, aucklandMinutes } = getAucklandNowISODateAndMinutes();

        // block past dates and today
        if (selectedDate <= aucklandDate) return [];

        const { data: tutor, error: tutorError } = await supabase
            .from("tutors")
            .select("id, default_window_start, default_window_end")
            .eq("is_active", true)
            .single();

        if (tutorError || !tutor) return [];

        // date override: explicitly available
        // date override: explicitly available (extra openings)
        const { data: dateAvail } = await supabase
            .from("tutor_date_overrides")
            .select("start_time, end_time")
            .eq("tutor_id", tutor.id)
            .eq("date", selectedDate)
            .eq("is_available", true);

        // date override: explicitly NOT available (busy blocks)
        const { data: dateBusy } = await supabase
            .from("tutor_date_overrides")
            .select("start_time, end_time")
            .eq("tutor_id", tutor.id)
            .eq("date", selectedDate)
            .eq("is_available", false);


        // weekly availability
        const dow = getDayOfWeekFromISODate(selectedDate);
        const { data: weekly } = await supabase
            .from("tutor_weekly_availability")
            .select("start_time, end_time")
            .eq("tutor_id", tutor.id)
            .eq("day_of_week", dow);

        const buildSlotsFromWindows = (windows) => {
            let all = [];
            for (const w of windows) {
                const ws = timeToMinutes(String(w.start_time).slice(0, 5));
                const we = timeToMinutes(String(w.end_time).slice(0, 5));
                all = all.concat(generateSlots(ws, we));
            }
            return all;
        };

        let generated = [];

        if (dateAvail && dateAvail.length > 0) {
            generated = buildSlotsFromWindows(dateAvail);
        } else if (weekly && weekly.length > 0) {
            generated = buildSlotsFromWindows(weekly);
        } else {
            const ws = timeToMinutes(String(tutor.default_window_start).slice(0, 5));
            const we = timeToMinutes(String(tutor.default_window_end).slice(0, 5));
            generated = generateSlots(ws, we);
        }

        // subtract busy overrides (is_available = false)
        if (dateBusy?.length) {
            generated = generated.filter((slot) => {
                return !dateBusy.some((b) => {
                    const bs = timeToMinutes(String(b.start_time).slice(0, 5));
                    const be = timeToMinutes(String(b.end_time).slice(0, 5));
                    return slot.start < be && slot.end > bs;
                });
            });
        }

        // existing bookings
        const { data: bookings } = await supabase
            .from("bookings")
            .select("start_time, end_time")
            .eq("tutor_id", tutor.id)
            .eq("session_date", selectedDate);

        if (bookings?.length) {
            generated = generated.filter((slot) => {
                return !bookings.some((b) => {
                    const bs = timeToMinutes(String(b.start_time).slice(0, 5));
                    const be = timeToMinutes(String(b.end_time).slice(0, 5));
                    return slot.start < be && slot.end > bs;
                });
            });
        }

        return generated;
    };

    const loadWeekSlots = async (days) => {
        setLoadingWeek(true);
        const map = {};

        for (const d of days) {
            map[d.iso] = await fetchSlotsForDate(d.iso);
        }

        setSlotsByDate(map);
        setLoadingWeek(false);
    };


    const handleRequestRecurring = async (sessionDate, slot) => {
        setMessage("");

        if (!sessionDate) {
            setMessage("Missing session date.");
            return;
        }

        if (!selectedStudentId) {
            setMessage("Please add/select a student first.");
            return;
        }

        if (!selectedTermId) {
            setMessage("Please select a term.");
            return;
        }

        const key = `recurring-${sessionDate}-${slot.start}`;
        setRequestingKey(key);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.push("/auth/sign-in");
            return;
        }

        const { data: tutor, error: tutorError } = await supabase
            .from("tutors")
            .select("id")
            .eq("is_active", true)
            .single();

        if (tutorError || !tutor) {
            setMessage("Tutor not available.");
            setRequestingKey("");
            return;
        }

        const { data: term, error: termErr } = await supabase
            .from("terms")
            .select("id, start_date, end_date")
            .eq("id", selectedTermId)
            .single();

        if (termErr || !term) {
            setMessage("Term not found.");
            setRequestingKey("");
            return;
        }

        const dayOfWeek = getDayOfWeekFromISODate(sessionDate);

        // 1) create recurring group
        const { data: group, error: groupError } = await supabase
            .from("recurring_groups")
            .insert({
                tutor_id: tutor.id,
                parent_id: user.id,
                student_id: selectedStudentId,
                term_id: term.id,
                day_of_week: dayOfWeek,
                start_time: minutesToTime(slot.start),
                end_time: minutesToTime(slot.end),
                status: "active",
            })
            .select("*")
            .single();

        if (groupError || !group) {
            setMessage(groupError?.message || "Could not create recurring group.");
            setRequestingKey("");
            return;
        }

        // 2) build weekly dates from selected date to term end
        const bookingsToInsert = [];

        const start = new Date(sessionDate + "T00:00:00");
        const end = new Date(term.end_date + "T00:00:00");

        // fetch public holidays once
        const { data: holidays, error: holErr } = await supabase
            .from("public_holidays")
            .select("date");

        if (holErr) {
            setMessage(holErr.message);
            setRequestingKey("");
            return;
        }

        const holidaySet = new Set((holidays || []).map((h) => h.date));

        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 7)) {
            const iso = dt.toISOString().split("T")[0];

            // skip public holidays automatically
            if (holidaySet.has(iso)) continue;

            bookingsToInsert.push({
                tutor_id: tutor.id,
                parent_id: user.id,
                student_id: selectedStudentId,
                session_date: iso,
                start_time: minutesToTime(slot.start),
                end_time: minutesToTime(slot.end),
                session_type: "standard",
                status: "requested",
                is_recurring: true,
                recurring_group_id: group.id,
            });
        }

        if (bookingsToInsert.length === 0) {
            setMessage("No dates generated for this term.");
            setRequestingKey("");
            return;
        }

        const { error: insErr } = await supabase.from("bookings").insert(bookingsToInsert);

        if (insErr) {
            setMessage(insErr.message);
            setRequestingKey("");
            return;
        }

        setMessage("Recurring booking requested for the term. The tutor will confirm.");
        setRequestingKey("");
    };

    const handleRequestBooking = async (sessionDate, slot) => {
        setMessage("");

        if (!sessionDate) {
            setMessage("Missing session date.");
            return;
        }


        if (!selectedStudentId) {
            setMessage("Please add/select a student first.");
            return;
        }

        const key = `${sessionDate}-${slot.start}`;
        setRequestingKey(key);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.push("/auth/sign-in");
            return;
        }

        const { data: tutor, error: tutorError } = await supabase
            .from("tutors")
            .select("id")
            .eq("is_active", true)
            .single();

        if (tutorError || !tutor) {
            setMessage("Tutor not available.");
            setRequestingKey("");
            return;
        }

        const { error } = await supabase.from("bookings").insert({
            tutor_id: tutor.id,
            parent_id: user.id,
            student_id: selectedStudentId,
            session_date: sessionDate,
            start_time: minutesToTime(slot.start),
            end_time: minutesToTime(slot.end),
            session_type: "standard",
            status: "requested",
            is_recurring: false,
        });

        if (error) {
            setMessage(error.message);
            setRequestingKey("");
            return;
        }

        setMessage("Booking requested. The tutor will confirm.");
        setRequestingKey("");
    };

    useEffect(() => {
        const init = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "parent") {
                router.push("/auth/sign-in");
                return;
            }

            const { data: kids, error: kidsError } = await supabase
                .from("students")
                .select("id, full_name")
                .eq("parent_id", user.id)
                .order("created_at", { ascending: false });

            if (kidsError) {
                setMessage(kidsError.message);
            } else {
                setStudents(kids || []);
                if (kids && kids.length > 0) setSelectedStudentId(kids[0].id);
            }

            const { data: termRows, error: termError } = await supabase
                .from("terms")
                .select("id, name, start_date, end_date, year")
                .order("year", { ascending: false })
                .order("start_date", { ascending: false });

            if (termError) {
                setMessage(termError.message);
            } else {
                setTerms(termRows || []);
                if (termRows && termRows.length > 0) setSelectedTermId(termRows[0].id);
            }

            setChecking(false);
        };

        init();
    }, [router]);

    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);

    const weekStart = (() => {
        const base = new Date();
        base.setDate(base.getDate() + monthOffset * 7);
        const start = new Date(base);
        const mondayOffset = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - mondayOffset);
        return start;
    })();
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return {
            iso: d.toISOString().split("T")[0],
            short: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        };
    });
    const hours = Array.from({ length: 13 }).map((_, i) => 8 + i); // 8..20
    const times = (() => {
        const startMin = 8 * 60;
        const endMin = 20 * 60;
        const arr = [];
        for (let t = startMin; t <= endMin; t += 30) arr.push(t);
        return arr;
    })(); // minutes since midnight at 30-min increments

    useEffect(() => {
        if (checking) return;
        loadWeekSlots(weekDays);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthOffset, checking]);

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
            <h1>Book a lesson</h1>

            <p style={{ color: "#555" }}>
                Tap a white block to request a booking. Grey blocks are unavailable.
            </p>

            {/* Modal: minimal booking editor */}
            {
                selectedCell && (
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
                            zIndex: 9999,
                        }}
                        onClick={() => setSelectedCell(null)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: "#fff",
                                padding: 20,
                                borderRadius: 8,
                                minWidth: 340,
                            }}
                        >
                            <h3 style={{ marginTop: 0 }}>
                                Book {selectedCell.date} | {minutesToTime(selectedCell.start)} – {minutesToTime(selectedCell.start + modalDuration)}
                            </h3>


                            <div style={{ marginTop: 8 }}>
                                <label style={{ display: "block", marginBottom: 6 }}>Duration</label>
                                <select
                                    value={modalDuration}
                                    onChange={(e) => setModalDuration(Number(e.target.value))}
                                >
                                    <option value={60}>60 minutes</option>
                                    <option value={120}>120 minutes</option>
                                </select>
                            </div>

                            <div style={{ marginTop: 8 }}>
                                <label style={{ display: "block", marginBottom: 6 }}>Notes (optional)</label>
                                <textarea
                                    value={modalNotes}
                                    onChange={(e) => setModalNotes(e.target.value)}
                                    rows={3}
                                    style={{ width: "100%" }}
                                />
                            </div>

                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input
                                        type="checkbox"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                    />
                                    Recurring weekly (for a term)
                                </label>

                                {isRecurring && (
                                    <div style={{ marginTop: 10 }}>
                                        <label style={{ display: "block", marginBottom: 6 }}>Term</label>
                                        <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
                                            {terms.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.year} - {t.name} ({t.start_date} to {t.end_date})
                                                </option>
                                            ))}
                                        </select>

                                        <p style={{ marginTop: 8, color: "#555" }}>
                                            Recurring will skip public holidays automatically. You can add extra holiday lessons manually.
                                        </p>
                                    </div>
                                )}
                            </div>


                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    marginTop: 12,
                                    justifyContent: "flex-end",
                                }}
                            >
                                <button onClick={() => setSelectedCell(null)}>Cancel</button>

                                <button
                                    onClick={async () => {
                                        const slot = {
                                            start: selectedCell.start,
                                            end: selectedCell.start + modalDuration,
                                        };

                                        if (isRecurring) {
                                            await handleRequestRecurring(selectedCell.date, slot);
                                        } else {
                                            await handleRequestBooking(selectedCell.date, slot);
                                        }

                                        setSelectedCell(null);
                                    }}
                                    style={{
                                        background: "#1f7aea",
                                        color: "#fff",
                                        border: "none",
                                        padding: "8px 12px",
                                        borderRadius: 6,
                                    }}
                                >
                                    Confirm booking
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }







            <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", marginBottom: 6 }}>
                    Student
                </label>

                {students.length === 0 ? (
                    <p style={{ color: "#555" }}>
                        No students yet. Add one in <a href="/parent/students">Parent - Students</a>.
                    </p>
                ) : (
                    <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                        {students.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.full_name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                    />
                    Recurring weekly (for a term)
                </label>

                {isRecurring && (
                    <div style={{ marginTop: 12 }}>
                        <label style={{ display: "block", marginBottom: 6 }}>Term</label>
                        <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
                            {terms.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.year} - {t.name} ({t.start_date} to {t.end_date})
                                </option>
                            ))}
                        </select>

                        <p style={{ marginTop: 8, color: "#555" }}>
                            Recurring will skip public holidays automatically. You can add extra holiday lessons manually.
                        </p>
                    </div>
                )}
            </div> */}

            <div style={{ marginTop: 12 }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                }}>
                    <button onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))}
                        disabled={monthOffset === 0}>◀</button>
                    <div>
                        Week of {formatISO(weekDays[0].iso)} to {formatISO(weekDays[6].iso)}
                    </div>
                    <button onClick={() => setMonthOffset(Math.min(3, monthOffset + 1))}
                        disabled={monthOffset === 3}>▶</button>
                </div>
                <div style={{ marginTop: 12, overflowX: "auto" }}>
                </div>


                <div style={{
                    marginTop: 12,
                    overflowX: "auto",
                    position: "relative"
                }}>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "80px repeat(7,1fr)",
                        gap: 1,
                        border: "1px solid #eee"
                    }}>
                        <div style={{
                            padding: 8,
                            background: "#fafafa"
                        }}>
                        </div>
                        {weekDays.map((d) => (
                            <div
                                key={d.iso}
                                onClick={() => {
                                    setSelectedCell(null);
                                }}
                                style={{
                                    padding: 8,
                                    textAlign: "center",
                                    // background: date === d.iso ? "#eaf2ff" : "#fafafa",
                                    fontWeight: 600,
                                    cursor: "default",
                                    // borderBottom: date === d.iso ? "2px solid #273341" : "2px solid transparent",
                                }}
                                title={`Select ${d.iso}`}
                            >
                                {d.short}
                            </div>
                        ))}


                        {/* {hours.map((h) => (
                            <React.Fragment key={h}>
                                <div style={{
                                    padding: 8,
                                    textAlign: "right",
                                    background: "#fff",
                                    color: "#333",
                                    fontWeight: 600
                                }}>
                                    {String(h).padStart(2, "0")}
                                </div>

                                {weekDays.map((d) => {
                                    const start00 = h * 60;
                                    const start30 = start00 + 30;
                                    return (
                                        <div key={d.iso} style={{ borderLeft: "1px solid #eee", borderTop: "1px solid #eee", padding: 0 }}>
                                            <div
                                                onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                                onMouseEnter={() => setHoverPreview({ date: d.iso, start: start00, end: start00 + 60 })}
                                                onMouseLeave={() => setHoverPreview(null)}
                                                onClick={() => { setSelectedCell({ date: d.iso, start: start00 }); setModalDuration(60); setModalNotes(""); setDate(d.iso); loadSlotsForDate(d.iso); }}
                                                style={{ height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px dashed #f0f0f0" }}
                                                title={`${minutesToTime(start00)} - ${minutesToTime(start00 + 60)}`}
                                            />
                                            <div
                                                onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                                onMouseEnter={() => setHoverPreview({ date: d.iso, start: start30, end: start30 + 60 })}
                                                onMouseLeave={() => setHoverPreview(null)}
                                                onClick={() => { setSelectedCell({ date: d.iso, start: start30 }); setModalDuration(60); setModalNotes(""); setDate(d.iso); loadSlotsForDate(d.iso); }}
                                                style={{ height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                title={`${minutesToTime(start30)} - ${minutesToTime(start30 + 60)}`}
                                            />
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))} */}

                        {hours.map((h, row) => (
                            <React.Fragment key={`${row}-${h}`}>
                                <div
                                    style={{
                                        padding: 8,
                                        textAlign: "right",
                                        background: "#fff",
                                        color: "#333",
                                        fontWeight: 600,
                                    }}
                                >
                                    {String(h).padStart(2, "0")}
                                </div>

                                {weekDays.map((d) => {
                                    const start00 = h * 60;
                                    const start30 = start00 + 30;

                                    // const isAvailable00 = date === d.iso && slots.some((s) => s.start === start00);
                                    // const isAvailable30 = date === d.iso && slots.some((s) => s.start === start30);

                                    const daySlots = slotsByDate[d.iso] || [];

                                    const isAvailable00 = daySlots.some((s) => s.start === start00);
                                    const isAvailable30 = daySlots.some((s) => s.start === start30);

                                    const canBook00 = isAvailable00 && !!selectedStudentId;
                                    const canBook30 = isAvailable30 && !!selectedStudentId;

                                    return (
                                        <div
                                            key={`${d.iso}-${h}-${row}`}
                                            style={{
                                                borderLeft: "1px solid #eee",
                                                borderTop: "1px solid #eee",
                                                padding: 0,
                                                // background: date === d.iso ? "#fff" : "#fff",
                                            }}
                                        >
                                            <div
                                                onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                                // onMouseEnter={() => {
                                                //     if (!canBook00) return;
                                                //     if (loadingWeek) return;
                                                //     setHoverPreview({ date: d.iso, start: start00, end: start00 + 60 });
                                                // }}
                                                // onMouseLeave={() => setHoverPreview(null)}
                                                onMouseEnter={() => {
                                                    if (loadingWeek) return;
                                                    setHoveredCell({ date: d.iso, slotStart: start00 });
                                                    if (!canBook00) return;
                                                    setHoverPreview({ date: d.iso, start: start00, end: start00 + 60 });
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredCell(null);
                                                    setHoverPreview(null);
                                                }}
                                                onClick={() => {
                                                    if (!canBook00) return;
                                                    if (loadingWeek) return;
                                                    setSelectedCell({ date: d.iso, start: start00 });
                                                    setModalDuration(60);
                                                    setModalNotes("");
                                                }}
                                                style={{
                                                    height: 22,
                                                    cursor: isLoading ? "wait" : canBook00 ? "pointer" : "not-allowed",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    borderBottom: "1px dashed #f0f0f0",
                                                    background: isLoading ? "#fff" : isAvailable00 ? "#fff" : "#f5f5f5",
                                                    color: isLoading ? "#999" : isAvailable00 ? "#000" : "#999",
                                                    opacity: isLoading ? 0.6 : 1,
                                                    outline:
                                                        hoveredCell?.date === d.iso &&
                                                            (hoveredCell?.slotStart === start00 || hoveredCell?.slotStart + 30 === start00)
                                                            ? "2px solid #1f7aea"
                                                            : "none",
                                                    outlineOffset: -2,
                                                }}
                                                title={loadingWeek ? "Loading availability..." : canBook00 ? `Click to book ${d.iso} ${minutesToTime(start00)}` : "Unavailable"}

                                            />

                                            <div
                                                onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                                // onMouseEnter={() => {
                                                //     if (!canBook30) return;
                                                //     if (loadingWeek) return;
                                                //     setHoverPreview({ date: d.iso, start: start30, end: start30 + 60 });
                                                // }}
                                                // onMouseLeave={() => setHoverPreview(null)}
                                                onMouseEnter={() => {
                                                    if (loadingWeek) return;
                                                    setHoveredCell({ date: d.iso, slotStart: start30 });
                                                    if (!canBook30) return;
                                                    setHoverPreview({ date: d.iso, start: start30, end: start30 + 60 });
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredCell(null);
                                                    setHoverPreview(null);
                                                }}
                                                onClick={() => {
                                                    if (!canBook30) return;
                                                    if (loadingWeek) return;
                                                    setSelectedCell({ date: d.iso, start: start30 });
                                                    setModalDuration(60);
                                                    setModalNotes("");
                                                }}
                                                style={{
                                                    height: 22,
                                                    cursor: isLoading ? "wait" : canBook30 ? "pointer" : "not-allowed",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: isLoading ? "#fff" : isAvailable30 ? "#fff" : "#f5f5f5",
                                                    color: isLoading ? "#999" : isAvailable30 ? "#000" : "#999",
                                                    outline:
                                                        hoveredCell?.date === d.iso &&
                                                            (hoveredCell?.slotStart === start30 || hoveredCell?.slotStart + 30 === start30)
                                                            ? "2px solid #1f7aea"
                                                            : "none",
                                                    outlineOffset: -2,
                                                }}
                                                title={loadingWeek ? "Loading availability..." : canBook30 ? `Click to book ${d.iso} ${minutesToTime(start30)}` : "Unavailable"}

                                            />
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}



                    </div>

                    {hoverPreview && (
                        <div style={{
                            position: "fixed",
                            left: hoverPos.x + 12,
                            top: hoverPos.y + 12,
                            background: "#111",
                            color: "#fff",
                            padding: "6px 8px",
                            borderRadius: 6,
                            fontSize: 13,
                            zIndex: 9999,
                            pointerEvents: "none"
                        }}>
                            {formatISO(hoverPreview.date)} — {minutesToTime(hoverPreview.start)} - {minutesToTime(hoverPreview.end)}
                        </div>
                    )}
                </div>
            </div >

            {message && <p>{message}</p>
            }


        </main >
    );
}
