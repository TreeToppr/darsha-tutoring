"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "../../../lib/supabaseClient";
import { logAudit } from "../../../lib/auditClient";

// Reuse the parent calendar (it already has the mobile scroll + block outline UX).
import BookingsCalendarWeek from "../../parent/dashboard/components/BookingsCalendarWeek";
import TutorBookingsList from "./components/TutorBookingsList";
import TutorTopBar from "./components/TutorTopBar";
import TutorHeroCard from "./components/TutorHeroCard";
// import AvailabilityGrid from "./components/AvailabilityGrid";
// import TutorAvailabilityInline from "./components/TutorAvailabilityInline";

export default function TutorDashboard() {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [message, setMessage] = useState("");

    const [tutorRecord, setTutorRecord] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [updatingKey, setUpdatingKey] = useState(null);

    const [view, setView] = useState("calendar"); // "calendar" | "list"
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    const [weekOffset, setWeekOffset] = useState(0);
    const [busyBlocks, setBusyBlocks] = useState([]);

    const calendarBookings = useMemo(() => {
        return (bookings || []).filter((b) => {
            const s = String(b?.status || "").toLowerCase();
            // Keep parity with parent: hide cancelled/declined/rejected from calendar.
            return !["cancelled", "declined", "rejected"].includes(s);
        });
    }, [bookings]);

    const openCreateBusyModal = ({ date, time }) => {
        setBusyModalMode("create");
        setBusyDraft({
            id: null,
            date,
            start_time: time,
            end_time: addMinutesToTime(time, 60),
            note: "",
        });
        setBusyModalOpen(true);
    };

    const openEditBusyModal = (item) => {
        setBusyModalMode("edit");
        setBusyDraft({
            id: item.__busy_id,
            date: item.session_date,
            start_time: String(item.start_time).slice(0, 5),
            end_time: String(item.end_time).slice(0, 5),
            note: item.note || "",
        });
        setBusyModalOpen(true);
    };

    const scrollToBookingCard = (bookingId) => {
        try {
            const el = document.getElementById(`booking-${bookingId}`);
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {
            // ignore
        }
    };

    const [busyModalOpen, setBusyModalOpen] = useState(false);
    const [busyModalMode, setBusyModalMode] = useState("create"); // "create" | "edit"
    const [busyDraft, setBusyDraft] = useState({
        id: null,
        date: "",
        start_time: "08:00",
        end_time: "09:00",
        note: "",
    });
    const [busySaving, setBusySaving] = useState(false);

    const onCalendarBookingClick = (b) => {
        if (!b?.id) return;
        setSelectedBookingId(b.id);
        setView("list");
        // Let the list render first, then scroll.
        setTimeout(() => scrollToBookingCard(b.id), 50);
    };

    const loadBookings = async (tutorId) => {
        setMessage("");

        // Note:
        // - We join students + subjects (matches the parent dashboard shape).
        // - We ALSO attempt to join the parent profile for parent display.
        //   If your FK name differs, Supabase will error with something like:
        //   "Could not find a relationship between 'bookings' and 'profiles'".
        //   In that case, adjust the join name (see notes below).
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
                booking_address_text,
                is_recurring,
                recurring_group_id,
                parent_id,
                student_id,
                subject_id,
                students(full_name, year_level),
                subjects(name),
                parent:profiles!bookings_parent_id_fkey(full_name, phone_number)
            `)
            .eq("tutor_id", tutorId)
            .order("session_date", { ascending: true })
            .order("start_time", { ascending: true });

        if (error) {
            setMessage(error.message);
            setBookings([]);
            return;
        }

        setBookings(data || []);
    };

    const loadBusyBlocksForWeek = async (tutorId, weekOffsetValue) => {
        if (!tutorId) return;

        const now = new Date();
        const weekStart = startOfWeekMonday(now);
        weekStart.setDate(weekStart.getDate() + weekOffsetValue * 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const startIso = toISODate(weekStart);
        const endIso = toISODate(weekEnd);

        const { data, error } = await supabase
            .from("tutor_date_overrides")
            .select("id, date, start_time, end_time, note, is_available")
            .eq("tutor_id", tutorId)
            .eq("is_available", false)
            .gte("date", startIso)
            .lte("date", endIso)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true });

        if (error) {
            setMessage(error.message);
            setBusyBlocks([]);
            return;
        }

        setBusyBlocks(data || []);
    };

    const updateBookingStatus = async (bookingId, newStatus) => {
        if (!bookingId) return;
        setMessage("");
        setUpdatingKey(`booking-${bookingId}-${newStatus}`);

        const { error } = await supabase
            .from("bookings")
            .update({ status: newStatus })
            .eq("id", bookingId);

        if (error) {
            setMessage(error.message);
            setUpdatingKey(null);
            return;
        }

        await logAudit({
            action: newStatus === "accepted" ? "booking.accepted" : "booking.rejected",
            entityType: "booking",
            entityId: bookingId,
            metadata: { new_status: newStatus },
        });

        if (tutorRecord?.id) await loadBookings(tutorRecord.id);
        setUpdatingKey(null);
    };

    const updateRecurringGroupStatus = async (groupId, newStatus) => {
        if (!groupId) return;
        setMessage("");
        setUpdatingKey(`group-${groupId}-${newStatus}`);

        // Update all bookings in this group that are still requested.
        const { error } = await supabase
            .from("bookings")
            .update({ status: newStatus })
            .eq("recurring_group_id", groupId)
            .eq("status", "requested");

        if (error) {
            setMessage(error.message);
            setUpdatingKey(null);
            return;
        }

        await logAudit({
            action: newStatus === "accepted" ? "booking.series_accepted" : "booking.series_rejected",
            entityType: "recurring_group",
            entityId: groupId,
            metadata: { new_status: newStatus },
        });

        if (tutorRecord?.id) await loadBookings(tutorRecord.id);
        setUpdatingKey(null);
    };

    const cancelBookingAsTutor = async (booking) => {
        if (!booking?.id) return;

        setMessage("");
        setUpdatingKey(`cancel-${booking.id}`);

        const { error } = await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", booking.id);

        if (error) {
            setMessage(error.message);
            setUpdatingKey(null);
            return;
        }

        await logAudit({
            action: "booking.cancelled_by_tutor",
            entityType: "booking",
            entityId: booking.id,
            metadata: { new_status: "cancelled" },
        });

        // send emails (parent + tutor) server-side
        const emailRes = await fetch("/api/email/tutor-cancelled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: booking.id }),
        });

        if (!emailRes.ok) {
            const errText = await emailRes.text().catch(() => "");
            console.error("Tutor-cancel email failed:", errText);
        }

        if (tutorRecord?.id) await loadBookings(tutorRecord.id);
        setUpdatingKey(null);
    };


    const validateBusyDraft = () => {
        if (!tutorRecord?.id) return "Tutor not loaded.";
        if (!busyDraft.date) return "Date is required.";
        const s = timeToMinutes(busyDraft.start_time);
        const e = timeToMinutes(busyDraft.end_time);
        if (e <= s) return "End time must be after start time.";

        // Prevent overlapping bookings (optional safety)
        const sameDayBookings = (calendarBookings || []).filter((b) => b.session_date === busyDraft.date);
        for (const b of sameDayBookings) {
            const bs = timeToMinutes(b.start_time);
            const be = timeToMinutes(b.end_time);
            if (overlaps(s, e, bs, be)) return "That time overlaps an existing booking.";
        }

        // Prevent overlapping other busy blocks
        const sameDayBusy = (busyBlocks || []).filter((bb) => bb.date === busyDraft.date && bb.id !== busyDraft.id);
        for (const bb of sameDayBusy) {
            const bbs = timeToMinutes(bb.start_time);
            const bbe = timeToMinutes(bb.end_time);
            if (overlaps(s, e, bbs, bbe)) return "That time overlaps an existing busy block.";
        }

        return "";
    };

    const saveBusyBlock = async () => {
        const err = validateBusyDraft();
        if (err) {
            setMessage(err);
            return;
        }

        setBusySaving(true);
        setMessage("");

        try {
            if (busyModalMode === "create") {
                const { error } = await supabase.from("tutor_date_overrides").insert({
                    tutor_id: tutorRecord.id,
                    date: busyDraft.date,
                    start_time: busyDraft.start_time,
                    end_time: busyDraft.end_time,
                    note: busyDraft.note || "",
                    is_available: false,
                });
                if (error) throw error;

                await logAudit({
                    action: "availability.busy_created",
                    entityType: "tutor_date_override",
                    entityId: tutorRecord.id,
                    metadata: { ...busyDraft },
                });
            } else {
                const { error } = await supabase
                    .from("tutor_date_overrides")
                    .update({
                        date: busyDraft.date,
                        start_time: busyDraft.start_time,
                        end_time: busyDraft.end_time,
                        note: busyDraft.note || "",
                        is_available: false,
                    })
                    .eq("id", busyDraft.id);
                if (error) throw error;

                await logAudit({
                    action: "availability.busy_updated",
                    entityType: "tutor_date_override",
                    entityId: busyDraft.id,
                    metadata: { ...busyDraft },
                });
            }

            await loadBusyBlocksForWeek(tutorRecord.id, weekOffset);
            setBusyModalOpen(false);
        } catch (e) {
            setMessage(e?.message || "Could not save busy block.");
        } finally {
            setBusySaving(false);
        }
    };

    const deleteBusyBlock = async () => {
        if (!busyDraft.id) return;
        setBusySaving(true);
        setMessage("");

        try {
            const { error } = await supabase.from("tutor_date_overrides").delete().eq("id", busyDraft.id);
            if (error) throw error;

            await logAudit({
                action: "availability.busy_deleted",
                entityType: "tutor_date_override",
                entityId: busyDraft.id,
                metadata: { date: busyDraft.date },
            });

            await loadBusyBlocksForWeek(tutorRecord.id, weekOffset);
            setBusyModalOpen(false);
        } catch (e) {
            setMessage(e?.message || "Could not delete busy block.");
        } finally {
            setBusySaving(false);
        }
    };

    const markPaid = async (bookingId, groupId) => {
        setMessage("");
        const key = groupId ? `paid-group-${groupId}` : `paid-${bookingId}`;
        setUpdatingKey(key);

        try {
            if (groupId) {
                const { error } = await supabase
                    .from("bookings")
                    .update({ payment_status: "paid" })
                    .eq("recurring_group_id", groupId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("bookings")
                    .update({ payment_status: "paid" })
                    .eq("id", bookingId);
                if (error) throw error;
            }

            await logAudit({
                action: groupId ? "payment.series_marked_paid" : "payment.marked_paid",
                entityType: groupId ? "recurring_group" : "booking",
                entityId: groupId || bookingId,
                metadata: { payment_status: "paid" },
            });

            if (tutorRecord?.id) await loadBookings(tutorRecord.id);
            setMessage("Marked as paid.");
        } catch (e) {
            setMessage(e?.message || "Could not mark as paid.");
        } finally {
            setUpdatingKey(null);
        }
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

            if (!profile || profile.role !== "tutor") {
                router.push("/auth/sign-in");
                return;
            }

            const { data: tutor, error: tutorError } = await supabase
                .from("tutors")
                .select("id, display_name, timezone, is_active, email, phone, bio, bank_account_masked, default_window_start, default_window_end")
                .eq("profile_id", user.id)
                .single();

            if (tutorError || !tutor) {
                setMessage("Tutor record not found. Check tutors table.");
                setChecking(false);
                return;
            }

            setTutorRecord(tutor);
            await loadBookings(tutor.id);
            await loadBusyBlocksForWeek(tutor.id, weekOffset);
            setChecking(false);
        };

        init();
    }, [router]);

    useEffect(() => {
        if (!tutorRecord?.id) return;
        loadBusyBlocksForWeek(tutorRecord.id, weekOffset);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tutorRecord?.id, weekOffset]);

    const calendarItems = useMemo(() => {
        const bookingItems = calendarBookings.map((b) => ({ ...b, __type: "booking" }));

        const busyItems = (busyBlocks || []).map((bb) => ({
            id: `busy_${bb.id}`,
            session_date: bb.date,
            start_time: bb.start_time,
            end_time: bb.end_time,
            status: "busy",
            payment_status: "",
            note: bb.note || "",
            __type: "busy",
            __busy_id: bb.id,
        }));

        return [...bookingItems, ...busyItems];
    }, [calendarBookings, busyBlocks]);


    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
            <div style={{ maxWidth: 980, margin: "0 auto" }}>
                <TutorTopBar firstName={(tutorRecord?.display_name || "").split(" ")[0]} />

                <TutorHeroCard tutor={tutorRecord} stats={computeStats(bookings)} />

                {message ? (
                    <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#fff7e6", border: "1px solid #ffe0a3" }}>
                        {message}
                    </div>
                ) : null}

                <div style={{ display: "block", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 0.65fr)", gap: 14, marginTop: 14, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", margin: "8px 0 10px 0" }}>
                            <button type="button" onClick={() => setView("calendar")} style={toggleBtnStyle(view === "calendar")}>Calendar</button>
                            <button type="button" onClick={() => setView("list")} style={toggleBtnStyle(view === "list")}>List</button>
                        </div>

                        <div style={{ display: "flex", gap: 8, margin: "8px 0 12px 0", flexWrap: "wrap" }}>
                            <button type="button" style={ghostBtnStyle} onClick={() => setWeekOffset((w) => w - 1)}>
                                ◀ Previous week
                            </button>
                            <button type="button" style={ghostBtnStyle} onClick={() => setWeekOffset(0)}>
                                This week
                            </button>
                            <button type="button" style={ghostBtnStyle} onClick={() => setWeekOffset((w) => w + 1)}>
                                Next week ▶
                            </button>
                        </div>


                        {view === "calendar" ? (
                            // <BookingsCalendarWeek
                            //     bookings={calendarBookings}
                            //     onBookingClick={onCalendarBookingClick}
                            //     getBlockTitle={(b) => b?.students?.full_name || "Student"}
                            //     getBlockSub={(b) => b?.subjects?.name || ""}
                            //     getBlockMeta={(b) => {
                            //         const timeRange = `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}`;
                            //         const s = String(b.status || "").toLowerCase();
                            //         const p = b.payment_status || "unpaid";
                            //         return `${timeRange} · ${s} · ${p}`;
                            //     }}
                            // />

                            <BookingsCalendarWeek
                                bookings={calendarItems}
                                weekOffset={weekOffset}
                                onEmptySlotClick={(slot) => openCreateBusyModal(slot)}
                                onBookingClick={(item) => {
                                    if (item.__type === "busy") {
                                        openEditBusyModal(item);
                                        return;
                                    }
                                    onCalendarBookingClick(item);
                                }}

                                getBlockTitle={(item) => (item.__type === "busy" ? (item.note ? item.note : "Blocked") : item?.students?.full_name || "Parent")}
                                // getBlockSub={(item) => (item.__type === "busy" ? "Busy" : item?.subjects?.name || "")}
                                getBlockSub={(item) =>
                                    item.__type === "busy"
                                        ? (item.note ? item.note : "Blocked")
                                        : item?.parent?.full_name || ""
                                }
                                getBlockMeta={(item) => {
                                    const timeRange = `${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)}`;
                                    return item.__type === "busy" ? timeRange : `${timeRange} · ${String(item.status || "").toLowerCase()}`;
                                }}
                                getBlockStyle={(item) => {
                                    if (item.__type !== "busy") return {};
                                    return {
                                        background: "#f2f2f2",
                                        border: "2px dashed #999",
                                        color: "#333",
                                    };
                                }}
                            />

                        ) : (
                            <TutorBookingsList
                                bookings={bookings}
                                selectedBookingId={selectedBookingId}
                                updatingKey={updatingKey}
                                onAccept={(b) => updateBookingStatus(b.id, "accepted")}
                                onReject={(b) => updateBookingStatus(b.id, "rejected")}
                                onCancel={cancelBookingAsTutor}
                                onAcceptSeries={(b) => updateRecurringGroupStatus(b.recurring_group_id, "accepted")}
                                onRejectSeries={(b) => updateRecurringGroupStatus(b.recurring_group_id, "rejected")}
                                onMarkPaid={(b) => markPaid(b.id, null)}
                                onMarkPaidSeries={(b) => markPaid(null, b.recurring_group_id)}
                            />
                        )}
                    </div>

                    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
                        {/* <div id="availability-panel">
                            <Panel title="Availability">
                                <div style={{ color: "#555", fontSize: 13, marginBottom: 10 }}>
                                    Click on a slot to add a busy block. Click a busy block to edit.
                                </div>

                                <TutorAvailabilityInline
                                    tutorIdProp={tutorRecord?.id}
                                    defaultStartProp={tutorRecord?.default_window_start}
                                    defaultEndProp={tutorRecord?.default_window_end}
                                    onDefaultsUpdated={({ defaultStart, defaultEnd }) => {
                                        // update local tutorRecord so the dashboard reflects changes immediately
                                        setTutorRecord((prev) =>
                                            prev
                                                ? { ...prev, default_window_start: defaultStart, default_window_end: defaultEnd }
                                                : prev
                                        );
                                    }}
                                />
                            </Panel>
                        </div> */}

                    </div>
                    <Panel title="Profile">
                        <div style={{ display: "grid", gap: 6, color: "#555", fontSize: 13 }}>
                            <div><span style={{ color: "#777" }}>Email:</span> <b>{tutorRecord?.email || "Not set"}</b></div>
                            <div><span style={{ color: "#777" }}>Phone:</span> <b>{tutorRecord?.phone || "Not set"}</b></div>
                            <div><span style={{ color: "#777" }}>Bank:</span> <b>{formatBankMask(tutorRecord?.bank_account_masked)}</b></div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                            <Link href="/tutor/profile">Edit profile</Link>
                        </div>
                    </Panel>

                    {busyModalOpen ? (
                        <div
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(0,0,0,0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 16,
                                zIndex: 9999,
                            }}
                            onClick={() => !busySaving && setBusyModalOpen(false)}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 520,
                                    background: "#fff",
                                    borderRadius: 18,
                                    border: "1px solid #eee",
                                    padding: 16,
                                    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                                    <div style={{ fontWeight: 950, fontSize: 16 }}>
                                        {busyModalMode === "create" ? "Add busy block" : "Edit busy block"}
                                    </div>

                                    <button type="button" style={ghostBtnStyle} disabled={busySaving} onClick={() => setBusyModalOpen(false)}>
                                        Close
                                    </button>
                                </div>

                                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: "#666", fontWeight: 800, marginBottom: 6 }}>Date</div>
                                            <input
                                                type="date"
                                                value={busyDraft.date}
                                                onChange={(e) => setBusyDraft((p) => ({ ...p, date: e.target.value }))}
                                                style={inputStyle}
                                                disabled={busySaving}
                                            />
                                        </div>

                                        <div>
                                            <div style={{ fontSize: 12, color: "#666", fontWeight: 800, marginBottom: 6 }}>Note</div>
                                            <input
                                                type="text"
                                                placeholder="Optional note (e.g., School pickup)"
                                                value={busyDraft.note}
                                                onChange={(e) => setBusyDraft((p) => ({ ...p, note: e.target.value }))}
                                                style={inputStyle}
                                                disabled={busySaving}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: "#666", fontWeight: 800, marginBottom: 6 }}>Start</div>
                                            <input
                                                type="time"
                                                value={busyDraft.start_time}
                                                onChange={(e) => setBusyDraft((p) => ({ ...p, start_time: e.target.value }))}
                                                style={inputStyle}
                                                disabled={busySaving}
                                            />
                                        </div>

                                        <div>
                                            <div style={{ fontSize: 12, color: "#666", fontWeight: 800, marginBottom: 6 }}>End</div>
                                            <input
                                                type="time"
                                                value={busyDraft.end_time}
                                                onChange={(e) => setBusyDraft((p) => ({ ...p, end_time: e.target.value }))}
                                                style={inputStyle}
                                                disabled={busySaving}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
                                        {busyModalMode === "edit" ? (
                                            <button
                                                type="button"
                                                onClick={deleteBusyBlock}
                                                disabled={busySaving}
                                                style={{
                                                    padding: "10px 12px",
                                                    borderRadius: 12,
                                                    border: "1px solid #eee",
                                                    background: "#fff",
                                                    fontWeight: 900,
                                                    color: "#b00020",
                                                }}
                                            >
                                                Delete
                                            </button>
                                        ) : (
                                            <div />
                                        )}

                                        <button
                                            type="button"
                                            onClick={saveBusyBlock}
                                            disabled={busySaving}
                                            style={{
                                                padding: "10px 12px",
                                                borderRadius: 12,
                                                border: "1px solid #111",
                                                background: "#111",
                                                color: "#fff",
                                                fontWeight: 900,
                                            }}
                                        >
                                            {busySaving ? "Saving..." : "Save"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                </div>
            </div>
        </div>
    );

}

const toggleBtnStyle = (active) => ({
    padding: "8px 10px",
    borderRadius: 12,
    border: active ? "2px solid #111" : "1px solid #ddd",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
});

const ghostBtnStyle = {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
};

const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #eee",
    fontWeight: 800,
};

function formatBankMask(masked) {
    const s = String(masked || "");
    if (!s) return "Not set";
    return `****${s.slice(-4)}`;
}

function Panel({ title, children }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    );
}

function computeStats(bookings) {
    const rows = Array.isArray(bookings) ? bookings : [];
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    const upcoming = rows.filter((b) => (b?.session_date || "") >= todayIso && String(b?.status || "").toLowerCase() !== "cancelled");
    const requested = upcoming.filter((b) => String(b?.status || "").toLowerCase() === "requested");
    const unpaid = upcoming.filter((b) => String(b?.payment_status || "unpaid").toLowerCase() !== "paid");

    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    const weekEndIso = weekEnd.toISOString().slice(0, 10);
    const thisWeek = rows.filter((b) => (b?.session_date || "") >= todayIso && (b?.session_date || "") <= weekEndIso);

    return { upcoming: upcoming.length, requested: requested.length, unpaid: unpaid.length, thisWeek: thisWeek.length };
}

function startOfWeekMonday(d) {
    const x = new Date(d);
    const day = x.getDay(); // 0 Sun .. 6 Sat
    const diff = (day === 0 ? -6 : 1) - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
}

function toISODate(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}

function timeToMinutes(hhmm) {
    const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
    return h * 60 + m;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
    return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function addMinutesToTime(hhmm, minsToAdd) {
    const m = timeToMinutes(hhmm) + minsToAdd;
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}
