import React from "react";

/**
 * StudentChips
 * Purpose:
 * - Render selectable student "chips" (buttons) with initials + name + year level.
 * - Provide an optional "Add student" link at the end.
 *
 * Notes:
 * - This is a presentational component. It does NOT fetch data.
 * - Parent controls selection state and what happens on selection.
 */
export default function StudentChips({
    students = [],
    selectedStudentId = "",
    onSelectStudent, // (studentId) => void
    addStudentHref = "/parent/students",
    showYearLevel = true,
    addStudentLabel = "+ Add student",
}) {
    /**
     * Derive initials for the circular badge.
     * We keep this here because it's purely UI formatting.
     */
    const getInitials = (fullName) => {
        return (
            String(fullName || "")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => (p[0] || "").toUpperCase())
                .join("") || "?"
        );
    };

    return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {students.map((s) => {
                const selected = selectedStudentId === s.id;
                const initials = getInitials(s.full_name);

                return (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectStudent?.(s.id)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: selected ? "2px solid #1f7aea" : "1px solid #ddd",
                            background: selected ? "#f3f7ff" : "#fff",
                            cursor: "pointer",
                            fontWeight: 900,
                        }}
                        aria-pressed={selected}
                    >
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 999,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: selected ? "#1f7aea" : "#e9eefc",
                                color: selected ? "#fff" : "#1f7aea",
                                fontWeight: 900,
                                fontSize: 13,
                                flex: "0 0 auto",
                            }}
                        >
                            {initials}
                        </div>

                        <div style={{ textAlign: "left" }}>
                            <div style={{ lineHeight: 1.1 }}>{s.full_name}</div>

                            {showYearLevel && typeof s.year_level !== "undefined" && s.year_level !== null && (
                                <div style={{ marginTop: 4, fontSize: 12, color: "#666", fontWeight: 800 }}>
                                    Year {s.year_level}
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}

            {/* Optional “Add student” shortcut */}
            {addStudentHref ? (
                <a
                    href={addStudentHref}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px dashed #bbb",
                        background: "#fff",
                        color: "#1f7aea",
                        fontWeight: 900,
                        textDecoration: "none",
                    }}
                >
                    {addStudentLabel}
                </a>
            ) : null}
        </div>
    );
}