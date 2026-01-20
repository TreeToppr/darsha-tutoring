"use client";

import Link from "next/link";

/**
 * ParentHeroCard
 * - Big card with parent avatar and overlapping student bubbles
 * - Quick actions: edit profile, manage students
 */
export default function ParentHeroCard({ profile, students }) {
    const parentInitial = (profile?.full_name || "P").slice(0, 1).toUpperCase();

    return (
        <div
            className="profileCard"
            style={{
                marginTop: 16,
                padding: 18,
                border: "1px solid #eee",
                borderRadius: 16,
                background: "#fff",
                display: "grid",
                gap: 16,
                alignItems: "center",
            }}
        >
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {/* Avatar + student bubbles */}
                <div style={{ position: "relative", width: 110, height: 84, flex: "0 0 auto" }}>
                    {/* Parent avatar */}
                    <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: "#e9eefc" }}>
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt="Profile"
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    color: "#1f7aea",
                                    fontSize: 28,
                                }}
                            >
                                {parentInitial}
                            </div>
                        )}
                    </div>

                    {/* Student bubbles */}
                    <div
                        style={{
                            position: "absolute",
                            left: 52,
                            top: 52,
                            display: "flex",
                            alignItems: "center",
                            pointerEvents: "auto",
                        }}
                    >
                        {students.slice(0, 5).map((s, i) => (
                            <Link
                                key={s.id}
                                href="/parent/students"
                                title={s.full_name}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    background: "#f1f3f5",
                                    border: "1px solid #e6e6e6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    color: "#333",
                                    marginLeft: i === 0 ? 0 : -10,
                                    boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                                    textDecoration: "none",
                                }}
                            >
                                {(s.full_name || "S").slice(0, 1).toUpperCase()}
                            </Link>
                        ))}

                        <Link
                            href="/parent/students"
                            title="Add student"
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "#e9eefc",
                                border: "1px solid #cdd9ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                color: "#1f7aea",
                                textDecoration: "none",
                                marginLeft: students.length ? -10 : 0,
                                boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
                            }}
                        >
                            +
                        </Link>
                    </div>
                </div>

                <div style={{ minWidth: 240, alignSelf: "flex-start" }}>
                    <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                        {profile?.full_name || "Parent"}
                    </div>
                    <div style={{ marginTop: 4, color: "#888", fontSize: 13, fontWeight: 700 }}>Parent</div>
                </div>
                
                <div className="profileRight" style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                    <Link
                        href="/parent/profile"
                        style={{
                            padding: "10px 16px",
                            borderRadius: 999,
                            background: "#1f7aea",
                            color: "#fff",
                            textDecoration: "none",
                            fontWeight: 900,
                            minWidth: 170,
                            textAlign: "center",
                            boxShadow: "0 4px 14px rgba(31,122,234,0.25)",
                        }}
                    >
                        Edit profile
                    </Link>

                    <Link
                        href="/parent/students"
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
                        Manage students
                    </Link>
                </div>
            </div>

        </div>
    );
}
