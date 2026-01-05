"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function generateSlots(start, end) {
    const slots = [];
    let current = start;

    while (current + 60 <= end) {
        slots.push({ start: current, end: current + 60 });
        current += 60;
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
    const [date, setDate] = useState("");
    const [slots, setSlots] = useState([]);
    const [terms, setTerms] = useState([]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [selectedTermId, setSelectedTermId] = useState("");
    const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, 1 = next month


    const loadSlotsForDate = async (selectedDate) => {
        setMessage("");
        setSlots([]);

        // fetch tutor (single tutor for now)
        const { data: tutor, error: tutorError } = await supabase
            .from("tutors")
            .select("id, default_window_start, default_window_end")
            .eq("is_active", true)
            .single();

        if (tutorError || !tutor) {
            setMessage("Tutor not available.");
            return;
        }

        const windowStart = timeToMinutes(
            String(tutor.default_window_start).slice(0, 5)
        );
        const windowEnd = timeToMinutes(
            String(tutor.default_window_end).slice(0, 5)
        );

        let generated = generateSlots(windowStart, windowEnd);

        // 24-hour minimum notice: remove slots that start within the next 24 hours (Auckland time)
        const { aucklandDate, aucklandMinutes } = getAucklandNowISODateAndMinutes();

        if (selectedDate === aucklandDate) {
            // Same day: nothing should be bookable (always <24h)
            generated = [];
        } else {
            // If selected date is tomorrow, filter out slots that are <24h from now
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowAuckland = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Pacific/Auckland",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(tomorrow);

            if (selectedDate === tomorrowAuckland) {
                const cutoff = aucklandMinutes; // tomorrow slots must start at or after "now time"
                generated = generated.filter((s) => s.start >= cutoff);
            }
        }


        // fetch busy blocks
        const { data: busy } = await supabase
            .from("tutor_date_overrides")
            .select("*")
            .eq("tutor_id", tutor.id)
            .eq("date", selectedDate)
            .eq("is_available", false);

        // fetch existing bookings (requested or accepted) and remove conflicting slots
        const { data: existingBookings, error: bookingsError } = await supabase
            .from("bookings")
            .select("start_time, end_time, status")
            .eq("tutor_id", tutor.id)
            .eq("session_date", selectedDate)
            .in("status", ["requested", "accepted"]);

        if (bookingsError) {
            setMessage(bookingsError.message);
            return;
        }

        if (existingBookings && existingBookings.length > 0) {
            generated = generated.filter((slot) => {
                return !existingBookings.some((bk) => {
                    const bkStart = timeToMinutes(String(bk.start_time).slice(0, 5));
                    const bkEnd = timeToMinutes(String(bk.end_time).slice(0, 5));
                    return slot.start < bkEnd && slot.end > bkStart;
                });
            });
        }

        if (busy && busy.length > 0) {
            generated = generated.filter((slot) => {
                return !busy.some((b) => {
                    const bStart = timeToMinutes(
                        String(b.start_time).slice(0, 5)
                    );
                    const bEnd = timeToMinutes(
                        String(b.end_time).slice(0, 5)
                    );
                    return slot.start < bEnd && slot.end > bStart;
                });
            });
        }

        setSlots(generated);
    };

    const handleRequestRecurring = async (slot) => {
        setMessage("");

        if (!date) {
            setMessage("Please select a date first.");
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

        const key = `recurring-${date}-${slot.start}`;
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

        const dayOfWeek = getDayOfWeekFromISODate(date);

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

        const start = new Date(date + "T00:00:00");
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

    const handleRequestBooking = async (slot) => {
        setMessage("");

        if (!date) {
            setMessage("Please select a date first.");
            return;
        }

        if (!selectedStudentId) {
            setMessage("Please add/select a student first.");
            return;
        }

        const key = `${date}-${slot.start}`;
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
            session_date: date,
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

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
            <h1>Book a lesson</h1>

            <p style={{ color: "#555" }}>
                Select a date to see available 1-hour slots.
            </p>

            {/* <input
                type="date"
                min={today.toISOString().split("T")[0]}
                max={maxDate.toISOString().split("T")[0]}
                value={date}
                onChange={(e) => {
                    setDate(e.target.value);
                    loadSlotsForDate(e.target.value);
                }}
            /> */}

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

            <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
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
            </div>

            {message && <p>{message}</p>}

            <section style={{ marginTop: 24 }}>
                <h2>Available slots</h2>

                {date && slots.length === 0 && (
                    <p>No available slots for this day.</p>
                )}

                <ul style={{ paddingLeft: 18 }}>
                    {slots.map((s, idx) => {
                        const key = `${date}-${s.start}`;
                        const isRequesting = requestingKey === key;

                        return (
                            <li key={idx} style={{ marginBottom: 10 }}>
                                <span>
                                    {minutesToTime(s.start)} – {minutesToTime(s.end)}
                                </span>{" "}
                                <button
                                    onClick={() => (isRecurring ? handleRequestRecurring(s) : handleRequestBooking(s))}
                                    disabled={isRequesting || !selectedStudentId}
                                >
                                    {isRequesting ? "Requesting..." : isRecurring ? "Request recurring" : "Request"}
                                </button>
                            </li>
                        );
                    })}
                </ul>

            </section>
        </main>
    );
}
