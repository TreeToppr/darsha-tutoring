"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
import { supabase } from "../../../lib/supabaseClient";
import { logAudit } from "../../../lib/auditClient";
// import DashboardTabs from "./components/DashboardTabs";
// import BookingsList from "./components/BookingsList";
import BookingsCalendarWeek from "./components/BookingsCalendarWeek";
import ProfilePanel from "./components/ProfilePanel";
import ParentTopBar from "./components/ParentTopBar";
import QuickStats from "./components/QuickStats";
import ParentHeroCard from "./components/ParentHeroCard";
// import BookingsCalendarWeekGrid from "./components/BookingsCalendarWeekGrid";
import BookingsList from "./components/BookingsList";

import Link from "next/link";

const formatISO = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};

const statusLabel = (s) => {
    if (!s) return "unknown";
    return s;
};

// const onClearGoogleCompare = () => {
//     setCompareBusy([]);
//     setGooglePreviewEvents([]);
//     setGoogleAppliedEvents([]);
//     setMessage("");
// };

const statusStyle = (s) => {
    const base = {
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#ddd",
        background: "#fff",
    };

    if (s === "accepted") return { ...base, background: "#e9f7ef", borderColor: "#b7e1c5" };
    if (s === "requested") return { ...base, background: "#fff7e6", borderColor: "#ffe0a3" };
    if (s === "cancelled") return { ...base, background: "#f5f5f5", borderColor: "#e0e0e0" };

    return base;
};

// ---- Time helpers (Pacific/Auckland) ----
const timeToMinutes = (t) => {
    // supports "HH:MM" or "HH:MM:SS"
    if (!t) return 0;
    const s = String(t);
    const hh = Number(s.slice(0, 2));
    const mm = Number(s.slice(3, 5));
    return hh * 60 + mm;
};

// async function fetchGoogleFreeBusy(calendarId, range) {
//     // range is optional: { timeMinISO, timeMaxISO }
//     const qs = new URLSearchParams({
//         calendarId: String(calendarId || ""),
//     });

//     if (range?.timeMinISO) qs.set("timeMin", range.timeMinISO);
//     if (range?.timeMaxISO) qs.set("timeMax", range.timeMaxISO);

//     const res = await fetch(`/api/google/calendar/freebusy?${qs.toString()}`, {
//         method: "GET",
//         cache: "no-store",
//     });

//     // Helpful error messages in the UI
//     if (!res.ok) {
//         const text = await res.text().catch(() => "");
//         throw new Error(text || `Google freebusy failed (${res.status})`);
//     }

//     const data = await res.json();

//     // Expecting: { busy: [{ start, end }, ...] }
//     return Array.isArray(data?.busy) ? data.busy : [];
// }

// async function fetchGoogleFreeBusy(calendarId, token, range) {
//     const qs = new URLSearchParams({
//         calendarId: String(calendarId || ""),
//     });

//     if (range?.timeMinISO) qs.set("timeMin", range.timeMinISO);
//     if (range?.timeMaxISO) qs.set("timeMax", range.timeMaxISO);

//     // const res = await fetch(`/api/google/calendar/freebusy?${qs.toString()}`, {
//     //     method: "GET",
//     //     cache: "no-store",
//     //     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     // });

//     const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
//     const accessToken = sessionRes?.session?.access_token;

//     if (sessionErr || !accessToken) {
//         setCompareError("Not signed in");
//         return;
//     }

//     const res = await fetch(
//         `/api/google/calendar/freebusy?calendarId=${encodeURIComponent(selectedCalendarId)}&timeMin=${encodeURIComponent(timeMinISO)}&timeMax=${encodeURIComponent(timeMaxISO)}`,
//         {
//             method: "GET",
//             headers: {
//                 Authorization: `Bearer ${accessToken}`,
//             },
//         }
//     );


//     if (!res.ok) {
//         const text = await res.text().catch(() => "");
//         throw new Error(text || `Google freebusy failed (${res.status})`);
//     }

//     const data = await res.json();
//     return Array.isArray(data?.busy) ? data.busy : [];
// }


const ymdToInt = (ymd) => {
    // "YYYY-MM-DD" -> YYYYMMDD as number
    if (!ymd) return 0;
    return Number(String(ymd).replaceAll("-", ""));
};

const getNowAucklandKey = () => {
    // Key = YYYYMMDD*1440 + minutes (in Pacific/Auckland)
    const parts = new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date());

    const get = (type) => parts.find((p) => p.type === type)?.value;

    const yyyy = get("year");
    const mm = get("month");
    const dd = get("day");
    const hh = get("hour");
    const min = get("minute");

    const ymdInt = Number(`${yyyy}${mm}${dd}`);
    const mins = Number(hh) * 60 + Number(min);

    return ymdInt * 1440 + mins;
};

const bookingStartKey = (b) => {
    const dayInt = ymdToInt(b.session_date);
    const mins = timeToMinutes(b.start_time);
    return dayInt * 1440 + mins;
};

const completedStyle = {
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e0e0e0",
    background: "#f5f5f5",
    color: "#555",
};

const paymentStyle = (p) => {
    const base = {
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#ddd",
        background: "#fff",
        color: "#111",
    };

    if (p === "paid") return { ...base, background: "#e9f7ef", borderColor: "#b7e1c5", color: "#1b5e20" };
    return { ...base, background: "#fff7e6", borderColor: "#ffe0a3", color: "#8a5a00" };
};

const modeStyle = (m) => {
    const base = {
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#ddd",
        background: "#fff",
        color: "#111",
    };

    if (m === "in_person") return { ...base, background: "#f5f5f5", borderColor: "#e0e0e0", color: "#333" };
    return { ...base, background: "#e9eefc", borderColor: "#cdd9ff", color: "#1f7aea" };
};

const toggleBtnStyle = (active) => ({
    padding: "8px 10px",
    borderRadius: 12,
    border: active ? "2px solid #111" : "1px solid #ddd",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
});

// const token = await getSupabaseAccessToken();
// if (!token) throw new Error("Not signed in");

// const preview = await fetchGoogleFreeBusy(googleSelected, token);
// setGooglePreviewEvents(preview);


export default function ParentDashboard() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [message, setMessage] = useState("");
    const [updatingId, setUpdatingId] = useState("");
    const [userId, setUserId] = useState(null);
    const [profile, setProfile] = useState(null);
    const [cancelModal, setCancelModal] = useState(null);
    const [students, setStudents] = useState([]);
    // { booking, scope: "single" | "series", confirmText: "" }
    const [tutors, setTutors] = useState([]);
    // "bookings" | "calendar" | "profile"
    // const [activeTab, setActiveTab] = useState("bookings");

    // Credits temporarily disabled
    // const [creditBalanceNzd, setCreditBalanceNzd] = useState(0);
    // const [creditLedgerRows, setCreditLedgerRows] = useState([]);

    // const [view, setView] = useState("both"); // "both" | "profile" | "calendar"
    const [view, setView] = useState("calendar"); // "calendar" | "list"
    const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 4 = 4 weeks ahead (about a month)
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [googleCalendars, setGoogleCalendars] = useState([]);
    const [googleSelected, setGoogleSelected] = useState(null);
    const [googleConnected, setGoogleConnected] = useState(false);

    const startPoliPayForTutorOwed = async (tutorId) => {
        try {
            setMessage("");
            if (!tutorId) throw new Error("Missing tutorId");

            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) throw new Error("Not signed in");

            const res = await fetch("/api/poli/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ scope: "tutor_owed", tutorId }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json?.navigateUrl) {
                throw new Error(json?.error || "POLi payment could not be started.");
            }

            window.location.href = json.navigateUrl;
        } catch (e) {
            setMessage(e?.message || "POLi payment could not be started.");
        }
    };
    const [compareBusy, setCompareBusy] = useState([]); // busy intervals
    const [googlePreviewEvents, setGooglePreviewEvents] = useState([]);
    const [googleAppliedEvents, setGoogleAppliedEvents] = useState([]);
    const [googlePreviewLoading, setGooglePreviewLoading] = useState(false);
    const [googlePreviewError, setGooglePreviewError] = useState("");

    const getSupabaseAccessToken = async () => {
        const { data } = await supabase.auth.getSession();
        return data?.session?.access_token || null;
    };

    useEffect(() => {
        // Keep week navigation semantically clean:
        // applied Google blocks are only meaningful for the week they were fetched for
        setCompareBusy([]);
        setGooglePreviewEvents([]);
        setGoogleAppliedEvents([]);
        setGooglePreviewError("");
        setMessage("");
    }, [weekOffset]);

    const onClearGoogleCompare = () => {
        setCompareBusy([]);
        setGooglePreviewEvents([]);
        setGoogleAppliedEvents([]);
        setGooglePreviewError("");
        setMessage("");
    };

    const getWeekRangeISO = (weekOffset = 0, timeZone = "Pacific/Auckland") => {
        // Matches your BookingsCalendarWeek "week starts Monday" behaviour.
        const now = new Date();

        const day = now.getDay(); // Sun=0, Mon=1...
        const diffToMonday = (day === 0 ? -6 : 1) - day;

        const start = new Date(now);
        start.setDate(now.getDate() + diffToMonday + weekOffset * 7);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        end.setHours(0, 0, 0, 0);

        return {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            timeZone,
        };
    };

    const fetchGoogleFreeBusy = async ({ calendarId, weekOffset = 0 }) => {
        const token = await getSupabaseAccessToken();
        if (!token) return { busy: [], error: "Not signed in" };

        const { timeMin, timeMax, timeZone } = getWeekRangeISO(
            weekOffset,
            profile?.timezone || "Pacific/Auckland"
        );

        const res = await fetch("/api/google/calendar/freebusy", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                calendarId,
                timeMin,
                timeMax,
                timeZone,
            }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) return { busy: [], error: json?.error || "FreeBusy failed" };

        return { busy: json.busy || [], error: null };
    };


    const loadGoogleCalendars = async () => {
        const token = await getSupabaseAccessToken();
        if (!token) return;

        const res = await fetch("/api/google/calendar/list", {
            headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();
        if (res.ok) {
            const cals = json.calendars || [];
            setGoogleCalendars(cals);
            setGoogleConnected(true);

            // Auto-pick primary if nothing selected yet
            const primary = cals.find((c) => c.primary)?.id || "";
            setGoogleSelected((prev) => prev || primary || "");
        } else {

            setGoogleCalendars([]);
            setGoogleConnected(false);
        }
    };

    const startGoogleConnect = async () => {
        const token = await getSupabaseAccessToken();
        const res = await fetch("/api/google/oauth/start", {
            method: "POST",
            headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ context: "parent_compare" }),
        });
        const json = await res.json();
        if (res.ok && json.url) window.location.href = json.url;
        else setMessage(json.error || "Could not start Google connect");
    };

    const calendarBookings = (bookings || []).filter((b) => {
        const s = String(b?.status || "").toLowerCase();
        return !["cancelled", "declined", "rejected"].includes(s);
    });

    const calendarBookingsWithCompare = [
        ...calendarBookings,
        ...(Array.isArray(googleAppliedEvents) ? googleAppliedEvents : []),
    ];

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/sign-in");
    };


    const loadBookings = async (userId) => {
        setMessage("");

        const { data, error } = await supabase
            .from("bookings")
            .select(`
                id,
                session_date,
                start_time,
                end_time,
                status,
                payment_status,
                payment_method,
                amount_total,
                lesson_mode,
                is_recurring,
                recurring_group_id,
                student_id,
                tutor_id,
                subject_id,
                students(full_name),
                tutors(
                    display_name,
                    bank_account_masked,
                    email,
                    phone,
                    tutor_payment_details(payee_name, bank_account)
                ),
                subjects(name)
            `)
            .eq("parent_id", userId)
            .order("session_date", { ascending: true })
            .order("start_time", { ascending: true });

        if (error) {
            setMessage(error.message);
            setBookings([]);
            return;
        }

        setBookings(data || []);
    };

    const loadStudents = async (userId) => {
        const { data, error } = await supabase
            .from("students")
            // (s.full_name?.trim()?.[0] || "?").toUpperCase()
            .select("id, full_name")
            .eq("parent_id", userId)
            .order("created_at", { ascending: true });

        if (error) {
            setMessage(error.message);
            return;
        }

        console.log("loadStudents:", { userId, data, error });
        setStudents(data || []);
    };

    const loadTutors = async () => {
        const { data, error } = await supabase
            .from("tutors")
            .select("id, display_name, bio, email, phone, bank_account_masked")
            .eq("is_active", true)
            .order("display_name", { ascending: true });

        if (error) {
            setMessage(error.message);
            return;
        }
        setTutors(data || []);
    };

    // Loads parent credit balance + latest ledger rows (read-only for parents via RLS)
    const loadCredits = async (parentId) => {
        // Safety: avoid running with empty IDs
        if (!parentId) return;

        // 1) Fast balance
        const { data: balRow, error: balErr } = await supabase
            .from("credit_balances")
            .select("balance_nzd")
            .eq("parent_id", parentId)
            .maybeSingle();

        if (balErr) {
            console.log("loadCredits balance error:", balErr);
            // Keep defaults rather than crashing the dashboard
            setCreditBalanceNzd(0);
        } else {
            setCreditBalanceNzd(Number(balRow?.balance_nzd || 0));
        }

        // 2) Latest ledger activity (last 10)
        const { data: ledgerRows, error: ledErr } = await supabase
            .from("credit_ledger")
            .select("id, created_at, delta_amount, currency, reason, booking_id")
            .eq("parent_id", parentId)
            .order("created_at", { ascending: false })
            .limit(10);

        if (ledErr) {
            console.log("loadCredits ledger error:", ledErr);
            setCreditLedgerRows([]);
        } else {
            setCreditLedgerRows(ledgerRows || []);
        }
    };

    const handleCancelBooking = async (booking, scope, cancelReason) => {
        setMessage("");
        setUpdatingId(booking.id);

        try {
            // Use secure RPC so parents cannot mint credits by hacking the client
            const { data, error } = await supabase.rpc("cancel_booking_with_credit", {
                p_booking_id: booking.id,
                p_scope: scope, // "single" or "series"
            });

            if (error) {
                setMessage(error.message);
                setUpdatingId("");
                return;
            }

            const totalCredit = Number(data?.total_credit ?? 0);

            await logAudit({
                action: scope === "series" ? "booking.series_cancelled" : "booking.cancelled",
                entityType: scope === "series" ? "recurring_group" : "booking",
                entityId: scope === "series" ? booking.recurring_group_id : booking.id,
                metadata: {
                    scope,
                    booking_id_clicked: booking.id,
                    total_credit: totalCredit,
                    ledger_ids: data?.ledger_ids ?? [],
                    cancel_reason: (cancelReason || "").trim() || null,
                },
            });

            // setMessage(
            //     totalCredit > 0
            //         ? `Cancelled. Credit issued: $${totalCredit.toFixed(2)} NZD`
            //         : "Cancelled. No refund (within 12 hours)."
            // );

            setMessage("Booking cancelled.");

            const { data: { user } } = await supabase.auth.getUser();
            // if (user) await Promise.all([loadBookings(user.id), loadStudents(user.id), loadTutors(), loadCredits(user.id)]);
            if (user) await Promise.all([loadBookings(user.id), loadStudents(user.id), loadTutors()]);
            const { data: authUserRes } = await supabase.auth.getUser();
            const parentEmail = authUserRes?.user?.email || "";

            const emailRes = await fetch("/api/email/booking-cancelled", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    parentEmail,
                    studentFirstName: booking?.students?.full_name?.trim()?.split(/\s+/)[0],
                    sessionDate: booking?.session_date,
                    startTime: booking?.start_time,
                    endTime: booking?.end_time,
                    cancelReason: (cancelReason || "").trim() || null,
                }),
            });

            const tutorEmail = booking?.tutors?.email || "";
            if (tutorEmail) {
                const tutorEmailRes = await fetch("/api/email/lesson-cancelled-tutor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tutorEmail,
                        parentEmail,
                        studentFirstName: booking?.students?.full_name?.trim()?.split(/\s+/)[0],
                        sessionDate: booking?.session_date,
                        startTime: booking?.start_time,
                        endTime: booking?.end_time,
                        cancelReason: (cancelReason || "").trim() || null,
                    }),
                });

                if (!tutorEmailRes.ok) {
                    const errText = await tutorEmailRes.text().catch(() => "");
                    console.error("Tutor email send failed:", errText);
                }
            }

            if (!emailRes.ok) {
                const errText = await emailRes.text().catch(() => "");
                console.error("Email send failed:", errText);
            }

        } finally {
            setUpdatingId("");
        }

    };

    const toAucklandParts = (iso) => {
        const d = new Date(iso);
        const parts = new Intl.DateTimeFormat("en-NZ", {
            timeZone: profile?.timezone || "Pacific/Auckland",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(d);

        const get = (t) => parts.find((p) => p.type === t)?.value;
        const y = get("year");
        const m = get("month");
        const day = get("day");
        const hh = get("hour");
        const mm = get("minute");

        return {
            ymd: `${y}-${m}-${day}`,
            hm: `${hh}:${mm}`,
        };
    };

    const googleBusyToCalendarItems = (busy) => {
        return (busy || []).map((b, idx) => {
            const s = toAucklandParts(b.start);
            const e = toAucklandParts(b.end);

            // Handle blocks that cross midnight (rare, but possible):
            // if date differs, just keep start date for display; your grid logic might need more later.
            return {
                __kind: "gcal_busy",
                id: `gcal-${idx}-${b.start}`,
                session_date: s.ymd,
                start_time: s.hm,
                end_time: e.hm,

                // prevent booking UI from guessing
                status: "busy",
                payment_status: null,
                payment_method: null,

                // provide an explicit label
                title: "Personal calendar",
            };

        });
    };


    const onApplyGoogleCompare = async () => {
        if (!googleSelected) return;

        const { busy, error } = await fetchGoogleFreeBusy({
            calendarId: googleSelected,
            weekOffset,
        });


        if (error) {
            setCompareBusy([]);
            setGoogleAppliedEvents([]);
            setMessage(error);
            return;
        }

        setCompareBusy(busy || []);
        setGoogleAppliedEvents(googleBusyToCalendarItems(busy || []));
        setMessage("");
    };


    useEffect(() => {
        const checkAuth = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            const { data: profileData } = await supabase
                .from("profiles")
                .select("role, full_name, avatar_url")
                .eq("id", user.id)
                .single();

            if (!profileData || profileData.role !== "parent") {
                router.push("/auth/sign-in");
                return;
            }

            setProfile(profileData);

            // await Promise.all([loadBookings(user.id), loadStudents(user.id), loadTutors(), loadCredits(user.id)]);
            await Promise.all([loadBookings(user.id), loadStudents(user.id), loadTutors()]);
            await loadGoogleCalendars();
            setUserId(user.id);
            setChecking(false);
        };

        checkAuth();
    }, [router]);

    useEffect(() => {
        if (view !== "list") return;
        if (!selectedBookingId) return;

        const el = document.getElementById(`booking-${selectedBookingId}`);
        if (!el) return;

        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [view, selectedBookingId, bookings]);

    // useEffect(() => {
    //     if (!googleConnected) return;

    //     if (!googleSelected) {
    //         setGooglePreviewEvents([]);
    //         setGooglePreviewError("");
    //         return;
    //     }

    //     (async () => {
    //         try {
    //             setGooglePreviewLoading(true);
    //             setGooglePreviewError("");

    //             const preview = await fetchGoogleFreeBusy(googleSelected);
    //             setGooglePreviewEvents(preview);
    //         } catch (e) {
    //             setGooglePreviewEvents([]);
    //             setGooglePreviewError(e?.message || "Failed to load Google Calendar busy blocks.");
    //         } finally {
    //             setGooglePreviewLoading(false);
    //         }
    //     })();
    // }, [googleConnected, googleSelected]);

    // const token = await getSupabaseAccessToken();
    // if (!token) throw new Error("Not signed in");

    // const preview = await fetchGoogleFreeBusy(googleSelected, token);
    // setGooglePreviewEvents(preview);

    useEffect(() => {
        async function logAuthUid() {
            const { data, error } = await supabase.auth.getSession();
            console.log("AUTH UID:", data?.session?.user?.id);
            if (error) console.error("Session error:", error);
        }
        logAuthUid();
    }, []);


    useEffect(() => {
        if (!googleConnected) return;

        if (!googleSelected) {
            setGooglePreviewEvents([]);
            setGooglePreviewError("");
            return;
        }

        (async () => {
            try {
                setGooglePreviewLoading(true);
                setGooglePreviewError("");

                const { busy, error } = await fetchGoogleFreeBusy({
                    calendarId: googleSelected,
                    weekOffset,
                });

                if (error) {
                    setGooglePreviewEvents([]);
                    setGooglePreviewError(error);
                    return;
                }

                setGooglePreviewEvents(busy || []);
            } catch (e) {
                setGooglePreviewEvents([]);
                setGooglePreviewError(e?.message || "Failed to load Google Calendar busy blocks.");
            } finally {
                setGooglePreviewLoading(false);
            }
        })();
    }, [googleConnected, googleSelected, weekOffset]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel("bookings-parent-dashboard")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "bookings",
                    filter: `parent_id=eq.${userId}`,
                },
                () => {
                    loadBookings(userId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);


    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    const nowKey = getNowAucklandKey();

    const deletedBookings = (bookings || []).filter((b) => (b.status || "") === "cancelled");

    // Upcoming/completed should exclude cancelled ones
    const upcomingBookings = (bookings || []).filter((b) => bookingStartKey(b) >= nowKey && (b.status || "") !== "cancelled");
    const completedBookings = (bookings || []).filter((b) => bookingStartKey(b) < nowKey && (b.status || "") !== "cancelled");

    const unpaidUpcoming = upcomingBookings.filter((b) => (b.payment_status || "unpaid") !== "paid");
    const requestedUpcoming = upcomingBookings.filter((b) => (b.status || "") === "requested");


    return (
        <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
            <style>{`
                .pageWrap { max-width: 980px; margin: 0 auto; }

                /* Hide mobile bar by default (desktop/tablet) */
                .mobileBar { display: none; }
                .mobileBarSpacer { display: none; }

                @media (max-width: 640px) {
                    .pageWrap { padding: 0 8px; }
                    .topRow { flex-direction: column; align-items: stretch !important; gap: 10px !important; }
                    .topActions { justify-content: flex-start !important; flex-wrap: wrap !important; gap: 10px !important; }
                    .profileCard { grid-template-columns: 1fr !important; }
                    .profileRight { justify-content: flex-start !important; }
                    .bookingCard { min-width: 0 !important; width: 100% !important; }

                    .mobileBar {
                        display: block;
                        position: fixed;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(250,250,250,0.95);
                        backdrop-filter: blur(10px);
                        border-top: 1px solid #eee;
                        padding: 10px 12px;
                        z-index: 9999;
                    }                   

                    .mobileBarSpacer {
                        display: block;
                        height: 72px;
                    }

                    .statsGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
                    @media (max-width: 640px) { .statsGrid { grid-template-columns: 1fr; } }
                }
                    .dashGrid {
                        display: grid;
                        // grid-template-columns: 1.05fr 1.45fr;
                        gap: 14px;
                        margin-top: 14px;
                        align-items: start;
                    }

                    .mobileSwitch {
                        display: none;
                        gap: 10px;
                        margin-top: 14px;
                    }

                    @media (max-width: 860px) {
                        .dashGrid {
                            grid-template-columns: 1fr;
                        }
                        .mobileSwitch {
                            display: flex;
                        }
                    }
            `}</style>

            <div className="pageWrap">
                {/* everything else stays inside here */}

                <ParentTopBar
                    firstName={profile?.full_name ? profile.full_name.split(" ")[0] : "back"}
                />


                <QuickStats
                    studentsCount={students.length}
                    upcomingCount={upcomingBookings.length}
                    requestedCount={requestedUpcoming.length}
                    unpaidCount={unpaidUpcoming.length}
                />

                {/* <Link
                    href="/parent/profile"
                    style={{
                        marginTop: 16,
                        padding: 14,
                        border: "1px solid #eee",
                        borderRadius: 14,
                        background: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                        textDecoration: "none",
                        color: "inherit",
                        cursor: "pointer",
                    }}
                >

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#e9eefc" }}>
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Profile"
                                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 900,
                                        color: "#1f7aea",
                                    }}
                                >
                                    {(profile?.full_name || "P").slice(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>


                        <div>
                            <div style={{ fontWeight: 900 }}>{profile?.full_name || "Parent"}</div>
                            <div style={{ color: "#555", fontSize: 13 }}>Account type: {profile?.role || "parent"}</div>
                        </div>
                    </div>
                </Link> */}

                <ParentHeroCard profile={profile} students={students} />

                {/* Mobile-only switch (desktop shows both sections) */}
                {/* <div className="mobileSwitch">
                    <button
                        type="button"
                        onClick={() => setView("profile")}
                        style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: view === "profile" ? "#111" : "#fff",
                            color: view === "profile" ? "#fff" : "#111",
                            fontWeight: 900,
                            cursor: "pointer",
                        }}
                    >
                        Overview
                    </button>

                    <button
                        type="button"
                        onClick={() => setView("calendar")}
                        style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: view === "calendar" ? "#111" : "#fff",
                            color: view === "calendar" ? "#fff" : "#111",
                            fontWeight: 900,
                            cursor: "pointer",
                        }}
                    >
                        Calendar
                    </button>
                </div> */}

                {/* Desktop: 2-column dashboard. Mobile: show one at a time. */}
                <div className="dashGrid">
                    {/* <div style={{ display: view === "calendar" ? "none" : "block" }}>
                        <ProfilePanel
                            profile={profile}
                            students={students}
                            tutors={tutors}
                            creditBalanceNzd={creditBalanceNzd}
                            creditLedgerRows={creditLedgerRows}
                        />
                    </div> */}

                    {/* <div style={{ display: view === "profile" ? "none" : "block" }}>
                        <BookingsCalendarWeek bookings={bookings} students={students} />
                    </div> */}

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        {!googleConnected ? (
                            <button type="button" onClick={startGoogleConnect} style={toggleBtnStyle(false)}>
                                Connect Google Calendar
                            </button>
                        ) : (
                            <>
                                <div style={{ fontSize: 13, color: "#666", fontWeight: 800 }}>Compare to:</div>
                                <select
                                    value={googleSelected || ""}
                                    onChange={(e) => setGoogleSelected(e.target.value)}
                                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #eee" }}
                                >
                                    <option value="">Select a calendar…</option>
                                    {googleCalendars.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.summary}{c.primary ? " (Primary)" : ""}
                                        </option>
                                    ))}
                                </select>

                                {/* {googlePreviewEvents.length > 0 && (
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            onClick={() => setGoogleAppliedEvents(googlePreviewEvents)}
                                        >
                                            Apply comparison
                                        </button>

                                        <button
                                            onClick={() => {
                                                setGooglePreviewEvents([]);
                                                setGoogleAppliedEvents([]);
                                            }}
                                        >
                                            Clear comparison
                                        </button>
                                    </div>
                                )} */}

                                {googleSelected ? (
                                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                        <button
                                            type="button"
                                            disabled={googlePreviewLoading}
                                            onClick={onApplyGoogleCompare}
                                            style={{
                                                ...toggleBtnStyle(false),
                                                background: "#1f7aea",
                                                borderColor: "#1f7aea",
                                                color: "#fff",
                                            }}
                                        >
                                            {googlePreviewLoading ? "Loading…" : "Apply"}
                                        </button>


                                        {/* <button
                                            type="button"
                                            onClick={() => {
                                                setGoogleSelected("");
                                                setGooglePreviewEvents([]);
                                                setGoogleAppliedEvents([]);
                                                setGooglePreviewError("");
                                            }}
                                            style={toggleBtnStyle(false)}
                                        >
                                            Clear
                                        </button> */}

                                        <button
                                            type="button"
                                            onClick={onClearGoogleCompare}
                                            style={toggleBtnStyle(false)}
                                        >
                                            Clear
                                        </button>

                                        <div style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>
                                            Preview: {googlePreviewEvents.length} busy block{googlePreviewEvents.length === 1 ? "" : "s"}
                                            {googleAppliedEvents.length ? ` · Applied: ${googleAppliedEvents.length}` : ""}
                                        </div>

                                        {googlePreviewError ? (
                                            <div style={{ fontSize: 12, color: "#b00020", fontWeight: 700 }}>
                                                {googlePreviewError}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", alignItems: "center", margin: "8px 0 -6px 0", flexWrap: "wrap" }}>
                        <button
                            onClick={() => setView("calendar")}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: view === "calendar" ? "#111" : "#fff",
                                color: view === "calendar" ? "#fff" : "#111",
                                fontWeight: 800,
                                cursor: "pointer",
                            }}
                        >
                            Calendar
                        </button>

                        <button
                            onClick={() => setView("list")}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: view === "list" ? "#111" : "#fff",
                                color: view === "list" ? "#fff" : "#111",
                                fontWeight: 800,
                                cursor: "pointer",
                            }}
                        >
                            List
                        </button>
                        {/* 
                        <button
                            type="button"
                            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                            disabled={weekOffset === 0}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "#fff",
                                color: "#111",
                                fontWeight: 800,
                                cursor: weekOffset === 0 ? "not-allowed" : "pointer",
                                opacity: weekOffset === 0 ? 0.5 : 1,
                            }}
                        >
                            ← Previous week
                        </button>

                        <button
                            type="button"
                            onClick={() => setWeekOffset((w) => Math.min(4, w + 1))}
                            disabled={weekOffset >= 4}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "#fff",
                                color: "#111",
                                fontWeight: 800,
                                cursor: weekOffset >= 4 ? "not-allowed" : "pointer",
                                opacity: weekOffset >= 4 ? 0.5 : 1,
                            }}
                        >
                            Next week →
                        </button> */}

                        <p
                            style={{
                                fontSize: 14,
                                color: "#1f7aea",
                                fontWeight: 700,
                                marginLeft: "auto",
                            }}
                        >
                            Don’t see your calendar? Select one above and click <strong>Apply</strong>.
                        </p>

                    </div>


                    {view === "calendar" ? (
                        // <BookingsCalendarWeek
                        //     // bookings={calendarBookings}
                        //     bookings={calendarBookingsWithCompare}
                        //     onBookingClick={(booking) => {
                        //         // IMPORTANT: BookingsCalendarWeekGrid passes the whole booking object
                        //         // (not just an id), so we extract the id here.
                        //         if (booking?.__kind === "gcal_busy") return;
                        //         setSelectedBookingId(booking?.id || null);
                        //         setView("list");
                        //     }}
                        // />

                        // <BookingsCalendarWeek
                        //     bookings={calendarBookingsWithCompare}
                        //     onBookingClick={(booking) => {
                        //         if (booking?.__kind === "gcal_busy") return;
                        //         if (!booking?.id) return;
                        //         setSelectedBookingId(booking.id);
                        //         setView("list");
                        //     }}
                        // />

                        <BookingsCalendarWeek
                            bookings={calendarBookingsWithCompare}
                            weekOffset={weekOffset}
                            onWeekOffsetChange={setWeekOffset}
                            maxWeekOffset={4}
                            onBookingClick={(booking) => {
                                if (booking?.__kind === "gcal_busy") return;
                                if (!booking?.id) return;
                                setSelectedBookingId(booking.id);
                                setView("list");
                            }}
                        />

                    ) : (
                        <BookingsList
                            bookings={bookings}
                            selectedBookingId={selectedBookingId}
                            onCancel={(booking) =>
                                setCancelModal({
                                    booking,
                                    scope: "single",
                                    reason: "",
                                    confirmText: "",
                                })
                            }
                            onPayNow={(booking) => startPoliPayForTutorOwed(booking?.tutor_id)}
                        />
                    )}

                </div>



                {/* <nav style={{ margin: "12px 0 24px", display: "flex", gap: 12 }}>
                    <Link href="/parent/dashboard">Dashboard</Link>
                    <Link href="/parent/students">Students</Link>
                </nav> */}

                {message && <p>{message}</p>}



                {/* Cancel modal */}
                {cancelModal?.booking && (
                    <div
                        style={{
                            position: "fixed",
                            left: 0,
                            top: 0,
                            right: 0,
                            bottom: 0,
                            background: "rgba(0,0,0,0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 9999,
                            padding: 16,
                        }}
                        onClick={() => setCancelModal(null)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: "100%",
                                maxWidth: 520,
                                background: "#fff",
                                borderRadius: 16,
                                padding: 18,
                                border: "1px solid #eee",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                            }}
                        >
                            {(() => {
                                const b = cancelModal.booking;
                                const studentName = b.students?.full_name || "Student";
                                const timeRange = `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}`;
                                const isRecurring = Boolean(b.recurring_group_id || b.is_recurring);

                                return (
                                    <>
                                        <h3 style={{ margin: 0 }}>Cancel booking</h3>
                                        <p style={{ margin: "8px 0 0", color: "#555" }}>
                                            <strong>{studentName}</strong> • {formatISO(b.session_date)} • {timeRange}
                                        </p>

                                        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
                                            {isRecurring ? (
                                                <>
                                                    <div style={{ fontWeight: 900, marginBottom: 8 }}>This is part of a recurring booking.</div>
                                                    <div style={{ display: "grid", gap: 10 }}>
                                                        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                                                            <input
                                                                type="radio"
                                                                name="cancelScope"
                                                                checked={cancelModal.scope === "single"}
                                                                onChange={() => setCancelModal((m) => ({ ...m, scope: "single" }))}
                                                            />
                                                            <span>
                                                                <strong>Cancel this lesson only</strong>
                                                                <div style={{ color: "#666", fontSize: 13 }}>Only this date gets cancelled.</div>
                                                            </span>
                                                        </label>

                                                        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                                                            <input
                                                                type="radio"
                                                                name="cancelScope"
                                                                checked={cancelModal.scope === "series"}
                                                                onChange={() => setCancelModal((m) => ({ ...m, scope: "series" }))}
                                                            />
                                                            <span>
                                                                <strong>Cancel the rest of the recurring lessons</strong>
                                                                <div style={{ color: "#666", fontSize: 13 }}>
                                                                    Cancels this booking and all future bookings in the recurring series.
                                                                </div>
                                                            </span>
                                                        </label>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ fontWeight: 900, marginBottom: 6 }}>This is a one-off booking.</div>
                                                    <div style={{ color: "#666", fontSize: 13 }}>Are you sure you want to cancel it?</div>
                                                </>
                                            )}
                                        </div>

                                        <div style={{ marginTop: 14 }}>
                                            <label style={{ display: "block", fontWeight: 900, marginBottom: 6 }}>
                                                Reason for cancelling (required)
                                            </label>
                                            <textarea
                                                value={cancelModal.reason || ""}
                                                onChange={(e) => setCancelModal((m) => ({ ...m, reason: e.target.value }))}
                                                placeholder="e.g., Child is sick, timetable change, etc."
                                                rows={3}
                                                style={{
                                                    width: "100%",
                                                    padding: "10px 12px",
                                                    borderRadius: 12,
                                                    border: "1px solid #ddd",
                                                    outline: "none",
                                                    resize: "vertical",
                                                }}
                                            />
                                            <div style={{ marginTop: 6, color: "#777", fontSize: 12 }}>
                                                This will be included in the cancellation email.
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 14 }}>
                                            <label style={{ display: "block", fontWeight: 900, marginBottom: 6 }}>
                                                Type <span style={{ fontFamily: "monospace" }}>CANCEL</span> to confirm
                                            </label>
                                            <input
                                                value={cancelModal.confirmText}
                                                onChange={(e) => setCancelModal((m) => ({ ...m, confirmText: e.target.value }))}
                                                placeholder="CANCEL"
                                                style={{
                                                    width: "100%",
                                                    padding: "10px 12px",
                                                    borderRadius: 12,
                                                    border: "1px solid #ddd",
                                                    outline: "none",
                                                    fontWeight: 800,
                                                }}
                                            />
                                        </div>

                                        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
                                            <button
                                                onClick={() => setCancelModal(null)}
                                                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontWeight: 800 }}
                                            >
                                                Back
                                            </button>

                                            <button
                                                disabled={
                                                    cancelModal.confirmText.trim().toUpperCase() !== "CANCEL" ||
                                                    !(cancelModal.reason || "").trim() ||
                                                    updatingId === b.id
                                                }
                                                onClick={async () => {
                                                    const scope = cancelModal.scope || "single";
                                                    const reason = (cancelModal.reason || "").trim();
                                                    setCancelModal(null);
                                                    await handleCancelBooking(b, scope, reason);
                                                }}
                                                style={{
                                                    padding: "10px 12px",
                                                    borderRadius: 12,
                                                    border: "none",
                                                    background: "#e53935",
                                                    color: "#fff",
                                                    fontWeight: 900,
                                                    opacity:
                                                        cancelModal.confirmText.trim().toUpperCase() === "CANCEL" && (cancelModal.reason || "").trim()
                                                            ? 1
                                                            : 0.6,
                                                    cursor:
                                                        cancelModal.confirmText.trim().toUpperCase() === "CANCEL" && (cancelModal.reason || "").trim()
                                                            ? "pointer"
                                                            : "not-allowed",
                                                }}
                                            >
                                                {updatingId === b.id ? "Cancelling..." : "Confirm cancel"}
                                            </button>
                                        </div>
                                    </>
                                );


                            })()}
                        </div>
                    </div>
                )}

                <div className="mobileBarSpacer" />

                {/* Mobile sticky action bar */}
                <div className="mobileBar">
                    <div style={{ display: "flex", gap: 10 }}>
                        <Link
                            href="/book"
                            style={{
                                flex: 1,
                                background: "#1f7aea",
                                color: "#fff",
                                padding: "12px 14px",
                                borderRadius: 12,
                                textDecoration: "none",
                                fontWeight: 900,
                                textAlign: "center",
                            }}
                        >
                            Book
                        </Link>

                        <Link
                            href="/parent/students"
                            style={{
                                flex: 1,
                                border: "1px solid #ddd",
                                background: "#fff",
                                color: "#111",
                                padding: "12px 14px",
                                borderRadius: 12,
                                textDecoration: "none",
                                fontWeight: 900,
                                textAlign: "center",
                            }}
                        >
                            Students
                        </Link>

                        <Link
                            href="/parent/profile"
                            style={{
                                flex: 1,
                                border: "1px solid #ddd",
                                background: "#fff",
                                color: "#111",
                                padding: "12px 14px",
                                borderRadius: 12,
                                textDecoration: "none",
                                fontWeight: 900,
                                textAlign: "center",
                            }}
                        >
                            Profile
                        </Link>
                    </div>
                </div>
            </div>
        </div >
    );
}
