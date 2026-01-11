"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";

const formatISO = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};

const statusLabel = (s) => {
    if (!s) return "unknown";
    return s;
};

const statusStyle = (s) => {
    const base = { padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid #ddd" };
    if (s === "accepted") return { ...base, background: "#e9f7ef", borderColor: "#b7e1c5" };
    if (s === "requested") return { ...base, background: "#fff7e6", borderColor: "#ffe0a3" };
    if (s === "cancelled") return { ...base, background: "#f5f5f5" };
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
    border: "1px solid #e0e0e0",
    background: "#f5f5f5",
    color: "#555",
};

const paymentStyle = (p) => {
    const base = { padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 800, border: "1px solid #ddd" };
    if (p === "paid") return { ...base, background: "#e9f7ef", borderColor: "#b7e1c5", color: "#1b5e20" };
    return { ...base, background: "#fff7e6", borderColor: "#ffe0a3", color: "#8a5a00" }; // unpaid default
};

const modeStyle = (m) => {
    const base = { padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 800, border: "1px solid #ddd" };
    if (m === "in_person") return { ...base, background: "#f5f5f5", borderColor: "#e0e0e0", color: "#333" };
    return { ...base, background: "#e9eefc", borderColor: "#cdd9ff", color: "#1f7aea" }; // online default
};

export default function ParentDashboard() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [message, setMessage] = useState("");
    const [updatingId, setUpdatingId] = useState("");
    const [userId, setUserId] = useState(null);
    const [profile, setProfile] = useState(null);
    const [students, setStudents] = useState([]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/sign-in");
    };

    const loadBookings = async (userId) => {
        const { data, error } = await supabase
            .from("bookings")
            .select("id, session_date, start_time, end_time, status, payment_status, lesson_mode, student_id, students(full_name)")
            .eq("parent_id", userId)
            .order("session_date", { ascending: true })
            .order("start_time", { ascending: true });

        if (error) {
            setMessage(error.message);
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

    const handleCancelBooking = async (bookingId) => {
        setMessage("");
        setUpdatingId(bookingId);

        const { error } = await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", bookingId);

        if (error) {
            setMessage(error.message);
            setUpdatingId("");
            return;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user) await Promise.all([loadBookings(user.id), loadStudents(user.id)]);
        setUpdatingId("");
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

            await Promise.all([loadBookings(user.id), loadStudents(user.id)]);
            setUserId(user.id);
            setChecking(false);
        };

        checkAuth();
    }, [router]);

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

    const upcomingBookings = (bookings || []).filter((b) => bookingStartKey(b) >= nowKey);
    const completedBookings = (bookings || []).filter((b) => bookingStartKey(b) < nowKey);

    return (
        <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
            <div style={{ maxWidth: 980, margin: "0 auto" }}>
                {/* everything else stays inside here */}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                        <h1 style={{ margin: 0 }}>
                            Welcome {profile?.full_name ? profile.full_name.split(" ")[0] : "back"}!
                        </h1>

                        <p style={{ margin: "6px 0 0", color: "#555" }}>Manage students and bookings.</p>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Link
                            href="/book"
                            style={{
                                background: "#1f7aea",
                                color: "#fff",
                                padding: "10px 14px",
                                borderRadius: 10,
                                textDecoration: "none",
                                fontWeight: 800,
                            }}
                        >
                            + Book a lesson
                        </Link>

                        {/* <button onClick={handleSignOut} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
                            Sign out
                        </button> */}
                    </div>
                </div>

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

                {/* Big profile header (like your mock) */}
                <div
                    style={{
                        marginTop: 16,
                        padding: 18,
                        border: "1px solid #eee",
                        borderRadius: 16,
                        background: "#fff",
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 16,
                        alignItems: "center",
                    }}
                >
                    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                        {/* Avatar + overlapping student bubbles */}
                        <div style={{ position: "relative", width: 110, height: 84, flex: "0 0 auto" }}>
                            {/* Parent avatar */}
                            <div
                                style={{
                                    width: 84,
                                    height: 84,
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "#e9eefc",
                                }}
                            >
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
                                            fontSize: 28,
                                        }}
                                    >
                                        {(profile?.full_name || "P").slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* Student bubbles overlap the avatar a bit */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: 52,     // shift right so it overlaps the avatar edge
                                    top: 52,      // sit near bottom of avatar
                                    display: "flex",
                                    alignItems: "center",
                                    pointerEvents: "auto",
                                }}
                            >
                                {students.slice(0, 5).map((s, i) => (
                                    <Link
                                        key={s.id}
                                        href="/parent/students"
                                        title={s.full_name}
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: "50%",
                                            background: "#f1f3f5",
                                            border: "1px solid #e6e6e6",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: 900,
                                            color: "#333",
                                            marginLeft: i === 0 ? 0 : -10, // overlap each other
                                            boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                                        }}
                                    >
                                        {(s.full_name || "S").slice(0, 1).toUpperCase()}
                                    </Link>
                                ))}

                                <Link
                                    href="/parent/students"
                                    title="Add student"
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "50%",
                                        background: "#e9eefc",
                                        border: "1px solid #cdd9ff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 900,
                                        color: "#1f7aea",
                                        textDecoration: "none",
                                        marginLeft: students.length ? -10 : 0, // keep overlap consistent
                                        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                                    }}
                                >
                                    +
                                </Link>
                            </div>
                        </div>


                        <div style={{ minWidth: 240, alignSelf: "flex-start" }}>
                            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                                {profile?.full_name || "Parent"}
                            </div>

                            <div style={{ marginTop: 4, color: "#888", fontSize: 13, fontWeight: 700 }}>
                                Parent
                            </div>
                        </div>

                    </div>

                    {/* Actions (right side) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                        <Link
                            href="/parent/profile"
                            style={{
                                padding: "10px 16px",
                                borderRadius: 999,
                                background: "#1f7aea",
                                color: "#fff",
                                textDecoration: "none",
                                fontWeight: 900,
                                minWidth: 170,
                                textAlign: "center",
                                boxShadow: "0 4px 14px rgba(31,122,234,0.25)",
                            }}
                        >
                            Edit profile
                        </Link>

                        <Link
                            href="/parent/students"
                            style={{
                                padding: "10px 16px",
                                borderRadius: 999,
                                border: "1px solid #ddd",
                                background: "#fff",
                                color: "#111",
                                fontWeight: 800,
                                minWidth: 170,
                                textAlign: "center",
                                textDecoration: "none",
                            }}
                        >
                            Manage students
                        </Link>
                    </div>

                </div>

                {/* <nav style={{ margin: "12px 0 24px", display: "flex", gap: 12 }}>
                    <Link href="/parent/dashboard">Dashboard</Link>
                    <Link href="/parent/students">Students</Link>
                </nav> */}

                {message && <p>{message}</p>}

                <section style={{ marginTop: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                        <h2 style={{ margin: 0 }}>My bookings</h2>
                        <Link href="/parent/students" style={{ color: "#1f7aea", textDecoration: "none", fontWeight: 700 }}>
                            Manage students →
                        </Link>
                    </div>

                    {bookings.length === 0 ? (
                        <div style={{ marginTop: 12, padding: 16, border: "1px solid #eee", borderRadius: 12, background: "#fafafa" }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>No bookings yet.</p>
                            <p style={{ margin: "8px 0 0", color: "#555" }}>
                                When you book a lesson, it will appear here.
                            </p>
                        </div>
                    ) : (
                        <div style={{ marginTop: 12, display: "grid", gap: 18 }}>
                            {/* Upcoming */}
                            <div>
                                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                                    <h3 style={{ margin: "0 0 10px" }}>Upcoming</h3>
                                    <div style={{ color: "#777", fontWeight: 700, fontSize: 13 }}>{upcomingBookings.length} booking(s)</div>
                                </div>

                                {upcomingBookings.length === 0 ? (
                                    <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12, background: "#fafafa", color: "#555" }}>
                                        No upcoming bookings.
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gap: 10 }}>
                                        {upcomingBookings.map((b) => {
                                            const studentName = b.students?.full_name || "Student";
                                            const timeRange = `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}`;

                                            return (
                                                <div
                                                    key={b.id}
                                                    style={{
                                                        border: "1px solid #eee",
                                                        borderRadius: 12,
                                                        padding: 14,
                                                        background: "#fff",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        gap: 12,
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <div style={{ minWidth: 240 }}>
                                                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                                            <span style={{ fontWeight: 900 }}>{formatISO(b.session_date)}</span>
                                                            <span style={{ color: "#555", fontWeight: 700 }}>{timeRange}</span>

                                                            <span style={statusStyle(b.status)}>{statusLabel(b.status)}</span>
                                                            <span style={paymentStyle(b.payment_status)}>{(b.payment_status || "unpaid").toUpperCase()}</span>

                                                            <span style={modeStyle(b.lesson_mode)}>
                                                                {b.lesson_mode === "in_person" ? "IN PERSON" : "ONLINE"}
                                                            </span>
                                                        </div>

                                                        <div style={{ marginTop: 6, color: "#333" }}>
                                                            <span style={{ color: "#555" }}>Student:</span> <strong>{studentName}</strong>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                        {(b.status === "requested" || b.status === "accepted") && (
                                                            <button
                                                                disabled={updatingId === b.id}
                                                                onClick={() => handleCancelBooking(b.id)}
                                                                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                                                            >
                                                                {updatingId === b.id ? "Cancelling..." : "Cancel"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Completed */}
                            <div>
                                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                                    <h3 style={{ margin: "0 0 10px" }}>Completed</h3>
                                    <div style={{ color: "#777", fontWeight: 700, fontSize: 13 }}>{completedBookings.length} booking(s)</div>
                                </div>

                                {completedBookings.length === 0 ? (
                                    <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12, background: "#fafafa", color: "#555" }}>
                                        No completed bookings yet.
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gap: 10 }}>
                                        {completedBookings.map((b) => {
                                            const studentName = b.students?.full_name || "Student";
                                            const timeRange = `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}`;

                                            return (
                                                <div
                                                    key={b.id}
                                                    style={{
                                                        border: "1px solid #eee",
                                                        borderRadius: 12,
                                                        padding: 14,
                                                        background: "#fff",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        gap: 12,
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                        opacity: 0.85,
                                                    }}
                                                >
                                                    <div style={{ minWidth: 240 }}>
                                                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                                            <span style={{ fontWeight: 900 }}>{formatISO(b.session_date)}</span>
                                                            <span style={{ color: "#555", fontWeight: 700 }}>{timeRange}</span>

                                                            <span style={completedStyle}>COMPLETED</span>

                                                            <span style={statusStyle(b.status)}>{statusLabel(b.status)}</span>
                                                            <span style={paymentStyle(b.payment_status)}>{(b.payment_status || "unpaid").toUpperCase()}</span>

                                                            <span style={modeStyle(b.lesson_mode)}>
                                                                {b.lesson_mode === "in_person" ? "IN PERSON" : "ONLINE"}
                                                            </span>
                                                        </div>

                                                        <div style={{ marginTop: 6, color: "#333" }}>
                                                            <span style={{ color: "#555" }}>Student:</span> <strong>{studentName}</strong>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                        {/* No cancel button for completed */}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>


                <p style={{ marginTop: 24, color: "#555" }}>Students, bookings, payments will live here.</p>
            </div>
        </div>
    );
}
