"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { logAudit } from "../../lib/auditClient";
import PaymentPopup from "./components/PaymentPopup";
import StudentChips from "./components/StudentChips";
import LessonModeToggle from "./components/LessonModeToggle";
import TutorSubjectPicker from "./components/TutorSubjectPicker";
// import BookingModal from "./components/BookingModal";
import BookingCalendar from "./components/BookingCalendar";
import SubjectChips from "./components/SubjectChips";
import TutorCards from "./components/TutorCards";

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
    const [paymentPopup, setPaymentPopup] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [requestingKey, setRequestingKey] = useState("");
    const [terms, setTerms] = useState([]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [selectedTermId, setSelectedTermId] = useState("");
    const [monthOffset, setMonthOffset] = useState(0); // week offset (0 = this week)
    const [minWeekOffset, setMinWeekOffset] = useState(0); // first week that has any availability
    const [lessonMode, setLessonMode] = useState("online"); // "online" | "in_person"
    const [profileAddress, setProfileAddress] = useState("");
    const [bookingAddress, setBookingAddress] = useState("");
    const [hoverPreview, setHoverPreview] = useState(null); // { date, start, end }
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const [slotsByDate, setSlotsByDate] = useState({});
    const [loadingWeek, setLoadingWeek] = useState(false);
    const isLoading = loadingWeek;
    const [hoveredRange, setHoveredRange] = useState(null); // { date, start, end }
    const [driveMinutes, setDriveMinutes] = useState(null);
    const [priceQuote, setPriceQuote] = useState(null); // { base, travel, total }
    const [pricingError, setPricingError] = useState("");
    const [pricingLoading, setPricingLoading] = useState(false);
    const [parentId, setParentId] = useState(null);
    const [bookingsByDate, setBookingsByDate] = useState({});
    const [otherBookingsByDate, setOtherBookingsByDate] = useState({});
    const [tutors, setTutors] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [tutorSubjects, setTutorSubjects] = useState({}); // { tutorId: [subjectId,...] }
    const [selectedTutorId, setSelectedTutorId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [creditBalance, setCreditBalance] = useState(0);
    const [pendingSlot, setPendingSlot] = useState(null);

    const statusToBucket = (status) => {
        const s = String(status || "").toLowerCase();
        if (["accepted", "confirmed", "approved"].includes(s)) return "accepted";
        if (["requested", "pending"].includes(s)) return "requested";
        if (["cancelled", "canceled", "deleted"].includes(s)) return "cancelled";
        return "other";
    };

    const onStartPoliPay = async () => {
        if (!paymentPopup?.bookingId) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) throw new Error("Not signed in");

            const res = await fetch("/api/poli/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ bookingId: paymentPopup.bookingId }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json?.navigateUrl) {
                console.error("POLi create error:", json);
                alert(json?.error || "POLi payment failed to start.");
                return;
            }

            window.location.href = json.navigateUrl;
        } catch (err) {
            console.error(err);
            alert(err?.message || "Could not start POLi payment.");
        }
    };

    const safePostEmail = async (url, payload) => {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                console.error("Email failed:", url, res.status, txt);
            }
        } catch (err) {
            console.error("Email exception:", url, err);
        }
    };


    const timeStrToMinutes = (t) => timeToMinutes(String(t || "").slice(0, 5));

    const getSelectedStudent = () => students.find((s) => s.id === selectedStudentId) || null;
    const getSelectedTutor = () => tutors.find((t) => t.id === selectedTutorId) || null;

    const calcBasePrice = (yearLevel) => (Number(yearLevel) >= 7 ? 40 : 30);

    /**
    * Given a subjectId, return tutors who teach it.
    * tutorSubjects = { tutorId: [subjectId,...] }
    */
    const getTutorsForSubject = (subjectId) => {
        if (!subjectId) return [];
        return tutors.filter((t) => (tutorSubjects[t.id] || []).includes(subjectId));
    };

    const handleSelectStudent = (studentId) => {
        setSelectedStudentId(studentId);

        // Reset the rest of the wizard when student changes
        setSelectedSubjectId("");
        setSelectedTutorId("");
    };

    const handleSelectSubject = (subjectId) => {
        setSelectedSubjectId(subjectId);

        // Reset tutor when subject changes
        setSelectedTutorId("");
    };

    const handleSelectTutor = (tutorId) => {
        setSelectedTutorId(tutorId);
    };

    async function calculateTravelCost() {
        setPricingError("");
        setPricingLoading(true);

        try {
            // Use current booking address from state
            const address = bookingAddress?.trim();
            if (!address) throw new Error("Please enter an address");

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
            const yearLevel = st?.year_level ?? 7;
            const base = calcBasePrice(yearLevel);
            const travel = Math.max(0, Math.round(mins)); // $1 per minute
            const total = base + travel;

            setDriveMinutes(mins);
            setPriceQuote({ base, travel, total });
        } catch (e) {
            setDriveMinutes(null);
            setPriceQuote(null);
            setPricingError(e?.message || "Could not calculate price");
        } finally {
            setPricingLoading(false);
        }
    }

    const loadCreditBalance = async (parentId) => {
        const { data, error } = await supabase
            .from("credit_balances")
            .select("balance_nzd")
            .eq("parent_id", parentId)
            .maybeSingle();

        if (error) {
            console.error("credit_balances error:", error);
            return;
        }

        setCreditBalance(Number(data?.balance_nzd ?? 0));
    };

    const fetchSlotsForDate = async (selectedDate, selectedTutorId) => {
        const { aucklandDate } = getAucklandNowISODateAndMinutes();

        // block past dates and today
        if (selectedDate <= aucklandDate) return [];

        if (!selectedTutorId) return [];

        const { data: tutor, error: tutorError } = await supabase
            .from("tutors")
            .select("id, default_window_start, default_window_end")
            .eq("id", selectedTutorId)
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

        // ---- subtract Google Calendar busy (if tutor connected) ----
        try {
            const dayStart = new Date(`${selectedDate}T00:00:00`);
            const dayEnd = new Date(`${selectedDate}T23:59:59`);

            const googleRes = await fetch(
                `/api/tutors/google-freebusy?tutorId=${encodeURIComponent(tutor.id)}&timeMin=${encodeURIComponent(dayStart.toISOString())}&timeMax=${encodeURIComponent(dayEnd.toISOString())}`
            );

            const googleJson = await googleRes.json().catch(() => null);

            if (googleRes.ok && googleJson?.ok && Array.isArray(googleJson.busy)) {
                const googleBusy = googleJson.busy.map((b) => ({
                    start: new Date(b.start).getTime(),
                    end: new Date(b.end).getTime(),
                }));

                generated = generated.filter((slot) => {
                    const slotStart = new Date(`${selectedDate}T${minutesToTime(slot.start)}:00`).getTime();
                    const slotEnd = new Date(`${selectedDate}T${minutesToTime(slot.end)}:00`).getTime();

                    return !googleBusy.some((gb) => slotStart < gb.end && slotEnd > gb.start);
                });
            }
        } catch (e) {
            // If Google fails, do NOT break booking.
            console.error("Google freebusy failed:", e?.message || e);
        }
        // ---- end Google busy ----

        // existing bookings (we still block booking them, but we’ll DISPLAY them on the calendar)
        const { data: busy, error: busyErr } = await supabase
            .from("booking_busy_blocks")
            .select("start_time, end_time, status")
            .eq("tutor_id", tutor.id)
            .eq("session_date", selectedDate);

        if (busyErr) {
            console.error("busy blocks fetch error (slots):", busyErr);
        }

        // remove overlaps for busy blocks (they already exclude cancelled/deleted)
        const occupying = busy || [];

        if (occupying.length) {
            generated = generated.filter((slot) => {
                return !occupying.some((b) => {
                    const bs = timeToMinutes(String(b.start_time).slice(0, 5));
                    const be = timeToMinutes(String(b.end_time).slice(0, 5));
                    return slot.start < be && slot.end > bs;
                });
            });
        }

        return generated;
    };

    const loadWeekSlots = async (days, tutorId) => {
        setLoadingWeek(true);
        const map = {};

        for (const d of days) {
            map[d.iso] = await fetchSlotsForDate(d.iso, tutorId);
        }

        setSlotsByDate(map);
        setLoadingWeek(false);

        const totalSlotsThisWeek = Object.values(map).reduce((sum, arr) => sum + (arr?.length || 0), 0);

        if (totalSlotsThisWeek === 0 && monthOffset < 12 && minWeekOffset === 0) {
            setMonthOffset((prev) => prev + 1);
        }

        if (totalSlotsThisWeek > 0 && minWeekOffset === 0 && monthOffset > 0) {
            setMinWeekOffset(monthOffset);
        }
    };

    const loadWeekBookings = async (days, selectedTutorId) => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) await loadCreditBalance(user.id);

        if (!user) return;

        const dayIsos = days.map((d) => d.iso);

        // 1) YOUR bookings (coloured)
        const { data, error } = await supabase
            .from("bookings")
            .select("id, session_date, start_time, end_time, status, student_id")
            .eq("parent_id", user.id)
            .eq("tutor_id", selectedTutorId)
            .in("session_date", dayIsos);

        if (error) {
            setMessage(error.message);
            return;
        }

        const myMap = {};
        for (const b of (data || []).filter((b) => !["cancelled", "deleted"].includes(String(b.status || "").toLowerCase()))) {
            if (!myMap[b.session_date]) myMap[b.session_date] = [];
            myMap[b.session_date].push(b);
        }
        setBookingsByDate(myMap);

        // 2) OTHER parents’ bookings for the same tutor/week (grey, no details)
        if (!selectedTutorId) {
            setOtherBookingsByDate({});
            return;
        }

        const { data: other, error: otherErr } = await supabase
            .from("booking_busy_blocks")
            .select("session_date, start_time, end_time, status")
            .eq("tutor_id", selectedTutorId)
            .in("session_date", dayIsos);

        if (process.env.NODE_ENV !== "production") {
            console.log("busy blocks rows:", other?.length, other);
        }


        if (otherErr) {
            console.error("booking_busy_blocks error:", otherErr);
            setMessage(`busy blocks error: ${otherErr.message}`);
            setOtherBookingsByDate({});
            return;
        }

        const otherMap = {};
        for (const b of (other || [])) {
            if (!otherMap[b.session_date]) otherMap[b.session_date] = [];
            otherMap[b.session_date].push(b);
        }
        setOtherBookingsByDate(otherMap);
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

        if (user) await loadCreditBalance(user.id);

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

        if (!selectedTutorId) {
            setMessage("Please select a tutor first.");
            setRequestingKey("");
            return;
        }

        const { data: tutor, error: tutorError } = await supabase
            .from("tutors")
            .select("id")
            .eq("id", selectedTutorId)
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
                subject_id: selectedSubjectId || null,
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
            const iso = toAucklandISODate(dt);

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
                subject_id: selectedSubjectId || null,
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
                notes: null,
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

        await logAudit({
            action: "booking.series_created",
            entityType: "recurring_group",
            entityId: group.id,
            metadata: {
                tutor_id: tutor.id,
                parent_id: user.id,
                student_id: selectedStudentId,
                subject_id: selectedSubjectId || null,
                term_id: term.id,
                generated_count: bookingsToInsert.length,
                first_date: sessionDate,
                last_date: term.end_date,
                start_time: minutesToTime(slot.start),
                end_time: minutesToTime(slot.end),
                lesson_mode: lessonMode === "in_person" ? "in_person" : "online",
                payment_method: "bank_transfer",
                payment_status: "unpaid",
                is_recurring: true,
            },
        });

        // ---- EMAILS: recurring booking requested (parent + tutor) ----
        const parentEmail = user?.email || "";
        const studentFullName = (students.find((s) => s.id === selectedStudentId)?.full_name || "").trim();
        const studentFirstName = studentFullName.split(" ")[0] || "Student";
        const tutorName = (tutors.find((t) => t.id === selectedTutorId)?.display_name || "").trim();

        const { data: tutorRow } = await supabase
            .from("tutors")
            .select("email")
            .eq("id", selectedTutorId)
            .single();

        const tutorEmail = (tutorRow?.email || "").trim();

        if (parentEmail) {
            await safePostEmail("/api/email/booking-series-requested-parent", {
                parentEmail,
                studentFirstName,
                tutorName,
                startTime: minutesToTime(slot.start),
                endTime: minutesToTime(slot.end),
                generatedCount: bookingsToInsert.length,
            });
        }

        if (tutorEmail) {
            await safePostEmail("/api/email/booking-series-requested-tutor", {
                tutorEmail,
                studentFirstName,
                startTime: minutesToTime(slot.start),
                endTime: minutesToTime(slot.end),
                generatedCount: bookingsToInsert.length,
                parentEmail,
            });
        }
        // ---- END EMAILS ----


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

        if (user) await loadCreditBalance(user.id);

        if (!user) {
            router.push("/auth/sign-in");
            return;
        }

        if (!selectedTutorId) {
            setMessage("Please select a tutor first.");
            setRequestingKey("");
            return;
        }

        const { data: tutor, error: tutorError } = await supabase
            .from("tutors")
            .select("id")
            .eq("id", selectedTutorId)
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

        const { data: newBooking, error } = await supabase
            .from("bookings")
            .insert({
                tutor_id: tutor.id,
                parent_id: user.id,
                student_id: selectedStudentId,
                subject_id: selectedSubjectId || null,
                session_date: sessionDate,
                start_time: minutesToTime(slot.start),
                end_time: minutesToTime(slot.end),

                lesson_mode: lessonMode === "in_person" ? "in_person" : "online",
                booking_address_text: lessonMode === "in_person" ? (bookingAddress || "").trim() : null,

                status: "requested",
                is_recurring: false,
                notes: null,

                payment_status: "unpaid",
                payment_method: "bank_transfer",

                amount_base: base,
                amount_travel: travel,
                amount_total: total,
            })
            .select("id")
            .single();

        if (error) {
            setMessage(error.message);
            setRequestingKey("");
            return;
        }

        await logAudit({
            action: "booking.created",
            entityType: "booking",
            entityId: newBooking.id,
            metadata: {
                tutor_id: tutor.id,
                parent_id: user.id,
                student_id: selectedStudentId,
                subject_id: selectedSubjectId || null,
                session_date: sessionDate,
                start_time: minutesToTime(slot.start),
                end_time: minutesToTime(slot.end),
                lesson_mode: lessonMode === "in_person" ? "in_person" : "online",
                amount_base: base,
                amount_travel: travel,
                amount_total: total,
                payment_method: "bank_transfer",
                payment_status: "unpaid",
                is_recurring: false,
            },
        });

        // ---- EMAILS: booking requested (parent + tutor) ----
        const parentEmail = user?.email || "";
        const studentFullName = (students.find((s) => s.id === selectedStudentId)?.full_name || "").trim();
        const studentFirstName = studentFullName.split(" ")[0] || "Student";
        const tutorName = (tutors.find((t) => t.id === selectedTutorId)?.display_name || "").trim();

        // fetch tutor email from DB
        const { data: tutorRow } = await supabase
            .from("tutors")
            .select("email")
            .eq("id", selectedTutorId)
            .single();

        const tutorEmail = (tutorRow?.email || "").trim();

        if (parentEmail) {
            await safePostEmail("/api/email/booking-requested-parent", {
                parentEmail,
                studentFirstName,
                sessionDate,
                startTime: minutesToTime(slot.start),
                endTime: minutesToTime(slot.end),
                tutorName,
            });
        }

        if (tutorEmail) {
            await safePostEmail("/api/email/booking-requested-tutor", {
                tutorEmail,
                studentFirstName,
                sessionDate,
                startTime: minutesToTime(slot.start),
                endTime: minutesToTime(slot.end),
                parentEmail,
            });
        }
        // ---- END EMAILS ----


        // show a friendly popup instead of a wall-of-text message
        const studentName = (students.find((s) => s.id === selectedStudentId)?.full_name || "").trim();

        setPaymentPopup({
            bookingId: newBooking.id,
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

            if (user) await loadCreditBalance(user.id);

            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            setParentId(user.id);

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

                // Wizard behaviour: do NOT auto-select.
                // Parent must choose student -> subject -> tutor.
                setSelectedStudentId("");
            }

            const { data: tutorRows, error: tutorErr } = await supabase
                .from("tutors")
                .select("id, display_name")
                .eq("is_active", true)
                .order("display_name", { ascending: true });

            if (tutorErr) setMessage(tutorErr.message);
            setTutors(tutorRows || []);

            // Wizard behaviour: do NOT auto-select
            setSelectedTutorId("");

            const { data: subjectRows, error: subjectErr } = await supabase
                .from("subjects")
                .select("id, name")
                .order("name", { ascending: true });

            if (subjectErr) setMessage(subjectErr.message);
            setSubjects(subjectRows || []);

            // Wizard behaviour: do NOT auto-select
            setSelectedSubjectId("");

            const { data: tsRows, error: tsErr } = await supabase
                .from("tutor_subjects")
                .select("tutor_id, subject_id");

            if (tsErr) setMessage(tsErr.message);
            const tsMap = {};
            for (const r of (tsRows || [])) {
                if (!tsMap[r.tutor_id]) tsMap[r.tutor_id] = [];
                tsMap[r.tutor_id].push(r.subject_id);
            }
            setTutorSubjects(tsMap);

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

    const toAucklandISODate = (dateObj) => {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Pacific/Auckland",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(dateObj); // YYYY-MM-DD
    };

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
            iso: toAucklandISODate(d),
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
        if (!selectedTutorId) return;
        loadWeekSlots(weekDays, selectedTutorId);
        loadWeekBookings(weekDays, selectedTutorId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthOffset, selectedTutorId]);

    useEffect(() => {
        if (checking) return;
        // If we are still on offset 0 and it has availability, explicitly anchor at 0.
        if (minWeekOffset === 0 && monthOffset === 0) {
            // Do nothing here; anchoring at 0 is already correct.
            // This effect exists just to make the intent explicit.
        }
    }, [checking, monthOffset, minWeekOffset]);

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    /**
 * When a calendar cell is clicked, open the BookingModal.
 * We keep the modal logic in one place so both wizard and calendar behave the same.
 */
    const handleCellClick = ({ date, start }) => {
        // default to 60 minutes (one hour)
        setPendingSlot({ date, start, end: start + 60 });
        setMessage("");
    };

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>

            {/* Payment popup (after booking request) */}
            <PaymentPopup
                payment={paymentPopup}
                creditBalance={creditBalance}
                onPayWithCredit={async (bookingId) => {
                    try {
                        const { data, error } = await supabase.rpc("pay_booking_with_credit", {
                            p_booking_id: bookingId,
                        });
                        if (error) throw new Error(error.message);

                        await logAudit({
                            action: "payment.paid_with_credit",
                            entityType: "booking",
                            entityId: bookingId,
                            metadata: {
                                amount_spent: data?.amount_spent,
                                ledger_id: data?.ledger_id,
                            },
                        });

                        setMessage(`Paid with credit: $${Number(data?.amount_spent ?? 0).toFixed(2)} NZD`);

                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            await Promise.all([
                                loadCreditBalance(user.id),
                                loadWeekBookings(weekDays, selectedTutorId),
                            ]);
                        }

                        setPaymentPopup(null);
                    } catch (e) {
                        setMessage(e?.message || "Could not pay with credit.");
                    }
                }}
                formatISO={formatISO}
                buildPaymentCopyText={buildPaymentCopyText}
                onClose={() => setPaymentPopup(null)}
                onDone={() => {
                    // Close the popup and take the parent to their dashboard
                    // so they can immediately see the booking they just created.
                    setPaymentPopup(null);
                    router.push("/parent/dashboard");
                    // router.refresh();

                }}
                // onStartPoliPay={async (bookingId) => {
                //     try {
                //         setMessage("Redirecting to POLi...");

                //         const { data: { session } } = await supabase.auth.getSession();
                //         const accessToken = session?.access_token;

                //         if (!accessToken) {
                //             alert("You are not logged in. Please sign in again.");
                //             return;
                //         }

                //         const res = await fetch("/api/poli/create", {
                //             method: "POST",
                //             headers: {
                //                 "Content-Type": "application/json",
                //                 Authorization: `Bearer ${accessToken}`,
                //             },
                //             body: JSON.stringify({ bookingId }), // ✅ USE THE PARAM, not booking.id
                //         });

                //         const json = await res.json().catch(() => ({}));

                //         if (!res.ok) {
                //             throw new Error(json?.error || "POLi payment could not be started.");
                //         }

                //         if (!json?.redirectUrl) {
                //             throw new Error("POLi did not return a redirect URL.");
                //         }

                //         window.location.assign(json.redirectUrl);
                //     } catch (e) {
                //         setMessage(e?.message || "POLi payment could not be started.");
                //     }
                // }}

                onStartPoliPay={async (bookingId) => {
                    try {
                        setMessage("Redirecting to POLi...");

                        // 1. Get the user's auth token
                        const { data: { session } } = await supabase.auth.getSession();
                        const accessToken = session?.access_token;

                        if (!accessToken) {
                            alert("You are not logged in. Please sign in again.");
                            return;
                        }

                        // 2. Call your API
                        const res = await fetch("/api/poli/create", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({ bookingId }),
                        });

                        const json = await res.json(); // Don't use .catch() here so we see the real error

                        if (!res.ok) {
                            throw new Error(json?.error || "POLi payment could not be started.");
                        }

                        // --- FIX IS HERE: Use 'navigateUrl' to match your backend ---
                        if (json.navigateUrl) {
                            window.location.href = json.navigateUrl;
                        } else {
                            console.error("POLi response missing URL:", json);
                            throw new Error("POLi did not return a payment URL.");
                        }

                    } catch (e) {
                        console.error(e);
                        setMessage(e?.message || "POLi payment could not be started.");
                    }
                }}
                onCopied={() => setMessage("Payment details copied.")}
                onCopyFailed={() => setMessage("Could not copy. Please copy manually.")}
            />


            {/* Booking Wizard */}
            <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px" }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 950 }}>Book a lesson</h1>
                <div style={{ marginTop: 6, color: "#555", fontWeight: 650 }}>
                    Follow the steps below. You’ll see the calendar only after choosing a tutor.
                </div>

                {students.length === 0 ? (
                    <div style={{ marginTop: 16, padding: 14, border: "1px solid #eee", borderRadius: 16, background: "#fff" }}>
                        <div style={{ fontWeight: 900 }}>Add a student first</div>
                        <div style={{ marginTop: 6, color: "#555", fontWeight: 650 }}>
                            Bookings are made per student, so you’ll need to add at least one.
                        </div>
                        <a
                            href="/parent/students"
                            style={{ display: "inline-block", marginTop: 10, fontWeight: 900, color: "#1f7aea", textDecoration: "none" }}
                        >
                            + Add a student
                        </a>
                    </div>
                ) : (
                    <div style={{ marginTop: 16, padding: 14, border: "1px solid #eee", borderRadius: 16, background: "#fff" }}>
                        {/* Step 1 */}
                        {!selectedStudentId ? (
                            <>
                                <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 10 }}>
                                    Who are you booking for?
                                </div>

                                <StudentChips
                                    students={students}
                                    selectedStudentId={selectedStudentId}
                                    onSelectStudent={handleSelectStudent}
                                    addStudentHref="/parent/students"
                                    showYearLevel={true}
                                />
                            </>
                        ) : null}

                        {/* Step 2 */}
                        {selectedStudentId && !selectedSubjectId ? (
                            <>
                                <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 10 }}>
                                    What subject?
                                </div>

                                <SubjectChips
                                    subjects={subjects}
                                    selectedSubjectId={selectedSubjectId}
                                    onSelectSubject={handleSelectSubject}
                                />

                                <div style={{ marginTop: 12 }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleSelectStudent("");
                                            setPendingSlot(null);
                                        }}
                                        style={{
                                            border: "1px solid #ddd",
                                            background: "#fff",
                                            borderRadius: 10,
                                            padding: "8px 10px",
                                            fontWeight: 900,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Back
                                    </button>
                                </div>
                            </>
                        ) : null}

                        {/* Step 3 */}
                        {selectedStudentId && selectedSubjectId && !selectedTutorId ? (
                            <>
                                <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 10 }}>
                                    Choose a tutor for this subject
                                </div>

                                <TutorCards
                                    tutorsToShow={getTutorsForSubject(selectedSubjectId)}
                                    selectedTutorId={selectedTutorId}
                                    onSelectTutor={handleSelectTutor}
                                />

                                <div style={{ marginTop: 12 }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedSubjectId("");
                                            setPendingSlot(null);
                                        }}
                                        style={{
                                            border: "1px solid #ddd",
                                            background: "#fff",
                                            borderRadius: 10,
                                            padding: "8px 10px",
                                            fontWeight: 900,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Back
                                    </button>
                                </div>
                            </>
                        ) : null}

                        {/* Step 4 */}
                        {selectedStudentId && selectedSubjectId && selectedTutorId ? (
                            <>
                                <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 10 }}>
                                    Pick a time from the {getSelectedTutor()?.display_name || "Selected"}’s calendar
                                </div>

                                <div style={{ marginBottom: 10, color: "#555", fontWeight: 650 }}>
                                    Student: <b>{getSelectedStudent()?.full_name || "Selected"}</b>
                                    {/* <b> | </b>
                                    Tutor: <b>{getSelectedTutor()?.display_name || "Selected"}</b> */}
                                </div>

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTutorId("");
                                            setPendingSlot(null);
                                        }}
                                        style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 10, padding: "8px 10px", fontWeight: 900, cursor: "pointer" }}
                                    >
                                        Change tutor
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedSubjectId("");
                                            setPendingSlot(null);
                                        }}

                                        style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 10, padding: "8px 10px", fontWeight: 900, cursor: "pointer" }}
                                    >
                                        Change subject
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleSelectStudent("");
                                            setPendingSlot(null);
                                        }}
                                        style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 10, padding: "8px 10px", fontWeight: 900, cursor: "pointer" }}
                                    >
                                        Change student
                                    </button>
                                </div>

                                <LessonModeToggle
                                    lessonMode={lessonMode}
                                    onChangeMode={setLessonMode}
                                    bookingAddress={bookingAddress}
                                    onAddressChange={(addr) => {
                                        setBookingAddress(addr);
                                        // Reset the quote when address changes so you don't show stale prices
                                        setPriceQuote(null);
                                        setDriveMinutes(null);
                                        setPricingError("");
                                    }}
                                    pricingLoading={pricingLoading}
                                    pricingError={pricingError}
                                    priceQuote={priceQuote}
                                    driveMinutes={driveMinutes}
                                    onCalculatePrice={calculateTravelCost}
                                />

                                {pendingSlot ? (
                                    <div
                                        style={{
                                            position: "sticky",
                                            bottom: 0,
                                            marginTop: 14,
                                            padding: 12,
                                            border: "1px solid #e6e6e6",
                                            borderRadius: 14,
                                            background: "#fff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{ fontWeight: 900 }}>
                                            Selected:{" "}
                                            {formatISO(pendingSlot.date)}{" "}<br></br>
                                            {minutesToTime(pendingSlot.start)} - {minutesToTime(pendingSlot.end)}
                                        </div>

                                        <div style={{ display: "flex", gap: 10 }}>
                                            <button
                                                type="button"
                                                onClick={() => setPendingSlot(null)}
                                                style={{
                                                    border: "1px solid #ddd",
                                                    background: "#fff",
                                                    borderRadius: 10,
                                                    padding: "10px 12px",
                                                    fontWeight: 900,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Clear
                                            </button>

                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!selectedStudentId) {
                                                        setMessage("Please select a student first.");
                                                        return;
                                                    }

                                                    if (lessonMode === "in_person" && !priceQuote) {
                                                        setMessage("Please calculate the price before confirming an in-person booking.");
                                                        return;
                                                    }

                                                    const slot = { start: pendingSlot.start, end: pendingSlot.end };

                                                    // If you later re-enable recurring, switch this based on isRecurring.
                                                    await handleRequestBooking(pendingSlot.date, slot);

                                                    // Clear selection after requesting
                                                    setPendingSlot(null);
                                                }}
                                                style={{
                                                    border: "0",
                                                    background: "#1f7aea",
                                                    color: "#fff",
                                                    borderRadius: 10,
                                                    padding: "10px 14px",
                                                    fontWeight: 950,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Click to confirm booking
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Week navigation stays, but only inside step 4 */}
                                <div style={{ margin: "12px 0", display: "flex", alignItems: "center", gap: 12 }}>
                                    <button
                                        onClick={() => setMonthOffset((prev) => Math.max(minWeekOffset, prev - 1))}
                                        disabled={monthOffset <= minWeekOffset}
                                    >
                                        ◀
                                    </button>

                                    <div style={{ fontWeight: 850 }}>
                                        Week of {formatISO(weekDays[0].iso)} to {formatISO(weekDays[6].iso)}
                                    </div>

                                    <button
                                        onClick={() => setMonthOffset((prev) => Math.min(minWeekOffset + 3, prev + 1))}
                                        disabled={monthOffset >= minWeekOffset + 3}
                                    >
                                        ▶
                                    </button>
                                </div>

                                <BookingCalendar
                                    weekDays={weekDays}
                                    hours={hours}
                                    slotsByDate={slotsByDate}
                                    bookingsByDate={bookingsByDate}
                                    otherBookingsByDate={otherBookingsByDate}
                                    loadingWeek={loadingWeek}
                                    selectedStudentId={selectedStudentId}
                                    formatISO={formatISO}
                                    minutesToTime={minutesToTime}
                                    timeToMinutes={timeToMinutes}
                                    statusToBucket={statusToBucket}
                                    onCellClick={handleCellClick}
                                    onHoverRange={setHoveredRange}
                                />

                            </>
                        ) : null}
                    </div>
                )}

                {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}
            </div>
        </main>
    );
}
