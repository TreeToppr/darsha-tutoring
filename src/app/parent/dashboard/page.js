"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function ParentDashboard() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [message, setMessage] = useState("");
    const [updatingId, setUpdatingId] = useState("");

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/sign-in");
    };

    const loadBookings = async (userId) => {
        const { data, error } = await supabase
            .from("bookings")
            .select("id, session_date, start_time, end_time, status, student_id")
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

            // Optional: confirm role is parent
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "parent") {
                router.push("/auth/sign-in");
                return;
            }

            await loadBookings(user.id);
            setChecking(false);
        };

        checkAuth();
    }, [router]);

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Parent Dashboard</h1>
                <button onClick={handleSignOut}>Sign out</button>
            </div>
            <nav style={{ margin: "12px 0 24px", display: "flex", gap: 12 }}>
                <Link href="/parent/dashboard">Dashboard</Link>
                <Link href="/parent/students">Students</Link>
            </nav>

            {message && <p>{message}</p>}

            <section style={{ marginTop: 24 }}>
                <h2>My bookings</h2>

                {bookings.length === 0 ? (
                    <p>No bookings yet.</p>
                ) : (
                    <ul style={{ paddingLeft: 18 }}>
                        {bookings.map((b) => (
                            <li key={b.id} style={{ marginBottom: 10 }}>
                                <strong>{b.session_date}</strong>{" "}
                                {String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}{" "}
                                <span style={{ color: "#555" }}>({b.status})</span>

                                {(b.status === "requested" || b.status === "accepted") && (
                                    <div style={{ marginTop: 6 }}>
                                        <button
                                            disabled={updatingId === b.id}
                                            onClick={() => handleCancelBooking(b.id)}
                                        >
                                            {updatingId === b.id ? "Cancelling..." : "Cancel"}
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <p>Students, bookings, payments will live here.</p>
        </main>
    );
}
