"use client";

import React, { useEffect, useState } from "react";

/**
 * ProgressBarOverlay
 * - Blocks interaction while async work happens.
 * - Shows a top progress bar that advances over time (pseudo-progress).
 */
export default function ProgressBarOverlay({ active = false, label = "Loading…" }) {
    const [pct, setPct] = useState(0);

    useEffect(() => {
        if (!active) {
            setPct(0);
            return;
        }

        setPct(12);

        const id = setInterval(() => {
            setPct((p) => {
                if (p >= 92) return p;
                const step = p < 60 ? 6 : p < 80 ? 3 : 1;
                return Math.min(92, p + step);
            });
        }, 450);

        return () => clearInterval(id);
    }, [active]);

    if (!active) return null;

    return (
        <div
            aria-live="polite"
            aria-busy="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(2px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 14,
            }}
        >
            <div style={{ width: "min(920px, 96vw)" }}>
                <div
                    style={{
                        height: 8,
                        background: "#e5e7eb",
                        borderRadius: 999,
                        overflow: "hidden",
                        boxShadow: "0 1px 0 rgba(0,0,0,0.05) inset",
                    }}
                >
                    <div
                        style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: "#1f7aea",
                            borderRadius: 999,
                            transition: "width 220ms ease",
                        }}
                    />
                </div>

                <div
                    style={{
                        marginTop: 8,
                        fontWeight: 850,
                        color: "#111",
                        display: "flex",
                        justifyContent: "space-between",
                    }}
                >
                    <span>{label}</span>
                    <span style={{ opacity: 0.75 }}>{pct}%</span>
                </div>
            </div>
        </div>
    );
}
