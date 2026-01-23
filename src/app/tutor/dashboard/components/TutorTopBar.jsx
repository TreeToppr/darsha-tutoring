"use client";

import Link from "next/link";

export default function TutorTopBar({ firstName }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
                <h1 style={{ margin: 0 }}>Welcome {firstName || "back"}!</h1>
                <p style={{ margin: "6px 0 0", color: "#555" }}>Manage bookings and availability.</p>
            </div>

            {/* <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <Link
                    href="/tutor/dashboard#availability-panel"
                    style={{
                        border: "1px solid #ddd",
                        background: "#fff",
                        color: "#111",
                        padding: "10px 14px",
                        borderRadius: 10,
                        textDecoration: "none",
                        fontWeight: 800,
                    }}
                >
                    Edit availability
                </Link>

                <Link
                    href="/tutor/profile"
                    style={{
                        background: "#111",
                        color: "#fff",
                        padding: "10px 14px",
                        borderRadius: 10,
                        textDecoration: "none",
                        fontWeight: 900,
                    }}
                >
                    Profile
                </Link>
            </div> */}
        </div>
    );
}
