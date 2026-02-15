import React from "react";

/**
 * LessonDurationChips
 * - Renders selectable duration options as chips.
 */
export default function LessonDurationChips({
    options = [], // [{ key, label, minutes, isFreeTrial }]
    selectedKey = "",
    onSelect, // (option) => void
}) {
    return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {options.map((opt) => {
                const selected = selectedKey === opt.key;

                return (
                    <button
                        key={opt.key}
                        type="button"
                        onClick={() => onSelect?.(opt)}
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
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
