"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
import { supabase } from "../../../lib/supabaseClient";


export default function ParentStudentsPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [students, setStudents] = useState([]);
    const [fullName, setFullName] = useState("");
    const [yearLevel, setYearLevel] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editFullName, setEditFullName] = useState("");
    const [editYearLevel, setEditYearLevel] = useState("");

    const [deletingId, setDeletingId] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);

    const loadStudents = async (userId) => {
        const { data, error } = await supabase
            .from("students")
            .select("*")
            .eq("parent_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            setMessage(error.message);
            return;
        }
        setStudents(data || []);
    };

    useEffect(() => {
        const init = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "parent") {
                router.push("/auth/sign-in");
                return;
            }

            await loadStudents(user.id);
            setChecking(false);
        };

        init();
    }, [router]);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setMessage("");
        setSaving(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.push("/auth/sign-in");
            return;
        }

        const { error } = await supabase.from("students").insert({
            parent_id: user.id,
            full_name: fullName.trim(),
            year_level: yearLevel ? Number(yearLevel) : null,
        });

        if (error) {
            setMessage(error.message);
            setSaving(false);
            return;
        }

        setFullName("");
        setYearLevel("");
        await loadStudents(user.id);
        setSaving(false);
    };

    const handleToggleCanBook = async (studentId, newValue) => {
        setMessage("");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.push("/auth/sign-in");
            return;
        }

        const { error } = await supabase
            .from("students")
            .update({ can_student_book: newValue })
            .eq("id", studentId)
            .eq("parent_id", user.id);

        if (error) {
            setMessage(error.message);
            return;
        }

        await loadStudents(user.id);
    };

    const startEditStudent = (student) => {
        setMessage("");
        setEditingId(student.id);
        setEditFullName(student.full_name || "");
        setEditYearLevel(student.year_level ? String(student.year_level) : "");
        // If they were mid-delete, cancel that
        setDeletingId(null);
        setDeleteConfirmText("");
    };

    const cancelEditStudent = () => {
        setEditingId(null);
        setEditFullName("");
        setEditYearLevel("");
    };

    const saveEditStudent = async (studentId) => {
        setMessage("");
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/auth/sign-in");
            return;
        }

        const updates = {
            full_name: editFullName.trim(),
            year_level: editYearLevel ? Number(editYearLevel) : null,
        };

        const { error } = await supabase
            .from("students")
            .update(updates)
            .eq("id", studentId)
            .eq("parent_id", user.id);

        if (error) {
            setMessage(error.message);
            setSaving(false);
            return;
        }

        await loadStudents(user.id);
        setSaving(false);
        cancelEditStudent();
    };

    const startDeleteStudent = (studentId) => {
        setMessage("");
        setDeletingId(studentId);
        setDeleteConfirmText("");
        // If they were editing, cancel that
        cancelEditStudent();
    };

    const cancelDeleteStudent = () => {
        setDeletingId(null);
        setDeleteConfirmText("");
    };

    const confirmDeleteStudent = async (studentId) => {
        setMessage("");
        setDeleting(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/auth/sign-in");
            return;
        }

        const { error } = await supabase
            .from("students")
            .delete()
            .eq("id", studentId)
            .eq("parent_id", user.id);

        if (error) {
            // If you have bookings referencing this student, Supabase may throw a FK constraint error.
            setMessage(error.message);
            setDeleting(false);
            return;
        }

        await loadStudents(user.id);
        setDeleting(false);
        cancelDeleteStudent();
    };

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 16px" }}>
            <style jsx global>{`
                /* Mobile-first tweaks for /parent/students */
                @media (max-width: 640px) {
                    .students-add-grid {
                        grid-template-columns: 1fr !important;
                    }
                        
                .students-grid {
                    grid-template-columns: 1fr !important;
                }
                        
                .student-card-header {
                    flex-direction: column !important;
                    align-items: stretch !important;
                }
                        
                .student-card-actions {
                    align-items: stretch !important;
                    width: 100% !important;
                }
                        
                .student-action-row {
                    width: 100% !important;
                    flex-direction: column !important;
                }
                        
                .student-action-row button {
                    width: 100% !important;
                }
                        
                .delete-confirm-row {
                    flex-direction: column !important;
                    align-items: stretch !important;
                }
                        
                .delete-confirm-row input,
                .delete-confirm-row button {
                    width: 100% !important;
                }
            }
            `}</style>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 28 }}>Students</h1>
                    <p style={{ margin: "6px 0 0", color: "#555" }}>
                        Add your child/children here. You’ll select a student when booking.
                    </p>
                </div>

                <a
                    href="/parent/dashboard"
                    style={{ color: "#1f7aea", textDecoration: "none", fontWeight: 700 }}
                >
                    ← Back to dashboard
                </a>
            </div>

            {message && (
                <div
                    style={{
                        marginTop: 16,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "#fff5f5",
                        border: "1px solid #ffd6d6",
                        color: "#7a1f1f",
                        fontWeight: 600,
                    }}
                >
                    {message}
                </div>
            )}

            <div
                style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 16,
                }}
            >
                {/* Add student card */}
                <section
                    style={{
                        background: "#fff",
                        border: "1px solid #eee",
                        borderRadius: 16,
                        padding: 16,
                        boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: 18 }}>Add a student</h2>
                    <p style={{ margin: "6px 0 0", color: "#555" }}>
                        Use the name the school uses (helps you stay consistent).
                    </p>

                    <form onSubmit={handleAddStudent} style={{ marginTop: 12 }}>
                        <div className="students-add-grid" style={{ display: "grid", gridTemplateColumns: "1fr 180px 170px", gap: 10 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>Full name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Alex Bing"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: "1px solid #ddd",
                                        outline: "none",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>Year level</label>
                                <input
                                    type="number"
                                    placeholder="e.g., 10"
                                    value={yearLevel}
                                    onChange={(e) => setYearLevel(e.target.value)}
                                    min="1"
                                    max="13"
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: "1px solid #ddd",
                                        outline: "none",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>&nbsp;</label>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: "none",
                                        background: saving ? "#c7d8ff" : "#1f7aea",
                                        color: "#fff",
                                        fontWeight: 800,
                                        cursor: saving ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {saving ? "Adding..." : "+ Add student"}
                                </button>
                            </div>
                        </div>
                    </form>

                    <p style={{ margin: "10px 0 0", color: "#777", fontSize: 13 }}>
                        Tip: If your student is old enough, you can allow them to book their own lessons.
                    </p>
                </section>

                {/* Students list */}
                <section
                    style={{
                        background: "#fff",
                        border: "1px solid #eee",
                        borderRadius: 16,
                        padding: 16,
                        boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <h2 style={{ margin: 0, fontSize: 18 }}>Your students</h2>
                        <div style={{ color: "#777", fontSize: 13 }}>
                            {students.length} total
                        </div>
                    </div>

                    {students.length === 0 ? (
                        <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px dashed #ddd" }}>
                            <div style={{ fontWeight: 800 }}>No students yet</div>
                            <p style={{ margin: "6px 0 0", color: "#555" }}>
                                Add your first student above, then head to the booking page.
                            </p>
                            <a href="/book" style={{ display: "inline-block", marginTop: 10, color: "#1f7aea", fontWeight: 800, textDecoration: "none" }}>
                                Go to booking →
                            </a>
                        </div>
                    ) : (
                        <div className="students-grid" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                            {students.map((s) => (
                                <div
                                    key={s.id}
                                    style={{
                                        border: "1px solid #eee",
                                        borderRadius: 14,
                                        padding: 14,
                                        background: "#fff",
                                    }}
                                >
                                    <div className="student-card-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            {editingId === s.id ? (
                                                <div style={{ display: "grid", gap: 8 }}>
                                                    <div style={{ display: "grid", gap: 6 }}>
                                                        <label style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>Full name</label>
                                                        <input
                                                            value={editFullName}
                                                            onChange={(e) => setEditFullName(e.target.value)}
                                                            style={{
                                                                width: "100%",
                                                                padding: "10px 12px",
                                                                borderRadius: 12,
                                                                border: "1px solid #ddd",
                                                                outline: "none",
                                                            }}
                                                        />
                                                    </div>

                                                    <div style={{ display: "grid", gap: 6 }}>
                                                        <label style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>Year level</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="13"
                                                            placeholder="e.g., 10"
                                                            value={editYearLevel}
                                                            onChange={(e) => setEditYearLevel(e.target.value)}
                                                            style={{
                                                                width: "100%",
                                                                padding: "10px 12px",
                                                                borderRadius: 12,
                                                                border: "1px solid #ddd",
                                                                outline: "none",
                                                            }}
                                                        />
                                                    </div>

                                                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => saveEditStudent(s.id)}
                                                            disabled={saving || !editFullName.trim()}
                                                            style={{
                                                                padding: "8px 10px",
                                                                borderRadius: 10,
                                                                border: "none",
                                                                background: saving ? "#c7d8ff" : "#1f7aea",
                                                                color: "#fff",
                                                                fontWeight: 800,
                                                                cursor: saving ? "not-allowed" : "pointer",
                                                            }}
                                                        >
                                                            {saving ? "Saving..." : "Save"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={cancelEditStudent}
                                                            style={{
                                                                padding: "8px 10px",
                                                                borderRadius: 10,
                                                                border: "1px solid #ddd",
                                                                background: "#fff",
                                                                fontWeight: 800,
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ fontWeight: 900, fontSize: 16, color: "#111" }}>
                                                        {s.full_name}
                                                    </div>

                                                    <div style={{ marginTop: 4, color: "#666", fontSize: 13 }}>
                                                        {s.year_level ? `Year ${s.year_level}` : "Year level not set"}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Right side actions */}
                                        <div className="student-card-actions" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleCanBook(s.id, !s.can_student_book)}
                                                disabled={editingId === s.id || deletingId === s.id}
                                                style={{
                                                    padding: "8px 10px",
                                                    borderRadius: 999,
                                                    border: "1px solid #ddd",
                                                    background: s.can_student_book ? "#eafff4" : "#fafafa",
                                                    color: s.can_student_book ? "#0b6b3a" : "#444",
                                                    fontWeight: 800,
                                                    cursor: editingId === s.id || deletingId === s.id ? "not-allowed" : "pointer",
                                                    whiteSpace: "nowrap",
                                                }}
                                                title="Allow this student to book lessons themselves"
                                            >
                                                {s.can_student_book ? "Can book: ON" : "Can book: OFF"}
                                            </button>

                                            <div className="student-action-row" style={{ display: "flex", gap: 8 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => startEditStudent(s)}
                                                    disabled={deletingId === s.id}
                                                    style={{
                                                        padding: "8px 10px",
                                                        borderRadius: 10,
                                                        border: "1px solid #ddd",
                                                        background: "#fff",
                                                        fontWeight: 800,
                                                        cursor: deletingId === s.id ? "not-allowed" : "pointer",
                                                    }}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => startDeleteStudent(s.id)}
                                                    disabled={editingId === s.id}
                                                    style={{
                                                        padding: "8px 10px",
                                                        borderRadius: 10,
                                                        border: "1px solid #ffd6d6",
                                                        background: "#fff5f5",
                                                        color: "#7a1f1f",
                                                        fontWeight: 900,
                                                        cursor: editingId === s.id ? "not-allowed" : "pointer",
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 10, color: "#777", fontSize: 13, lineHeight: 1.35 }}>
                                        {s.can_student_book
                                            ? "This student can book lessons (good for older teens)."
                                            : "Only you (the parent) can book lessons for this student."}
                                    </div>

                                    {/* Delete confirm panel */}
                                    {deletingId === s.id && (
                                        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #ffd6d6", background: "#fff5f5" }}>
                                            <div style={{ fontWeight: 900, color: "#7a1f1f" }}>Confirm delete</div>
                                            <div style={{ marginTop: 6, color: "#7a1f1f", fontSize: 13 }}>
                                                Type <span style={{ fontWeight: 900 }}>DELETE</span> to permanently remove this student.
                                            </div>

                                            <div className="delete-confirm-row" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                                <input
                                                    value={deleteConfirmText}
                                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                    placeholder="Type DELETE"
                                                    style={{
                                                        padding: "10px 12px",
                                                        borderRadius: 12,
                                                        border: "1px solid #ffd6d6",
                                                        outline: "none",
                                                        minWidth: 200,
                                                        flex: 1,
                                                    }}
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => confirmDeleteStudent(s.id)}
                                                    disabled={deleting || deleteConfirmText !== "DELETE"}
                                                    style={{
                                                        padding: "10px 12px",
                                                        borderRadius: 12,
                                                        border: "none",
                                                        background: deleting || deleteConfirmText !== "DELETE" ? "#f2bcbc" : "#d62525",
                                                        color: "#fff",
                                                        fontWeight: 900,
                                                        cursor: deleting || deleteConfirmText !== "DELETE" ? "not-allowed" : "pointer",
                                                    }}
                                                >
                                                    {deleting ? "Deleting..." : "Confirm delete"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={cancelDeleteStudent}
                                                    disabled={deleting}
                                                    style={{
                                                        padding: "10px 12px",
                                                        borderRadius: 12,
                                                        border: "1px solid #ddd",
                                                        background: "#fff",
                                                        fontWeight: 900,
                                                        cursor: deleting ? "not-allowed" : "pointer",
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );

}
