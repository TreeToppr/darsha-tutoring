"use client";

/**
 * Profile tab panel.
 * Shows a quick summary and links, without duplicating the /parent/profile page.
 */
export default function ProfilePanel({ profile, students, tutors }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Profile</div>
            <div style={{ marginTop: 8, color: "#555" }}>
                <div><strong>Name:</strong> {profile?.full_name || "Parent"}</div>
                <div style={{ marginTop: 6 }}><strong>Role:</strong> {profile?.role || "parent"}</div>
                <div style={{ marginTop: 6 }}><strong>Students:</strong> {students?.length || 0}</div>
                <div style={{ marginTop: 6 }}><strong>Active tutors:</strong> {tutors?.length || 0}</div>
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
                <div style={{ fontWeight: 900 }}>Tip</div>
                <div style={{ marginTop: 6, color: "#666", fontSize: 13 }}>
                    Use “Bookings” to manage your lessons, and “Calendar” to see the week at a glance.
                </div>
            </div>
        </div>
    );
}
