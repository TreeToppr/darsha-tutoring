import React from "react";

/**
 * SubjectChips
 * Purpose:
 * - Render selectable "chips" for subjects.
 * - Keeps UI consistent with StudentChips.
 *
 * Notes:
 * - Presentational only. No Supabase calls.
 */
export default function SubjectChips({
    subjects = [],
    selectedSubjectId = "",
    onSelectSubject, // (subjectId) => void
}) {
    return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {subjects.map((s) => {
                const selected = selectedSubjectId === s.id;

                return (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectSubject?.(s.id)}
                        aria-pressed={selected}
                        style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: selected ? "2px solid #1f7aea" : "1px solid #ddd",
                            background: selected ? "#f3f7ff" : "#fff",
                            cursor: "pointer",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {s.name}
                    </button>
                );
            })}
        </div>
    );
}
