"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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

export default function ParentDashboard() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [message, setMessage] = useState("");
    const [updatingId, setUpdatingId] = useState("");
    const [userId, setUserId] = useState(null);
    const [profile, setProfile] = useState(null);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/sign-in");
    };

    const loadBookings = async (userId) => {
        const { data, error } = await supabase
            .from("bookings")
            .select("id, session_date, start_time, end_time, status, student_id, students(full_name)")
            .eq("parent_id", userId)
            .order("session_date", { ascending: true })
            .order("start_time", { ascending: true });

        if (error) {
            setMessage(error.message);
            return;
        }

        setBookings(data || []);
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
        if (user) await loadBookings(user.id);
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

            await loadBookings(user.id);
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

    return (
        <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
            <div style={{ maxWidth: 980, margin: "0 auto" }}>
                {/* everything else stays inside here */}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Dashboard</h1>
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

                <div
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
                        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                            {bookings.map((b) => {
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
                </section>


                <p style={{ marginTop: 24, color: "#555" }}>Students, bookings, payments will live here.</p>
            </div>
        </div>
    );
}
