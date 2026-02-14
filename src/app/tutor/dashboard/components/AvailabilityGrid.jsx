"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
// import { supabase } from "../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";

const stripSeriesTag = (note) => String(note || "").replace(/\[SERIES:[a-z0-9]+\]\s*/i, "");
// const displayNote = (note) => stripSeriesTag(note).trim();

const displayNote = (note) => stripSeriesTag(note || "").trim();

const shortNote = (note, max = 18) => {
    const n = displayNote(note);
    if (!n) return "";
    return n.length > max ? n.slice(0, max - 1) + "…" : n;
};


// ---- time helpers (same idea as booking page) ----
const timeToMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const getAucklandNowISODateAndMinutes = () => {
    const now = new Date();
    const aucklandDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Pacific/Auckland",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);

    const parts = new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const hh = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const mm = Number(parts.find((p) => p.type === "minute")?.value || 0);

    return { aucklandDate, aucklandMinutes: hh * 60 + mm };
};

export default function TutorAvailabilityPage() {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [message, setMessage] = useState("");

    const [tutorId, setTutorId] = useState(null);
    const [defaultStart, setDefaultStart] = useState("07:00");
    const [defaultEnd, setDefaultEnd] = useState("21:00");

    // week view state
    const [monthOffset, setMonthOffset] = useState(0); // shifts by weeks (same pattern as booking)
    const [busyByDate, setBusyByDate] = useState({}); // { "YYYY-MM-DD": [{id,start,end,note}] }
    const [loadingWeek, setLoadingWeek] = useState(false);

    // hover + modal
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const [hoverPreview, setHoverPreview] = useState(null); // {date,start,end}
    const [hoveredCell, setHoveredCell] = useState(null); // {date, slotStart}

    const [selectedCell, setSelectedCell] = useState(null); // {date, start}
    const [modalDuration, setModalDuration] = useState(60);
    const [modalNote, setModalNote] = useState("");
    const [saving, setSaving] = useState(false);

    const [selectedBlock, setSelectedBlock] = useState(null); // {id,date,start,end,note}
    const [modalStart, setModalStart] = useState("08:00");
    const [modalEnd, setModalEnd] = useState("09:00");

    const [isRecurring, setIsRecurring] = useState(false);
    const [repeatWeeks, setRepeatWeeks] = useState(10); // how many weeks ahead
    const [applyToSeries, setApplyToSeries] = useState(false); // when editing: apply to whole series

    const [overrides, setOverrides] = useState([]);

    // weekDays: Monday -> Sunday
    const weekStart = useMemo(() => {
        const base = new Date();
        base.setDate(base.getDate() + monthOffset * 7);
        const start = new Date(base);
        const mondayOffset = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - mondayOffset);
        start.setHours(0, 0, 0, 0);
        return start;
    }, [monthOffset]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const iso = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Pacific/Auckland",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(d);

            const short = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });

            return { iso, short };
        });
    }, [weekStart]);

    const hours = useMemo(() => Array.from({ length: 17 }).map((_, i) => 7 + i), []); // 07:00 - 23:00

    const loadOverridesForWeek = async (tutorId, weekDays) => {
        const startIso = weekDays[0].iso;
        const endIso = weekDays[6].iso;

        const { data, error } = await supabase
            .from("tutor_date_overrides")
            .select("id, date, is_available, start_time, end_time, note")
            .eq("tutor_id", tutorId)
            .gte("date", startIso)
            .lte("date", endIso);

        if (error) throw error;

        return (data || []).map((o) => ({
            id: o.id,
            date: o.date,
            is_available: o.is_available,
            start: timeToMinutes(String(o.start_time).slice(0, 5)),
            end: timeToMinutes(String(o.end_time).slice(0, 5)),
            note: o.note || "",
        }));
    };

    const loadBusyWeek = async (tId, days) => {
        setLoadingWeek(true);
        setMessage("");

        try {
            const startIso = days[0].iso;
            const endIso = days[6].iso;

            const { data, error } = await supabase
                .from("tutor_date_overrides")
                .select("id, date, start_time, end_time, note")
                .eq("tutor_id", tId)
                .eq("is_available", false)
                .gte("date", startIso)
                .lte("date", endIso)
                .order("date", { ascending: true })
                .order("start_time", { ascending: true });

            if (error) throw error;

            const map = {};
            for (const d of days) map[d.iso] = [];

            (data || []).forEach((b) => {
                const date = b.date;
                if (!map[date]) map[date] = [];
                map[date].push({
                    id: b.id,
                    start: timeToMinutes(String(b.start_time).slice(0, 5)),
                    end: timeToMinutes(String(b.end_time).slice(0, 5)),
                    note: b.note || "",
                });
            });

            setBusyByDate(map);
        } catch (e) {
            setMessage(e?.message || "Could not load busy blocks.");
            setBusyByDate({});
        } finally {
            setLoadingWeek(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setMessage("");

            const { data } = await supabase.auth.getUser();
            const user = data?.user;

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

            if (tutor.default_window_start) setDefaultStart(String(tutor.default_window_start).slice(0, 5));
            if (tutor.default_window_end) setDefaultEnd(String(tutor.default_window_end).slice(0, 5));

            await loadBusyWeek(tutor.id, weekDays);
            setChecking(false);
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    useEffect(() => {
        if (!tutorId) return;

        const run = async () => {
            await loadBusyWeek(tutorId, weekDays);

            // optional (you’re not using overrides yet, but this proves the query works)
            const ovr = await loadOverridesForWeek(tutorId, weekDays);
            setOverrides(ovr);
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tutorId, monthOffset, weekStart]);

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
            .update({ default_window_start: defaultStart, default_window_end: defaultEnd })
            .eq("id", tutorId);

        if (error) {
            setMessage(error.message);
            setSaving(false);
            return;
        }

        setMessage("Default availability updated.");
        setSaving(false);
    };

    const saveBusyBlock = async () => {
        if (!tutorId || !selectedCell) return;

        setSaving(true);
        setMessage("");

        const startMin = timeToMinutes(modalStart);
        const endMin = timeToMinutes(modalEnd);

        if (endMin <= startMin) {
            setMessage("End time must be after start time.");
            setSaving(false);
            return;
        }

        const isoDate = selectedCell.date;

        // Existing series id (if editing an existing block that has one)
        const existingSeriesId = extractSeriesId(selectedBlock?.note);
        const shouldApplyToSeries = Boolean(selectedBlock && existingSeriesId && applyToSeries);

        // If creating a new recurring series, generate a new id
        const seriesId = (!selectedBlock && isRecurring) ? makeSeriesId() : existingSeriesId;

        const userNote = stripSeriesTag(modalNote).trim();
        const noteWithTag = seriesId ? `[SERIES:${seriesId}] ${userNote}`.trim() : (userNote || null);

        try {
            // CASE A: Editing the whole series (update all rows with the same series tag)
            if (shouldApplyToSeries) {
                const { error: updErr } = await supabase
                    .from("tutor_date_overrides")
                    .update({
                        start_time: minutesToTime(startMin),
                        end_time: minutesToTime(endMin),
                        note: noteWithTag,
                    })
                    .eq("tutor_id", tutorId)
                    .eq("is_available", false)
                    .like("note", `%[SERIES:${existingSeriesId}]%`);

                if (updErr) throw updErr;

                await loadBusyWeek(tutorId, weekDays);
                setSelectedCell(null);
                setSelectedBlock(null);
                setModalNote("");
                setModalDuration(60);
                setIsRecurring(false);
                setApplyToSeries(false);
                return;
            }

            // CASE B: Editing a single existing block (your current behaviour, but keep series tag if present)
            if (selectedBlock?.id) {
                const { error: updErr } = await supabase
                    .from("tutor_date_overrides")
                    .update({
                        tutor_id: tutorId,
                        date: isoDate,
                        is_available: false,
                        start_time: minutesToTime(startMin),
                        end_time: minutesToTime(endMin),
                        note: noteWithTag,
                    })
                    .eq("id", selectedBlock.id);

                if (updErr) throw updErr;

                await loadBusyWeek(tutorId, weekDays);
                setSelectedCell(null);
                setSelectedBlock(null);
                setModalNote("");
                setModalDuration(60);
                setIsRecurring(false);
                setApplyToSeries(false);
                return;
            }

            // CASE C: Creating a new busy block (single or recurring series)
            if (isRecurring) {
                const rows = [];
                for (let w = 0; w < Math.max(1, Number(repeatWeeks) || 1); w++) {
                    const date = addDaysISO(isoDate, w * 7);
                    rows.push({
                        tutor_id: tutorId,
                        date,
                        is_available: false,
                        start_time: minutesToTime(startMin),
                        end_time: minutesToTime(endMin),
                        note: noteWithTag,
                    });
                }

                const { error: insErr } = await supabase.from("tutor_date_overrides").insert(rows);
                if (insErr) throw insErr;

                await loadBusyWeek(tutorId, weekDays);
                setSelectedCell(null);
                setSelectedBlock(null);
                setModalNote("");
                setModalDuration(60);
                setIsRecurring(false);
                setApplyToSeries(false);
                return;
            }

            // Non-recurring single insert
            const { error: insErr } = await supabase.from("tutor_date_overrides").insert({
                tutor_id: tutorId,
                date: isoDate,
                is_available: false,
                start_time: minutesToTime(startMin),
                end_time: minutesToTime(endMin),
                note: noteWithTag,
            });

            if (insErr) throw insErr;

            await loadBusyWeek(tutorId, weekDays);

            setSelectedCell(null);
            setSelectedBlock(null);
            setModalNote("");
            setModalDuration(60);
            setIsRecurring(false);
            setApplyToSeries(false);
        } catch (e) {
            setMessage(e?.message || "Could not save busy block.");
        } finally {
            setSaving(false);
        }
    };

    const deleteBusyBlock = async () => {
        if (!selectedBlock?.id) return;

        setSaving(true);
        setMessage("");

        try {
            const { error } = await supabase
                .from("tutor_date_overrides")
                .delete()
                .eq("id", selectedBlock.id);

            if (error) throw error;

            await loadBusyWeek(tutorId, weekDays);

            setSelectedCell(null);
            setSelectedBlock(null);
            setModalNote("");
            setModalDuration(60);
        } catch (e) {
            setMessage(e?.message || "Could not delete busy block.");
        } finally {
            setSaving(false);
        }
    };

    const isBusy = (isoDate, start, end) => {
        const blocks = busyByDate[isoDate] || [];
        return blocks.some((b) => start < b.end && end > b.start);
    };

    const findBusyBlockAt = (isoDate, slotStart, slotEnd) => {
        const blocks = busyByDate[isoDate] || [];
        // find the first block that overlaps the slot
        return blocks.find((b) => slotStart < b.end && slotEnd > b.start) || null;
    };

    const openCreateModal = (isoDate, start) => {
        setSelectedBlock(null);
        setSelectedCell({ date: isoDate, start });
        setModalNote("");
        setModalStart(minutesToTime(start));
        setModalEnd(minutesToTime(start + 60));
        setModalDuration(60);
        setIsRecurring(false);
        setRepeatWeeks(10);
        setApplyToSeries(false);
    };

    const openEditModal = (block) => {
        setSelectedBlock(block);
        setSelectedCell({ date: block.date, start: block.start });
        setModalNote(block.note || "");
        setModalStart(minutesToTime(block.start));
        setModalEnd(minutesToTime(block.end));
        setModalDuration(block.end - block.start);
        setIsRecurring(false); // editing does not default to recurring
        setRepeatWeeks(10);
        setApplyToSeries(false);
    };

    const makeSeriesId = () => Math.random().toString(36).slice(2, 10);

    const extractSeriesId = (note) => {
        if (!note) return null;
        const m = String(note).match(/\[SERIES:([a-z0-9]+)\]/i);
        return m ? m[1] : null;
    };

    const addDaysISO = (isoDate, days) => {
        const d = new Date(isoDate + "T00:00:00");
        d.setDate(d.getDate() + days);
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Pacific/Auckland",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(d);
    };

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    const { aucklandDate } = getAucklandNowISODateAndMinutes();

    return (
        <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
            <h1 style={{ marginTop: 0 }}>Availability</h1>

            <section style={{ marginTop: 12, padding: 16, border: "1px solid #ddd", borderRadius: 10 }}>
                <h2 style={{ marginTop: 0 }}>Default availability</h2>
                <p style={{ color: "#555", marginTop: 0 }}>
                    Parents can book inside this window. Use the grid below to add busy blocks.
                </p>

                <form onSubmit={handleSaveDefaultWindow} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Start
                        <input type="time" value={defaultStart} onChange={(e) => setDefaultStart(e.target.value)} required />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        End
                        <input type="time" value={defaultEnd} onChange={(e) => setDefaultEnd(e.target.value)} required />
                    </label>

                    <button type="submit" disabled={saving} style={{ padding: "8px 12px" }}>
                        {saving ? "Saving..." : "Save default hours"}
                    </button>
                </form>
            </section>

            {message && <p style={{ marginTop: 12 }}>{message}</p>}

            <div style={{ marginTop: 18, display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setMonthOffset((v) => v - 1)} style={{ padding: "8px 12px" }}>
                    ◀ Previous week
                </button>
                <button onClick={() => setMonthOffset(0)} style={{ padding: "8px 12px" }}>
                    This week
                </button>
                <button onClick={() => setMonthOffset((v) => v + 1)} style={{ padding: "8px 12px" }}>
                    Next week ▶
                </button>

                {loadingWeek && <span style={{ marginLeft: 8, color: "#555" }}>Loading…</span>}
            </div>

            <div className="gridScroll" style={{ marginTop: 12 }}>
                <section style={{ borderRadius: 12, overflow: "hidden" }}>
                    <div className="gridInner">
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "80px repeat(7, 1fr)",
                                background: "#fafafa",
                                borderBottom: "1px solid #eee",
                            }}
                        >
                            <div />
                            {weekDays.map((d) => (
                                <div
                                    key={d.iso}
                                    style={{
                                        padding: 10,
                                        textAlign: "center",
                                        fontWeight: 800,
                                        opacity: d.iso <= aucklandDate ? 0.45 : 1,
                                    }}
                                    title={d.iso <= aucklandDate ? "Past day (not editable)" : ""}
                                >
                                    {d.short}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                            {hours.map((h) => {
                                const start00 = h * 60;
                                const start30 = start00 + 30;

                                return (
                                    <div key={h} style={{ display: "contents" }}>
                                        <div style={{ padding: 10, textAlign: "right", background: "#fff", fontWeight: 800 }}>
                                            {String(h).padStart(2, "0")}
                                        </div>

                                        {weekDays.map((d) => {
                                            const past = d.iso <= aucklandDate;

                                            const busy00 = isBusy(d.iso, start00, start00 + 30);
                                            const busy30 = isBusy(d.iso, start30, start30 + 30);

                                            const block00 = findBusyBlockAt(d.iso, start00, start00 + 30);
                                            const block30 = findBusyBlockAt(d.iso, start30, start30 + 30);


                                            const hasNote00 = Boolean(block00?.note && String(block00.note).trim());
                                            const hasNote30 = Boolean(block30?.note && String(block30.note).trim());


                                            const highlight00 =
                                                hoveredCell?.date === d.iso &&
                                                (hoveredCell?.slotStart === start00 || hoveredCell?.slotStart + 30 === start00);

                                            const highlight30 =
                                                hoveredCell?.date === d.iso &&
                                                (hoveredCell?.slotStart === start30 || hoveredCell?.slotStart + 30 === start30);

                                            return (
                                                <div key={`${d.iso}-${h}`} style={{ borderLeft: "1px solid #eee", borderTop: "1px solid #eee" }}>
                                                    <div
                                                        onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                                        onMouseEnter={() => {
                                                            if (loadingWeek) return;
                                                            setHoveredCell({ date: d.iso, slotStart: start00 });
                                                            setHoverPreview({
                                                                date: d.iso,
                                                                start: start00,
                                                                end: start00 + 30,
                                                                note: block00?.note || null,
                                                            });
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredCell(null);
                                                            setHoverPreview(null);
                                                        }}
                                                        onClick={() => {
                                                            if (loadingWeek) return;
                                                            if (past) return;

                                                            const slotStart = start00;
                                                            const slotEnd = start00 + 60;
                                                            const block = findBusyBlockAt(d.iso, slotStart, slotEnd);

                                                            if (block) openEditModal({ ...block, date: d.iso });
                                                            else openCreateModal(d.iso, slotStart);
                                                        }}
                                                        style={{
                                                            height: 22,
                                                            borderBottom: "1px dashed #f0f0f0",
                                                            cursor: past ? "not-allowed" : "pointer",
                                                            background: busy00 ? "#f5f5f5" : "#fff",
                                                            opacity: past ? 0.5 : 1,
                                                            outline:
                                                                hoveredCell?.date === d.iso &&
                                                                    (hoveredCell?.slotStart === start00 || hoveredCell?.slotStart + 30 === start00)
                                                                    ? "2px solid #1f7aea"
                                                                    : "none",
                                                            outlineOffset: -2,

                                                            // important for inline text
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: "0 4px",
                                                            fontSize: 11,
                                                            color: "#444",
                                                            overflow: "hidden",
                                                            whiteSpace: "nowrap",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                        title={
                                                            past
                                                                ? "Past day"
                                                                : `${minutesToTime(start00)} - ${minutesToTime(start00 + 30)}${block00?.note ? ` | ${displayNote(block00.note)}` : ""
                                                                }`
                                                        }
                                                    >
                                                        {busy00 && block00?.note ? shortNote(block00.note) : null}
                                                    </div>

                                                    <div
                                                        onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                                                        onMouseEnter={() => {
                                                            if (loadingWeek) return;
                                                            setHoveredCell({ date: d.iso, slotStart: start30 });
                                                            setHoverPreview({
                                                                date: d.iso,
                                                                start: start30,
                                                                end: start30 + 30,
                                                                note: block30?.note || null,
                                                            });
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredCell(null);
                                                            setHoverPreview(null);
                                                        }}
                                                        onClick={() => {
                                                            if (loadingWeek) return;
                                                            if (past) return;

                                                            const slotStart = start30;
                                                            const slotEnd = start30 + 60;
                                                            const block = findBusyBlockAt(d.iso, slotStart, slotEnd);

                                                            if (block) openEditModal({ ...block, date: d.iso });
                                                            else openCreateModal(d.iso, slotStart);
                                                        }}
                                                        style={{
                                                            height: 22,
                                                            cursor: past ? "not-allowed" : "pointer",
                                                            background: busy30 ? "#f5f5f5" : "#fff",
                                                            opacity: past ? 0.5 : 1,
                                                            outline:
                                                                hoveredCell?.date === d.iso &&
                                                                    (hoveredCell?.slotStart === start30 || hoveredCell?.slotStart + 30 === start30)
                                                                    ? "2px solid #1f7aea"
                                                                    : "none",
                                                            outlineOffset: -2,

                                                            // important for inline text
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            padding: "0 4px",
                                                            fontSize: 11,
                                                            color: "#444",
                                                            overflow: "hidden",
                                                            whiteSpace: "nowrap",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                        title={
                                                            past
                                                                ? "Past day"
                                                                : `${minutesToTime(start30)} - ${minutesToTime(start30 + 60)}${block30?.note ? ` | ${displayNote(block30.note)}` : ""
                                                                }`
                                                        }
                                                    >
                                                        {busy30 && block30?.note ? shortNote(block30.note) : null}
                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>

            {/* Hover preview tooltip */}
            {
                hoverPreview && (
                    <div
                        style={{
                            position: "fixed",
                            left: hoverPos.x + 12,
                            top: hoverPos.y + 12,
                            background: "#111",
                            color: "#fff",
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            zIndex: 9999,
                            pointerEvents: "none",
                            opacity: 0.92,
                        }}
                    >
                        <div style={{ fontWeight: 700 }}>
                            {hoverPreview.date} {minutesToTime(hoverPreview.start)} - {minutesToTime(hoverPreview.end)}
                        </div>

                        {hoverPreview.note && (
                            <div style={{ marginTop: 4, maxWidth: 260 }}>
                                {displayNote(hoverPreview.note)}
                            </div>
                        )}


                    </div>
                )
            }

            {/* Modal: block time */}
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
                            style={{ background: "#fff", padding: 20, borderRadius: 12, minWidth: 360 }}
                        >
                            <h3 style={{ marginTop: 0 }}>
                                Block {selectedCell.date} | {minutesToTime(selectedCell.start)} -{" "}
                                {minutesToTime(selectedCell.start + modalDuration)}
                            </h3>

                            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: 6 }}>Start</label>
                                    <input
                                        type="time"
                                        value={modalStart}
                                        onChange={(e) => {
                                            setModalStart(e.target.value);
                                            const s = timeToMinutes(e.target.value);
                                            const eMin = timeToMinutes(modalEnd);
                                            setModalDuration(Math.max(0, eMin - s));
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: 6 }}>End</label>
                                    <input
                                        type="time"
                                        value={modalEnd}
                                        onChange={(e) => {
                                            setModalEnd(e.target.value);
                                            const s = timeToMinutes(modalStart);
                                            const eMin = timeToMinutes(e.target.value);
                                            setModalDuration(Math.max(0, eMin - s));
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const s = timeToMinutes(modalStart);
                                        setModalEnd(minutesToTime(s + 60));
                                        setModalDuration(60);
                                    }}
                                >
                                    +60m
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const s = timeToMinutes(modalStart);
                                        setModalEnd(minutesToTime(s + 120));
                                        setModalDuration(120);
                                    }}
                                >
                                    +120m
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const s = timeToMinutes(defaultStart);
                                        const e = timeToMinutes(defaultEnd);
                                        setModalStart(minutesToTime(s));
                                        setModalEnd(minutesToTime(e));
                                        setModalDuration(e - s);
                                    }}
                                >
                                    Block whole day (default hours)
                                </button>
                            </div>

                            <div style={{ marginTop: 12, padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
                                {!selectedBlock && (
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                                        <input
                                            type="checkbox"
                                            checked={isRecurring}
                                            onChange={(e) => setIsRecurring(e.target.checked)}
                                        />
                                        Repeat weekly
                                    </label>
                                )}

                                {!selectedBlock && isRecurring && (
                                    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <span style={{ color: "#555" }}>Weeks ahead:</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={52}
                                            value={repeatWeeks}
                                            onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                                            style={{ width: 90 }}
                                        />
                                        <span style={{ color: "#555" }}>(creates one block per week)</span>
                                    </div>
                                )}

                                {selectedBlock && extractSeriesId(selectedBlock.note) && (
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontWeight: 700 }}>
                                        <input
                                            type="checkbox"
                                            checked={applyToSeries}
                                            onChange={(e) => setApplyToSeries(e.target.checked)}
                                        />
                                        Apply changes to the whole series
                                    </label>
                                )}
                            </div>

                            <div style={{ marginTop: 10 }}>
                                <label style={{ display: "block", marginBottom: 6 }}>Note (optional)</label>
                                <textarea
                                    value={modalNote}
                                    onChange={(e) => setModalNote(e.target.value)}
                                    rows={3}
                                    style={{ width: "100%" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "space-between" }}>
                                <div>
                                    {selectedBlock && (
                                        <>
                                            <button onClick={deleteBusyBlock} disabled={saving} style={{ border: "1px solid #ddd" }}>
                                                Delete this block
                                            </button>

                                            {extractSeriesId(selectedBlock.note) && (
                                                <button
                                                    onClick={async () => {
                                                        const sid = extractSeriesId(selectedBlock.note);
                                                        if (!sid) return;

                                                        setSaving(true);
                                                        setMessage("");

                                                        const { error } = await supabase
                                                            .from("tutor_date_overrides")
                                                            .delete()
                                                            .eq("tutor_id", tutorId)
                                                            .eq("is_available", false)
                                                            .like("note", `%[SERIES:${sid}]%`);

                                                        if (error) {
                                                            setMessage(error.message);
                                                            setSaving(false);
                                                            return;
                                                        }

                                                        await loadBusyWeek(tutorId, weekDays);
                                                        setSaving(false);
                                                        setSelectedCell(null);
                                                        setSelectedBlock(null);
                                                        setModalNote("");
                                                        setModalDuration(60);
                                                        setApplyToSeries(false);
                                                    }}
                                                    disabled={saving}
                                                    style={{ border: "1px solid #ddd", marginLeft: 8 }}
                                                >
                                                    Delete whole series
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>


                                <div style={{ display: "flex", gap: 10 }}>
                                    <button onClick={() => { setSelectedCell(null); setSelectedBlock(null); }} disabled={saving}>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveBusyBlock}
                                        disabled={saving}
                                        style={{ background: "#1f7aea", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}
                                    >
                                        {saving ? "Saving..." : selectedBlock ? "Save changes" : "Save busy block"}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )
            }
        </main >
    );
}
