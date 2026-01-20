"use client";

import Link from "next/link";

/**
 * ParentTopBar
 * - Greets the parent
 * - Primary CTA: Book a lesson
 */
export default function ParentTopBar({ firstName }) {
    return (
        <div
            className="topRow"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
        >
            <div>
                <h1 style={{ margin: 0 }}>Welcome {firstName || "back"}!</h1>
                <p style={{ margin: "6px 0 0", color: "#555" }}>Manage students and bookings.</p>
            </div>

            <div className="topActions" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Link
                    href="/book"
                    style={{
                        background: "#1f7aea",
                        color: "#fff",
                        padding: "10px 14px",
                        borderRadius: 10,
                        textDecoration: "none",
                        fontWeight: 800,
                    }}
                >
                    + Book a lesson
                </Link>
            </div>
        </div>
    );
}
