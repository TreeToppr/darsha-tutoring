import React from "react";

/**
 * TutorCards
 * Purpose:
 * - Render tutors as clickable cards (instead of a dropdown).
 * - Supports filtering upstream (parent passes tutorsToShow).
 *
 * Notes:
 * - Presentational only. No Supabase calls.
 */
export default function TutorCards({
    tutorsToShow = [],
    selectedTutorId = "",
    onSelectTutor, // (tutorId) => void
}) {
    if (!tutorsToShow.length) {
        return (
            <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12, background: "#fafafa" }}>
                No tutors found for that subject.
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: 10 }}>
            {tutorsToShow.map((t) => {
                const selected = selectedTutorId === t.id;

                return (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelectTutor?.(t.id)}
                        aria-pressed={selected}
                        style={{
                            textAlign: "left",
                            padding: 14,
                            borderRadius: 14,
                            border: selected ? "2px solid #1f7aea" : "1px solid #ddd",
                            background: selected ? "#f3f7ff" : "#fff",
                            cursor: "pointer",
                        }}
                    >
                        <div style={{ fontWeight: 950, fontSize: 16 }}>
                            {t.display_name || "Tutor"}
                        </div>

                        {(t.bio || t.phone || t.email) ? (
                            <div style={{ marginTop: 6, color: "#555", fontWeight: 650, fontSize: 13 }}>
                                {t.bio ? <div>{t.bio}</div> : null}
                                <div style={{ marginTop: t.bio ? 6 : 0, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    {t.email ? <span>{t.email}</span> : null}
                                    {t.phone ? <span>{t.phone}</span> : null}
                                </div>
                            </div>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
