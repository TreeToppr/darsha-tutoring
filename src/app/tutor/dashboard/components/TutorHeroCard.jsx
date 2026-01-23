"use client";

import Link from "next/link";

export default function TutorHeroCard({ tutor, stats }) {
    const initial = (tutor?.display_name || "T").slice(0, 1).toUpperCase();

    const defaultHours =
        tutor?.default_window_start && tutor?.default_window_end
            ? `${String(tutor.default_window_start).slice(0, 5)} - ${String(tutor.default_window_end).slice(0, 5)}`
            : "Not set";

    return (
        <div
            style={{
                marginTop: 16,
                padding: 18,
                border: "1px solid #eee",
                borderRadius: 16,
                background: "#fff",
                display: "grid",
                gap: 16,
            }}
        >
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {/* Avatar */}
                <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: "#f5f5f5" }}>
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            color: "#111",
                            fontSize: 28,
                        }}
                    >
                        {initial}
                    </div>
                </div>

                {/* Name + role */}
                <div style={{ minWidth: 240 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                        {tutor?.display_name || "Tutor"}
                    </div>
                    <div style={{ marginTop: 4, color: "#888", fontSize: 13, fontWeight: 700 }}>Tutor</div>
                    <div style={{ marginTop: 10, color: "#555", fontSize: 13 }}>
                        Hours: <span style={{ fontWeight: 900, color: "#111" }}>{defaultHours}</span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginLeft: "auto" }}>
                    <Link
                        href="/tutor/profile"
                        style={{
                            padding: "10px 16px",
                            borderRadius: 999,
                            background: "#111",
                            color: "#fff",
                            textDecoration: "none",
                            fontWeight: 900,
                            minWidth: 170,
                            textAlign: "center",
                        }}
                    >
                        Edit profile
                    </Link>

                    {/* <Link
                        href="/tutor/dashboard#availability"
                        style={{
                            padding: "10px 16px",
                            borderRadius: 999,
                            border: "1px solid #ddd",
                            background: "#fff",
                            color: "#111",
                            fontWeight: 800,
                            minWidth: 170,
                            textAlign: "center",
                            textDecoration: "none",
                        }}
                    >
                        Manage availability
                    </Link> */}
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                <StatCard label="Upcoming" value={stats?.upcoming ?? 0} />
                <StatCard label="Requests" value={stats?.requested ?? 0} />
                <StatCard label="Unpaid" value={stats?.unpaid ?? 0} />
                <StatCard label="This week" value={stats?.thisWeek ?? 0} />
            </div>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fff" }}>
            <div style={{ color: "#666", fontWeight: 900, fontSize: 13 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 950, marginTop: 6 }}>{value}</div>
        </div>
    );
}
