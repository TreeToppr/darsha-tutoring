import React from "react";
import StudentChips from "./StudentChips";
import LessonModeToggle from "./LessonModeToggle";

/**
 * BookingModal
 * Purpose:
 * - Present booking configuration UI (student, duration, lesson mode, notes, recurring, term).
 * - Delegate all state + actions to the parent page (BookPage).
 *
 * Important:
 * - This component does NOT fetch anything.
 * - It does NOT call Supabase.
 * - It does NOT decide business rules beyond basic UI guardrails.
 */

function dateFromYMDLocal(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d); // local timezone, no UTC shift
}

export default function BookingModal({
    open,
    selectedCell, // { date, start } or null
    formatISO,
    minutesToTime,

    // Student selection
    students,
    selectedStudentId,
    onSelectStudent,

    // Duration + notes
    modalDuration,
    setModalDuration,
    modalNotes,
    setModalNotes,

    // Lesson mode + in-person pricing
    lessonMode,
    setLessonMode,
    bookingAddress,
    setBookingAddress,
    pricingLoading,
    pricingError,
    priceQuote,
    driveMinutes,
    onCalculatePrice,

    // Recurring + term
    isRecurring,
    setIsRecurring,
    terms,
    selectedTermId,
    setSelectedTermId,

    // Actions / closing
    onClose,
    onConfirm, // async () => void
}) {
    if (!open || !selectedCell) return null;

    return (
        <div
            style={{
                position: "fixed",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.35)",
                zIndex: 9999,
            }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Booking modal"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#fff",
                    padding: 20,
                    borderRadius: 8,
                    minWidth: 340,
                    maxWidth: 520,
                    width: "100%",
                }}
            >
                <h3 style={{ marginTop: 0 }}>
                    Book {formatISO(selectedCell.date)} | {minutesToTime(selectedCell.start)} -{" "}
                    {minutesToTime(selectedCell.start + modalDuration)}
                </h3>

                {/* Student selector */}
                <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Student</div>

                    <StudentChips
                        students={students}
                        selectedStudentId={selectedStudentId}
                        onSelectStudent={onSelectStudent}
                        addStudentHref="/parent/students"
                    />
                </div>

                {/* Duration */}
                <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", marginBottom: 6 }}>Duration</label>
                    <select
                        value={modalDuration}
                        onChange={(e) => setModalDuration(Number(e.target.value))}
                    >
                        <option value={60}>60 minutes</option>
                        <option value={120}>120 minutes</option>
                    </select>
                </div>

                {/* Lesson mode + address + pricing */}
                <LessonModeToggle
                    lessonMode={lessonMode}
                    onChangeMode={(mode) => {
                        setLessonMode(mode);
                    }}
                    bookingAddress={bookingAddress}
                    onAddressChange={(value) => {
                        setBookingAddress(value);
                    }}
                    pricingLoading={pricingLoading}
                    pricingError={pricingError}
                    priceQuote={priceQuote}
                    driveMinutes={driveMinutes}
                    onCalculatePrice={onCalculatePrice}
                />

                {/* Notes */}
                <div style={{ marginTop: 10 }}>
                    <label style={{ display: "block", marginBottom: 6 }}>Notes (optional)</label>
                    <textarea
                        value={modalNotes}
                        onChange={(e) => setModalNotes(e.target.value)}
                        rows={3}
                        style={{ width: "100%" }}
                    />
                </div>

                {/* Recurring */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                        />
                        Recurring weekly (for a term)
                    </label>

                    {isRecurring && (
                        <div style={{ marginTop: 10 }}>
                            <label style={{ display: "block", marginBottom: 6 }}>Term</label>

                            <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
                                {terms.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.year} - {t.name} ({t.start_date} to {t.end_date})
                                    </option>
                                ))}
                            </select>

                            <p style={{ marginTop: 8, color: "#555" }}>
                                Recurring will skip public holidays automatically. You can add extra holiday lessons manually.
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 12,
                        justifyContent: "flex-end",
                    }}
                >
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        style={{
                            background: "#1f7aea",
                            color: "#fff",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: 6,
                        }}
                    >
                        Confirm booking
                    </button>
                </div>
            </div>
        </div>
    );
}