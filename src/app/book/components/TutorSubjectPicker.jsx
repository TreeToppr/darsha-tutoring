import React, { useMemo } from "react";

/**
 * TutorSubjectPicker
 * Purpose:
 * - Render two selects: Subject and Tutor.
 * - Filter subjects based on selected tutor (tutor_subjects mapping).
 *
 * Notes:
 * - This is UI-only. It does not fetch data.
 * - Parent owns state; component just calls onChange handlers.
 */
export default function TutorSubjectPicker({
    tutors = [],
    subjects = [],
    tutorSubjects = {}, // { tutorId: [subjectId,...] }

    selectedTutorId = "",
    selectedSubjectId = "",

    onChangeTutorId, // (tutorId) => void
    onChangeSubjectId, // (subjectId) => void

    labels = { subject: "Subject", tutor: "Tutor" },
}) {
    /**
     * Filter subjects to only those offered by the selected tutor.
     * If no tutor is selected, show all subjects (fallback).
     */
    const filteredSubjects = useMemo(() => {
        if (!selectedTutorId) return subjects;

        const allowed = tutorSubjects[selectedTutorId] || [];
        return subjects.filter((s) => allowed.includes(s.id));
    }, [subjects, tutorSubjects, selectedTutorId]);

    return (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>{labels.subject}</div>

                <select
                    value={selectedSubjectId}
                    onChange={(e) => onChangeSubjectId?.(e.target.value)}
                >
                    {filteredSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>{labels.tutor}</div>

                <select
                    value={selectedTutorId}
                    onChange={(e) => onChangeTutorId?.(e.target.value)}
                >
                    {tutors.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.display_name || "Tutor"}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}