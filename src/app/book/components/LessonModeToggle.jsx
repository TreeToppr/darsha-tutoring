import React from "react";

/**
 * LessonModeToggle
 * Purpose:
 * - Let the parent choose lesson mode: online vs in-person.
 * - If in-person, capture address and optionally show pricing controls/results.
 *
 * Notes:
 * - This component is UI only. It does not call Supabase.
 * - Parent owns state; we just call the provided handlers.
 * - Business rule: changing address should reset pricing quote (handled by parent via onAddressChange).
 */
export default function LessonModeToggle({
    lessonMode,
    onChangeMode, // (mode) => void
    setLessonMode, // (mode) => void - backwards compatible alias

    // Address (only used for in-person)
    bookingAddress,
    onAddressChange, // (newAddress) => void

    // Pricing / travel calculation UI
    pricingLoading = false,
    pricingError = "",
    priceQuote = null, // { base, travel, total } or null
    driveMinutes = null, // number or null
    onCalculatePrice, // () => void

    // Optional: show the detailed "Estimated price" box
    showPriceBreakdown = true,
}) {
    const isInPerson = lessonMode === "in_person";

    const changeMode = (mode) => {
        // Prefer onChangeMode, fallback to setLessonMode
        (onChangeMode || setLessonMode)?.(mode);
    };

    return (
        <>
            <div style={{ marginTop: 8 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
                    Lesson type
                </label>

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="radio"
                            name="lessonMode"
                            value="online"
                            checked={lessonMode === "online"}
                            onChange={() => changeMode("online")}
                        />
                        Online
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="radio"
                            name="lessonMode"
                            value="in_person"
                            checked={isInPerson}
                            onChange={() => changeMode("in_person")}
                        />
                        In person
                    </label>
                </div>
            </div>

            {isInPerson ? (
                <div style={{ marginTop: 10 }}>
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
                        Address
                    </label>

                    <input
                        value={bookingAddress}
                        onChange={(e) => onAddressChange?.(e.target.value)}
                        placeholder="Enter your address for an in-person lesson"
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                        }}
                    />

                    <div
                        style={{
                            marginTop: 10,
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => onCalculatePrice?.(bookingAddress)}
                            disabled={pricingLoading}
                            style={{
                                border: "1px solid #ddd",
                                background: "#fff",
                                borderRadius: 10,
                                padding: "10px 12px",
                                cursor: pricingLoading ? "wait" : "pointer",
                                fontWeight: 900,
                            }}
                        >
                            {pricingLoading ? "Calculating..." : "Calculate price"}
                        </button>

                        {priceQuote ? (
                            <div style={{ fontSize: 13, color: "#333" }}>
                                Price:&nbsp;
                                <strong>${priceQuote.base}</strong>
                                &nbsp;(base)&nbsp;+&nbsp;
                                <strong>${priceQuote.travel}</strong>
                                &nbsp;(travel{typeof driveMinutes === "number" ? `, ${driveMinutes} mins` : ""})&nbsp;=&nbsp;
                                <strong>${priceQuote.total}</strong>
                            </div>
                        ) : null}
                    </div>

                    {pricingError ? (
                        <div style={{ marginTop: 8, color: "#b00020", fontWeight: 800 }}>
                            {pricingError}
                        </div>
                    ) : null}

                    {showPriceBreakdown && priceQuote ? (
                        <div
                            style={{
                                marginTop: 10,
                                border: "1px solid #eee",
                                borderRadius: 12,
                                padding: 12,
                                background: "#fafafa",
                            }}
                        >
                            <div style={{ fontWeight: 900, marginBottom: 6 }}>
                                Estimated price (UNPAID)
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "140px 1fr",
                                    rowGap: 6,
                                    columnGap: 10,
                                    fontSize: 14,
                                }}
                            >
                                <div style={{ color: "#666", fontWeight: 800 }}>Base lesson</div>
                                <div style={{ fontWeight: 900 }}>${priceQuote.base}</div>

                                <div style={{ color: "#666", fontWeight: 800 }}>Travel fee</div>
                                <div style={{ fontWeight: 900 }}>${priceQuote.travel}</div>

                                <div style={{ color: "#666", fontWeight: 800 }}>Total</div>
                                <div style={{ fontWeight: 900 }}>${priceQuote.total}</div>
                            </div>
                        </div>
                    ) : null}

                    <p style={{ margin: "8px 0 0", color: "#555", fontSize: 13 }}>
                        This will be saved to your profile after booking.
                    </p>
                </div>
            ) : null}
        </>
    );
}
