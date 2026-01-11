"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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

function buildPaymentCopyText({ studentName, sessionDate, amountTotal, lessonMode }) {
    const ref = `${studentName || "Student"} ${sessionDate || ""}`.trim();
    const modeLabel = lessonMode === "in_person" ? "In person" : "Online";
    const amountLine = typeof amountTotal === "number" ? `Amount: $${amountTotal}\n` : "";

    return (
        "Booking payment details:\n" +
        `Mode: ${modeLabel}\n` +
        amountLine +
        "Bank transfer details:\n" +
        "Account: 00-0000-0000000-00\n" +
        `Reference: ${ref}\n\n` +
        "Alternative: Cash in person (if agreed)\n\n" +
        "After payment, the tutor will mark the booking as PAID."
    );
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
    // Payment info popup after booking request
    const [paymentPopup, setPaymentPopup] = useState(null);
    // shape: { studentName, sessionDate, paymentStatus, paymentMethod, lessonMode, amountTotal, amountBase, amountTravel }
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [requestingKey, setRequestingKey] = useState("");
    // const [date, setDate] = useState("");
    // const [slots, setSlots] = useState([]);
    const [terms, setTerms] = useState([]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [selectedTermId, setSelectedTermId] = useState("");
    const [monthOffset, setMonthOffset] = useState(0); // week offset (0 = this week)
    const [minWeekOffset, setMinWeekOffset] = useState(0); // first week that has any availability
    const [selectedCell, setSelectedCell] = useState(null);
    const [modalDuration, setModalDuration] = useState(60);
    const [modalNotes, setModalNotes] = useState("");
    const [lessonMode, setLessonMode] = useState("online"); // "online" | "in_person"
    const [profileAddress, setProfileAddress] = useState("");
    const [bookingAddress, setBookingAddress] = useState("");
    const [hoverPreview, setHoverPreview] = useState(null); // { date, start, end }
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const [slotsByDate, setSlotsByDate] = useState({});
    const [loadingWeek, setLoadingWeek] = useState(false);
    // const [timesAreHalfHour] = useState(true);
    const isLoading = loadingWeek;
    const [hoveredRange, setHoveredRange] = useState(null); // { date, start, end }
    // const [price, setPrice] = useState(null);
    const [driveMinutes, setDriveMinutes] = useState(null);
    const [priceQuote, setPriceQuote] = useState(null); // { base, travel, total }
    const [pricingError, setPricingError] = useState("");
    const [pricingLoading, setPricingLoading] = useState(false);

    const getSelectedStudent = () => students.find((s) => s.id === selectedStudentId) || null;

    const calcBasePrice = (yearLevel) => (Number(yearLevel) >= 7 ? 40 : 30);

    async function calculateTravelCost(address) {
        setPricingError("");
        setPricingLoading(true);
        try {
            const res = await fetch("/api/drive-minutes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Drive time lookup failed");

            const mins = Number(data.minutes);
            if (!Number.isFinite(mins)) throw new Error("Invalid minutes returned");

            const st = getSelectedStudent();
            const yearLevel = st?.year_level ?? 7; // fallback
            const base = calcBasePrice(yearLevel);
            const travel = Math.max(0, Math.round(mins)); // $1 per minute
            const total = base + travel;

            setDriveMinutes(travel);
            setPriceQuote({ base, travel, total });
        } catch (e) {
            setDriveMinutes(null);
            setPriceQuote(null);
            setPricingError(e?.message || "Could not calculate price");
        } finally {
            setPricingLoading(false);
        }
    }


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

        // If this entire week has zero available slots, automatically move to the next week.
        const totalSlotsThisWeek = Object.values(map).reduce((sum, arr) => sum + (arr?.length || 0), 0);

        // Only auto-advance while we're still searching for the first available week.
        // Once minWeekOffset is set to a later week, we stop auto-skipping.
        if (totalSlotsThisWeek === 0 && monthOffset < 12 && minWeekOffset === 0) {
            setMonthOffset((prev) => prev + 1);
        }

        // If this week has availability and we haven't anchored the window yet,
        // lock the 4-week window starting from here.
        if (totalSlotsThisWeek > 0 && minWeekOffset === 0 && monthOffset > 0) {
            setMinWeekOffset(monthOffset);
        }
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

        if (lessonMode === "in_person") {
            const addr = (bookingAddress || "").trim();
            if (!addr) {
                setMessage("Please enter an address for an in-person lesson.");
                setRequestingKey("");
                return;
            }

            const { error: addrErr } = await supabase
                .from("profiles")
                .update({ address_text: addr })
                .eq("id", user.id);

            if (addrErr) {
                setMessage(addrErr.message);
                setRequestingKey("");
                return;
            }
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

            const st = students.find((s) => s.id === selectedStudentId) || null;
            const base = calcBasePrice(st?.year_level ?? 7);
            const travel = lessonMode === "in_person" ? (priceQuote?.travel ?? 0) : 0;
            const total = lessonMode === "in_person" ? (priceQuote?.total ?? base) : base;

            bookingsToInsert.push({
                tutor_id: tutor.id,
                parent_id: user.id,
                student_id: selectedStudentId,
                session_date: iso,
                start_time: minutesToTime(slot.start),
                end_time: minutesToTime(slot.end),

                lesson_mode: lessonMode === "in_person" ? "in_person" : "online",
                booking_address_text: lessonMode === "in_person" ? (bookingAddress || "").trim() : null,

                payment_status: "unpaid",
                payment_method: "bank_transfer",

                amount_base: base,
                amount_travel: travel,
                amount_total: total,

                status: "requested",
                notes: modalNotes || null,
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

        const studentName = (students.find((s) => s.id === selectedStudentId)?.full_name || "").trim();

        const st = students.find((s) => s.id === selectedStudentId) || null;
        const base = calcBasePrice(st?.year_level ?? 7);
        const travel = lessonMode === "in_person" ? (priceQuote?.travel ?? 0) : 0;
        const total = lessonMode === "in_person" ? (priceQuote?.total ?? base) : base;

        setPaymentPopup({
            studentName,
            sessionDate,
            paymentStatus: "unpaid",
            paymentMethod: "bank_transfer",
            lessonMode,
            amountBase: base,
            amountTravel: travel,
            amountTotal: total,
        });

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

        if (lessonMode === "in_person") {
            const addr = (bookingAddress || "").trim();
            if (!addr) {
                setMessage("Please enter an address for an in-person lesson.");
                setRequestingKey("");
                return;
            }

            const { error: addrErr } = await supabase
                .from("profiles")
                .update({ address_text: addr })
                .eq("id", user.id);

            if (addrErr) {
                setMessage(addrErr.message);
                setRequestingKey("");
                return;
            }
        }

        // Compute amounts BEFORE inserting
        const st = students.find((s) => s.id === selectedStudentId) || null;
        const base = calcBasePrice(st?.year_level ?? 7);
        const travel = lessonMode === "in_person" ? (priceQuote?.travel ?? 0) : 0;
        const total = lessonMode === "in_person" ? (priceQuote?.total ?? base) : base;

        const { error } = await supabase.from("bookings").insert({
            tutor_id: tutor.id,
            parent_id: user.id,
            student_id: selectedStudentId,
            session_date: sessionDate,
            start_time: minutesToTime(slot.start),
            end_time: minutesToTime(slot.end),

            lesson_mode: lessonMode === "in_person" ? "in_person" : "online",
            booking_address_text: lessonMode === "in_person" ? (bookingAddress || "").trim() : null,

            status: "requested",
            is_recurring: false,
            notes: modalNotes || null,

            payment_status: "unpaid",
            payment_method: "bank_transfer",

            amount_base: base,
            amount_travel: travel,
            amount_total: total,
        });

        if (error) {
            setMessage(error.message);
            setRequestingKey("");
            return;
        }

        // show a friendly popup instead of a wall-of-text message
        const studentName = (students.find((s) => s.id === selectedStudentId)?.full_name || "").trim();

        setPaymentPopup({
            studentName,
            sessionDate,
            paymentStatus: "unpaid",
            paymentMethod: "bank_transfer",
            lessonMode,
            amountBase: base,
            amountTravel: travel,
            amountTotal: total,
        });

        setMessage("Booking requested."); // keep message short (or set to "" if you prefer)
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
                .select("role, address_text")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "parent") {
                router.push("/auth/sign-in");
                return;
            }

            setProfileAddress(profile?.address_text || "");
            setBookingAddress(profile?.address_text || "");

            const { data: kids, error: kidsError } = await supabase
                .from("students")
                .select("id, full_name, year_level")
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

    useEffect(() => {
        if (checking) return;
        // If we are still on offset 0 and it has availability, explicitly anchor at 0.
        if (minWeekOffset === 0 && monthOffset === 0) {
            // Do nothing here; anchoring at 0 is already correct.
            // This effect exists just to make the intent explicit.
        }
    }, [checking, monthOffset, minWeekOffset]);

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
            <h1>Book a lesson</h1>

            <p style={{ color: "#555" }}>
                Tap a white block to request a booking. Grey blocks are unavailable.
            </p>

            {/* Payment popup (after booking request) */}
            {paymentPopup && (
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
                    onClick={() => setPaymentPopup(null)}
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
                                    {paymentPopup.studentName ? `${paymentPopup.studentName} • ` : ""}
                                    {paymentPopup.sessionDate ? formatISO(paymentPopup.sessionDate) : ""}
                                </div>
                            </div>

                            <button
                                onClick={() => setPaymentPopup(null)}
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
                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, border: "1px solid #ffe0a3", background: "#fff7e6", color: "#8a5a00" }}>
                                UNPAID
                            </span>
                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, border: "1px solid #cdd9ff", background: "#e9eefc", color: "#1f7aea" }}>
                                Bank transfer
                            </span>
                        </div>

                        {typeof paymentPopup.amountTotal === "number" && (
                            <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}>
                                <div style={{ fontWeight: 900 }}>Total to pay</div>
                                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 900 }}>${paymentPopup.amountTotal}</div>

                                <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
                                    ${paymentPopup.amountBase} (base)
                                    {paymentPopup.lessonMode === "in_person" ? ` + $${paymentPopup.amountTravel} (travel)` : ""}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
                            <div style={{ fontWeight: 900 }}>Bank transfer</div>
                            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 6, columnGap: 10, fontSize: 14 }}>
                                <div style={{ color: "#666", fontWeight: 800 }}>Account</div>
                                <div style={{ fontWeight: 900 }}>00-0000-0000000-00</div>

                                <div style={{ color: "#666", fontWeight: 800 }}>Reference</div>
                                <div style={{ fontWeight: 900 }}>
                                    {(paymentPopup.studentName || "Student") + (paymentPopup.sessionDate ? ` ${paymentPopup.sessionDate}` : "")}
                                </div>
                            </div>

                            <div style={{ marginTop: 10, color: "#555", fontSize: 13 }}>
                                After payment, the tutor will mark the booking as <strong>PAID</strong>.
                            </div>
                        </div>

                        <div style={{ marginTop: 10, color: "#555", fontSize: 13 }}>
                            Cash in person is also possible <strong>if agreed</strong>.
                        </div>

                        <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button
                                onClick={async () => {
                                    try {
                                        const text = buildPaymentCopyText(paymentPopup);
                                        await navigator.clipboard.writeText(text);
                                        setMessage("Payment details copied.");
                                    } catch {
                                        setMessage("Could not copy. Please copy manually.");
                                    }
                                }}
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
                                onClick={() => setPaymentPopup(null)}
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
            )}

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
                                Book {formatISO(selectedCell.date)} | {minutesToTime(selectedCell.start)} – {minutesToTime(selectedCell.start + modalDuration)}
                            </h3>

                            {/* Student selector (inside booking popup) */}
                            <div style={{ marginTop: 10 }}>
                                <div style={{ fontWeight: 900, marginBottom: 8 }}>Student</div>

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    {students.map((s) => {
                                        const selected = selectedStudentId === s.id;
                                        const initials =
                                            (s.full_name || "")
                                                .trim()
                                                .split(/\s+/)
                                                .slice(0, 2)
                                                .map((p) => (p[0] || "").toUpperCase())
                                                .join("") || "?";

                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedStudentId(s.id);
                                                    // switching student can change base price
                                                    setDriveMinutes(null);
                                                    setPriceQuote(null);
                                                    setPricingError("");
                                                }}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    padding: "10px 12px",
                                                    borderRadius: 12,
                                                    border: selected ? "2px solid #1f7aea" : "1px solid #ddd",
                                                    background: selected ? "#f3f7ff" : "#fff",
                                                    cursor: "pointer",
                                                    fontWeight: 900,
                                                }}
                                                aria-pressed={selected}
                                            >
                                                <div
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 999,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        background: selected ? "#1f7aea" : "#e9eefc",
                                                        color: selected ? "#fff" : "#1f7aea",
                                                        fontWeight: 900,
                                                        fontSize: 13,
                                                        flex: "0 0 auto",
                                                    }}
                                                >
                                                    {initials}
                                                </div>

                                                <div style={{ textAlign: "left" }}>
                                                    <div style={{ lineHeight: 1.1 }}>{s.full_name}</div>
                                                    {typeof s.year_level !== "undefined" && s.year_level !== null && (
                                                        <div style={{ marginTop: 4, fontSize: 12, color: "#666", fontWeight: 800 }}>
                                                            Year {s.year_level}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}

                                    <a
                                        href="/parent/students"
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "10px 12px",
                                            borderRadius: 12,
                                            border: "1px dashed #bbb",
                                            background: "#fff",
                                            color: "#1f7aea",
                                            fontWeight: 900,
                                            textDecoration: "none",
                                        }}
                                    >
                                        + Add student
                                    </a>
                                </div>
                            </div>

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
                                <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Lesson type</label>

                                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <input
                                            type="radio"
                                            name="lessonMode"
                                            value="online"
                                            checked={lessonMode === "online"}
                                            onChange={() => setLessonMode("online")}
                                        />
                                        Online
                                    </label>

                                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <input
                                            type="radio"
                                            name="lessonMode"
                                            value="in_person"
                                            checked={lessonMode === "in_person"}
                                            onChange={() => setLessonMode("in_person")}
                                        />
                                        In person
                                    </label>
                                </div>
                            </div>

                            {lessonMode === "in_person" && (
                                <div style={{ marginTop: 10 }}>
                                    <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Address</label>

                                    <input
                                        value={bookingAddress}
                                        onChange={(e) => {
                                            setBookingAddress(e.target.value);
                                            setDriveMinutes(null);
                                            setPriceQuote(null);
                                            setPricingError("");
                                        }}
                                        placeholder="Enter your address for an in-person lesson"
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            borderRadius: 8,
                                            border: "1px solid #ddd",
                                        }}
                                    />

                                    <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const addr = (bookingAddress || "").trim();
                                                if (!selectedStudentId) {
                                                    setPricingError("Please select a student first.");
                                                    return;
                                                }
                                                if (!addr) {
                                                    setPricingError("Please enter an address first.");
                                                    return;
                                                }
                                                calculateTravelCost(addr);
                                            }}
                                            disabled={pricingLoading}
                                            style={{
                                                border: "1px solid #ddd",
                                                background: "#fff",
                                                borderRadius: 10,
                                                padding: "10px 12px",
                                                cursor: pricingLoading ? "wait" : "pointer",
                                                fontWeight: 900,
                                            }}
                                        >
                                            {pricingLoading ? "Calculating..." : "Calculate price"}
                                        </button>

                                        {priceQuote && typeof driveMinutes === "number" && (
                                            <div style={{ fontSize: 13, color: "#333" }}>
                                                Price:&nbsp;
                                                <strong>${priceQuote.base}</strong>
                                                &nbsp;(base)&nbsp;+&nbsp;
                                                <strong>${driveMinutes}</strong>
                                                &nbsp;(travel)&nbsp;=&nbsp;
                                                <strong>${priceQuote.total}</strong>
                                            </div>
                                        )}
                                        {/* <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                                            Travel fee is $1 per driving minute
                                        </div> */}

                                    </div>

                                    {pricingError && (
                                        <div style={{ marginTop: 8, color: "#b00020", fontWeight: 800 }}>
                                            {pricingError}
                                        </div>
                                    )}

                                    {priceQuote && (
                                        <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
                                            <div style={{ fontWeight: 900, marginBottom: 6 }}>Estimated price (UNPAID)</div>
                                            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 6, columnGap: 10, fontSize: 14 }}>
                                                <div style={{ color: "#666", fontWeight: 800 }}>Base lesson</div>
                                                <div style={{ fontWeight: 900 }}>${priceQuote.base}</div>

                                                <div style={{ color: "#666", fontWeight: 800 }}>Travel fee</div>
                                                <div style={{ fontWeight: 900 }}>${priceQuote.travel}</div>

                                                <div style={{ color: "#666", fontWeight: 800 }}>Total</div>
                                                <div style={{ fontWeight: 900 }}>${priceQuote.total}</div>
                                            </div>
                                        </div>
                                    )}

                                    <p style={{ margin: "8px 0 0", color: "#555", fontSize: 13 }}>
                                        This will be saved to your profile after booking.
                                    </p>
                                </div>
                            )}

                            <div style={{ marginTop: 10 }}>
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
                                        if (!selectedStudentId) {
                                            setMessage("Please select a student before confirming.");
                                            return;
                                        }

                                        if (lessonMode === "in_person" && !priceQuote) {
                                            setMessage("Please calculate the price before confirming an in-person booking.");
                                            return;
                                        }

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

            {students.length === 0 ? (
                <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
                    <div style={{ fontWeight: 800 }}>Add a student first</div>
                    <p style={{ margin: "6px 0 0", color: "#555" }}>
                        Bookings are made per student, so you’ll need to add at least one.
                    </p>
                    <a
                        href="/parent/students"
                        style={{ display: "inline-block", marginTop: 10, fontWeight: 800, color: "#1f7aea", textDecoration: "none" }}
                    >
                        + Add a student
                    </a>
                </div>
            ) : (
                <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Booking for</div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {students.map((s) => {
                            const selected = selectedStudentId === s.id;
                            const initials = (s.full_name || "")
                                .trim()
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((p) => (p[0] || "").toUpperCase())
                                .join("") || "?";

                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStudentId(s.id);
                                        // Reset in-person price calc if switching students (base price may change)
                                        setDriveMinutes(null);
                                        setPriceQuote(null);
                                        setPricingError("");
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: selected ? "2px solid #1f7aea" : "1px solid #ddd",
                                        background: selected ? "#f3f7ff" : "#fff",
                                        cursor: "pointer",
                                        fontWeight: 900,
                                    }}
                                    aria-pressed={selected}
                                >
                                    <div
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 999,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: selected ? "#1f7aea" : "#e9eefc",
                                            color: selected ? "#fff" : "#1f7aea",
                                            fontWeight: 900,
                                            fontSize: 13,
                                            flex: "0 0 auto",
                                        }}
                                    >
                                        {initials}
                                    </div>

                                    <div style={{ textAlign: "left" }}>
                                        <div style={{ lineHeight: 1.1 }}>{s.full_name}</div>
                                        {typeof s.year_level !== "undefined" && s.year_level !== null && (
                                            <div style={{ marginTop: 4, fontSize: 12, color: "#666", fontWeight: 800 }}>
                                                Year {s.year_level}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        <a
                            href="/parent/students"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: "1px dashed #bbb",
                                background: "#fff",
                                color: "#1f7aea",
                                fontWeight: 900,
                                textDecoration: "none",
                            }}
                        >
                            + Add student
                        </a>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        onClick={() => setMonthOffset((prev) => Math.max(minWeekOffset, prev - 1))}
                        disabled={monthOffset <= minWeekOffset}
                    >
                        ◀
                    </button>

                    <div>
                        Week of {formatISO(weekDays[0].iso)} to {formatISO(weekDays[6].iso)}
                    </div>

                    <button
                        onClick={() => setMonthOffset((prev) => Math.min(minWeekOffset + 3, prev + 1))}
                        disabled={monthOffset >= minWeekOffset + 3}
                    >
                        ▶
                    </button>
                </div>

                {students.length > 0 && (
                    <div className="gridScroll" style={{ marginTop: 12, position: "relative" }}>
                        <div className="gridInner" style={{
                            display: "grid",
                            gridTemplateColumns: "80px repeat(7,1fr)",
                            gap: 1,
                            border: "1px solid #eee"
                        }}>
                            <div style={{ padding: 8, background: "#fafafa" }} />

                            {weekDays.map((d) => (
                                <div
                                    key={d.iso}
                                    style={{ padding: 8, textAlign: "center", fontWeight: 600, cursor: "default" }}
                                >
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

                                        return (
                                            <div
                                                key={`${d.iso}-${h}-${row}`}
                                                style={{ borderLeft: "1px solid #eee", borderTop: "1px solid #eee", padding: 0 }}
                                            >
                                                <div
                                                    onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                                    onMouseEnter={() => {
                                                        if (loadingWeek) return;
                                                        // Hour window starting at this cell
                                                        setHoveredRange({ date: d.iso, start: start00, end: start00 + 60 });
                                                        if (!canBook00) return;
                                                        setHoverPreview({ date: d.iso, start: start00, end: start00 + 60 });
                                                    }}
                                                    onMouseLeave={() => {
                                                        setHoveredRange(null);
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
                                                            hoveredRange &&
                                                                hoveredRange.date === d.iso &&
                                                                start00 >= hoveredRange.start &&
                                                                start00 < hoveredRange.end
                                                                ? "2px solid #1f7aea"
                                                                : "none",
                                                        outlineOffset: -2,
                                                    }}
                                                    title={loadingWeek ? "Loading availability..." : canBook00 ? `Click to book ${d.iso} ${minutesToTime(start00)}` : "Unavailable"}
                                                />

                                                <div
                                                    onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                                    onMouseEnter={() => {
                                                        if (loadingWeek) return;
                                                        // Hour window starting at this cell (09:30-10:30 style)
                                                        setHoveredRange({ date: d.iso, start: start30, end: start30 + 60 });
                                                        if (!canBook30) return;
                                                        setHoverPreview({ date: d.iso, start: start30, end: start30 + 60 });
                                                    }}
                                                    onMouseLeave={() => {
                                                        setHoveredRange(null);
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
                                                            hoveredRange &&
                                                                hoveredRange.date === d.iso &&
                                                                start30 >= hoveredRange.start &&
                                                                start30 < hoveredRange.end
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
                                pointerEvents: "none",
                            }}>
                                {formatISO(hoverPreview.date)} - {minutesToTime(hoverPreview.start)} - {minutesToTime(hoverPreview.end)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {message && <p style={{ marginTop: 12 }}>{message}</p>}
        </main>
    );
}
