"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ParentStudentsPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [students, setStudents] = useState([]);
    const [fullName, setFullName] = useState("");
    const [yearLevel, setYearLevel] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);

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

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
            <h1>Students</h1>

            <form onSubmit={handleAddStudent} style={{ margin: "16px 0 24px" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                        type="text"
                        placeholder="Student full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Year level (optional)"
                        value={yearLevel}
                        onChange={(e) => setYearLevel(e.target.value)}
                        min="1"
                        max="13"
                    />
                    <button type="submit" disabled={saving}>
                        {saving ? "Adding..." : "Add student"}
                    </button>
                </div>
            </form>

            {message && <p>{message}</p>}

            <h2 style={{ marginTop: 24 }}>Your students</h2>

            {students.length === 0 ? (
                <p>No students yet.</p>
            ) : (
                <ul style={{ paddingLeft: 18 }}>
                    {students.map((s) => (
                        <li key={s.id} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <strong>
                                    {s.full_name}
                                    {s.year_level ? ` (Year ${s.year_level})` : ""}
                                </strong>

                                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <input
                                        type="checkbox"
                                        checked={!!s.can_student_book}
                                        onChange={(e) => handleToggleCanBook(s.id, e.target.checked)}
                                    />
                                    Student can book
                                </label>
                            </div>
                        </li>
                    ))}
                </ul>

            )}
        </main>
    );
}
