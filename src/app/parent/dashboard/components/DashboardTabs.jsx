"use client";

/**
 * Parent dashboard tabs.
 * Keeps styling minimal and readable.
 */
export default function DashboardTabs({ activeTab, onChangeTab }) {
    const tabs = [
        { key: "bookings", label: "Bookings" },
        { key: "calendar", label: "Calendar" },
        { key: "profile", label: "Profile" },
    ];

    return (
        <div
            style={{
                marginTop: 18,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
            }}
        >
            {tabs.map((t) => {
                const isActive = activeTab === t.key;

                return (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => onChangeTab(t.key)}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 999,
                            border: "1px solid #ddd",
                            background: isActive ? "#111" : "#fff",
                            color: isActive ? "#fff" : "#111",
                            fontWeight: 900,
                            cursor: "pointer",
                        }}
                    >
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}
