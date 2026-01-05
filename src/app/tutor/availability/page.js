"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function TutorAvailabilityPage() {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [message, setMessage] = useState("");
    const [tutorId, setTutorId] = useState(null);
    const [defaultStart, setDefaultStart] = useState("07:00");
    const [defaultEnd, setDefaultEnd] = useState("21:00");
    const [busyBlocks, setBusyBlocks] = useState([]);

    // Form state
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("15:00");
    const [endTime, setEndTime] = useState("16:00");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const loadBusyBlocks = async (tId) => {
        const { data, error } = await supabase
            .from("tutor_date_overrides")
            .select("*")
            .eq("tutor_id", tId)
            .eq("is_available", false)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true });

        if (error) {
            setMessage(error.message);
            return;
        }
        setBusyBlocks(data || []);
    };

    useEffect(() => {
        const init = async () => {
            setMessage("");

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
                .select("id, default_window_start, default_window_end")
                .eq("profile_id", user.id)
                .single();

            if (tutorError || !tutor) {
                setMessage("Tutor record not found.");
                setChecking(false);
                return;
            }

            setTutorId(tutor.id);

            if (tutor.default_window_start) {
                setDefaultStart(String(tutor.default_window_start).slice(0, 5));
            }
            if (tutor.default_window_end) {
                setDefaultEnd(String(tutor.default_window_end).slice(0, 5));
            }

            await loadBusyBlocks(tutor.id);
            setChecking(false);
        };

        init();
    }, [router]);

    const handleAddBusyBlock = async (e) => {
        e.preventDefault();
        if (!tutorId) return;

        setMessage("");
        setSaving(true);

        if (!date) {
            setMessage("Please choose a date.");
            setSaving(false);
            return;
        }

        if (endTime <= startTime) {
            setMessage("End time must be after start time.");
            setSaving(false);
            return;
        }

        const { error } = await supabase.from("tutor_date_overrides").insert({
            tutor_id: tutorId,
            date,
            is_available: false,
            start_time: startTime,
            end_time: endTime,
            note: note.trim() || null,
        });

        if (error) {
            setMessage(error.message);
            setSaving(false);
            return;
        }

        setNote("");
        await loadBusyBlocks(tutorId);
        setSaving(false);
    };

    const handleSaveDefaultWindow = async (e) => {
        e.preventDefault();
        if (!tutorId) return;

        setMessage("");
        setSaving(true);

        if (defaultEnd <= defaultStart) {
            setMessage("Default end time must be after start time.");
            setSaving(false);
            return;
        }

        const { error } = await supabase
            .from("tutors")
            .update({
                default_window_start: defaultStart,
                default_window_end: defaultEnd,
            })
            .eq("id", tutorId);

        if (error) {
            setMessage(error.message);
            setSaving(false);
            return;
        }

        setMessage("Default availability updated.");
        setSaving(false);
    };

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ maxWidth: 860, margin: "0 auto", padding: 32 }}>
            <h1>Availability</h1>

            <section style={{ marginTop: 12, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
                <h2 style={{ marginTop: 0 }}>Default availability</h2>

                <p style={{ color: "#555", marginTop: 0 }}>
                    This is the default window parents can book within (before busy blocks are applied).
                </p>

                <form onSubmit={handleSaveDefaultWindow} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Start
                        <input
                            type="time"
                            value={defaultStart}
                            onChange={(e) => setDefaultStart(e.target.value)}
                            required
                        />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        End
                        <input
                            type="time"
                            value={defaultEnd}
                            onChange={(e) => setDefaultEnd(e.target.value)}
                            required
                        />
                    </label>

                    <button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save default hours"}
                    </button>
                </form>
            </section>


            {message && <p>{message}</p>}

            <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
                <h2 style={{ marginTop: 0 }}>Add busy block</h2>

                <form onSubmit={handleAddBusyBlock} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />

                    <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                    />

                    <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                    />

                    <input
                        type="text"
                        placeholder="Note (optional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />

                    <button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Add busy block"}
                    </button>
                </form>

                <p style={{ marginTop: 10, color: "#555" }}>
                    Later we’ll add “block whole day” and overlap checks.
                </p>
            </section>

            <section style={{ marginTop: 24 }}>
                <h2>Busy blocks</h2>

                {busyBlocks.length === 0 ? (
                    <p>No busy blocks yet.</p>
                ) : (
                    <ul style={{ paddingLeft: 18 }}>
                        {busyBlocks.map((b) => (
                            <li key={b.id} style={{ marginBottom: 8 }}>
                                <strong>{b.date}</strong>{" "}
                                {String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}
                                {b.note ? ` - ${b.note}` : ""}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}
