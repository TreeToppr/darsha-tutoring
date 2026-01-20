"use client";

/**
 * QuickStats
 * - Small summary cards under the top bar
 * - Keeps numbers obvious at a glance
 */
export default function QuickStats({ studentsCount, upcomingCount, requestedCount, unpaidCount }) {
    return (
        <div
            style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
            }}
        >
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ color: "#666", fontWeight: 800, fontSize: 12 }}>Students</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{studentsCount}</div>
                <div style={{ color: "#777", fontSize: 12, marginTop: 2 }}>Manage them anytime</div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ color: "#666", fontWeight: 800, fontSize: 12 }}>Upcoming</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{upcomingCount}</div>
                <div style={{ color: "#777", fontSize: 12, marginTop: 2 }}>
                    {requestedCount ? `${requestedCount} lessons awaiting approval` : "All up to date"}
                </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ color: "#666", fontWeight: 800, fontSize: 12 }}>Unpaid</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{unpaidCount}</div>
                <div style={{ color: "#777", fontSize: 12, marginTop: 2 }}>For upcoming lessons</div>
            </div>
        </div>
    );
}
