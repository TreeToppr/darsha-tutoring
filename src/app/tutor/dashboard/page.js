"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";

export default function TutorDashboard() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [tutorRecord, setTutorRecord] = useState(null);
    const [message, setMessage] = useState("");
    const [bookings, setBookings] = useState([]);
    const [updatingId, setUpdatingId] = useState(null);

    const loadBookings = async (tId) => {
        const { data, error } = await supabase
            .from("bookings")
            .select("id, session_date, start_time, end_time, status, notes, is_recurring, recurring_group_id, payment_status, lesson_mode, booking_address_text")
            .eq("tutor_id", tId)
            .order("created_at", { ascending: false });

        if (error) {
            setMessage(error.message);
            return;
        }
        setBookings(data || []);
    };

    const buildDisplayBookings = (rows) => {
        const display = [];
        const seenGroups = new Set();

        for (const b of rows) {
            if (b.is_recurring && b.recurring_group_id) {
                if (seenGroups.has(b.recurring_group_id)) continue;
                seenGroups.add(b.recurring_group_id);

                display.push({
                    id: `group-${b.recurring_group_id}`,
                    type: "recurring",
                    recurring_group_id: b.recurring_group_id,
                    start_time: b.start_time,
                    end_time: b.end_time,
                    status: "requested", // keep simple for now
                });

                continue;
            }

            display.push({ ...b, type: "single" });
        }

        return display;
    };

    const handleUpdateBookingStatus = async (bookingId, newStatus) => {
        setMessage("");
        setUpdatingId(bookingId);

        const { error } = await supabase
            .from("bookings")
            .update({ status: newStatus })
            .eq("id", bookingId);

        if (error) {
            setMessage(error.message);
            setUpdatingId("");
            return;
        }

        if (tutorRecord) await loadBookings(tutorRecord.id);
        setUpdatingId("");
    };

    const handleUpdateRecurringGroupStatus = async (groupId, newStatus) => {
        setMessage("");
        setUpdatingId(`group-${groupId}`);

        // Update all bookings in this group that are still requested
        const { error } = await supabase
            .from("bookings")
            .update({ status: newStatus })
            .eq("recurring_group_id", groupId)
            .eq("status", "requested");

        if (error) {
            setMessage(error.message);
            setUpdatingId("");
            return;
        }

        if (tutorRecord) await loadBookings(tutorRecord.id);
        setUpdatingId("");
    };

    const handleMarkPaid = async (bookingOrGroup, type = "single") => {
        setMessage("");
        setUpdatingId(type === "recurring" ? `paid-group-${bookingOrGroup}` : `paid-${bookingOrGroup}`);

        try {
            if (type === "recurring") {
                const { error } = await supabase
                    .from("bookings")
                    .update({ payment_status: "paid" })
                    .eq("recurring_group_id", bookingOrGroup);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("bookings")
                    .update({ payment_status: "paid" })
                    .eq("id", bookingOrGroup);

                if (error) throw error;
            }

            if (tutorRecord) await loadBookings(tutorRecord.id);
            setMessage("Marked as paid.");
        } catch (e) {
            setMessage(e?.message || "Could not mark as paid.");
        } finally {
            setUpdatingId(null);
        }
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

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "tutor") {
                router.push("/auth/sign-in");
                return;
            }

            const { data: tutor, error: tutorError } = await supabase
                .from("tutors")
                .select("*")
                .eq("profile_id", user.id)
                .single();

            if (tutorError || !tutor) {
                setMessage("Tutor record not found. Check tutors table.");
                setChecking(false);
                return;
            }

            setTutorRecord(tutor);
            await loadBookings(tutor.id);
            setChecking(false);
        };

        checkAuth();
    }, [router]);

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ padding: 32 }}>
            <h1>Tutor Dashboard</h1>

            <nav style={{ margin: "12px 0 24px", display: "flex", gap: 12 }}>
                <Link href="/tutor/dashboard">Dashboard</Link>
                <Link href="/tutor/availability">Availability</Link>
            </nav>

            {message && <p>{message}</p>}

            {tutorRecord && (
                <div style={{ marginTop: 16 }}>
                    <p><strong>Name:</strong> {tutorRecord.display_name}</p>
                    <p><strong>Timezone:</strong> {tutorRecord.timezone}</p>
                    <p><strong>Active:</strong> {tutorRecord.is_active ? "Yes" : "No"}</p>
                </div>
            )}

            <section style={{ marginTop: 24 }}>
                <h2>Booking requests</h2>

                {bookings.length === 0 ? (
                    <p>No bookings yet.</p>
                ) : (
                    <ul style={{ paddingLeft: 18 }}>
                        {buildDisplayBookings(bookings).map((b) => (
                            <li key={b.id} style={{ marginBottom: 12 }}>
                                <div>
                                    {b.type === "recurring" ? (
                                        <>
                                            <strong>Recurring</strong>{" "}
                                            {String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}{" "}
                                            <span style={{ color: "#555" }}>({b.status})</span>
                                        </>
                                    ) : (
                                        <>
                                            <strong>{b.session_date}</strong>{" "}
                                            {String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}{" "}
                                            <span style={{ color: "#555" }}>({b.status})</span>
                                        </>
                                    )}
                                </div>

                                <div style={{ marginTop: 4, color: "#555" }}>
                                    Payment: <strong>{b.payment_status || "unpaid"}</strong>
                                    {b.lesson_mode ? ` • ${b.lesson_mode === "in_person" ? "In person" : "Online"}` : ""}
                                </div>

                                {(b.payment_status || "unpaid") !== "paid" && (
                                    <div style={{ marginTop: 6 }}>
                                        <button
                                            disabled={
                                                updatingId === (b.type === "recurring" ? `paid-group-${b.recurring_group_id}` : `paid-${b.id}`)
                                            }
                                            onClick={() =>
                                                b.type === "recurring"
                                                    ? handleMarkPaid(b.recurring_group_id, "recurring")
                                                    : handleMarkPaid(b.id, "single")
                                            }
                                        >
                                            {updatingId === (b.type === "recurring" ? `paid-group-${b.recurring_group_id}` : `paid-${b.id}`)
                                                ? "Updating..."
                                                : "Mark as paid"}
                                        </button>
                                    </div>
                                )}

                                {b.lesson_mode === "in_person" && b.booking_address_text && (
                                    <div style={{ marginTop: 4, color: "#555" }}>
                                        Address: {b.booking_address_text}
                                    </div>
                                )}

                                {b.status === "requested" && (
                                    <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                                        <button
                                            disabled={updatingId === (b.type === "recurring" ? `group-${b.recurring_group_id}` : b.id)}
                                            onClick={() =>
                                                b.type === "recurring"
                                                    ? handleUpdateRecurringGroupStatus(b.recurring_group_id, "accepted")
                                                    : handleUpdateBookingStatus(b.id, "accepted")
                                            }
                                        >
                                            {updatingId === (b.type === "recurring" ? `group-${b.recurring_group_id}` : b.id)
                                                ? "Updating..."
                                                : "Accept"}
                                        </button>

                                        <button
                                            disabled={updatingId === (b.type === "recurring" ? `group-${b.recurring_group_id}` : b.id)}
                                            onClick={() =>
                                                b.type === "recurring"
                                                    ? handleUpdateRecurringGroupStatus(b.recurring_group_id, "rejected")
                                                    : handleUpdateBookingStatus(b.id, "rejected")
                                            }
                                        >
                                            {updatingId === (b.type === "recurring" ? `group-${b.recurring_group_id}` : b.id)
                                                ? "Updating..."
                                                : "Reject"}
                                        </button>
                                    </div>
                                )}

                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <p style={{ marginTop: 24 }}>Availability, bookings, and payments.</p>
        </main>
    );

}
