"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function TutorParentsPage() {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [message, setMessage] = useState("");
    const [tutorId, setTutorId] = useState(null);
    const [rows, setRows] = useState([]);
    const [query, setQuery] = useState("");

    useEffect(() => {
        const init = async () => {
            setMessage("");

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "tutor") {
                router.push("/auth/sign-in");
                return;
            }

            // Load tutor record to get tutor_id
            const { data: tutorRow, error: tutorErr } = await supabase
                .from("tutors")
                .select("id")
                .eq("profile_id", user.id)
                .single();

            if (tutorErr || !tutorRow?.id) {
                setMessage(tutorErr?.message || "Tutor record not found.");
                setChecking(false);
                return;
            }

            setTutorId(tutorRow.id);

            // Load bookings with parent + student joins (same FK name you use in tutor dashboard)
            const { data, error } = await supabase
                .from("bookings")
                .select(`
      id,
      parent_id,
      student_id,
      tutor_id,
      payment_status,
      amount_total,
      students(full_name),
      parent:profiles!bookings_parent_id_fkey(
          full_name,
          phone_number,
          email
      )
  `)
                .eq("tutor_id", tutorRow.id);

            if (error) {
                setMessage(error.message);
                setRows([]);
                setChecking(false);
                return;
            }

            setRows(data || []);
            setChecking(false);
        };

        init();
    }, [router]);

    const parents = useMemo(() => {
        // Group by parent_id
        const map = new Map();

        for (const r of rows) {
            const pid = r.parent_id;
            if (!pid) continue;

            if (!map.has(pid)) {
                map.set(pid, {
                    parent_id: pid,
                    parent_name: r.parent?.full_name || "Parent",
                    parent_email: r.parent?.email || "",
                    parent_phone: r.parent?.phone_number || "",
                    students: new Set(),
                    bookingsCount: 0,

                    unpaidCount: 0,
                    unpaidTotal: 0,
                });
            }

            const p = map.get(pid);
            p.bookingsCount += 1;

            const payStatus = String(r?.payment_status || "unpaid").toLowerCase();
            const total = Number(r?.amount_total || 0);

            if (payStatus !== "paid") {
                p.unpaidCount += 1;
                if (Number.isFinite(total) && total > 0) p.unpaidTotal += total;
            }

            const studentName = r.students?.full_name;
            if (studentName) p.students.add(studentName);
        }

        // Convert set -> array
        const arr = Array.from(map.values()).map((p) => ({
            ...p,
            students: Array.from(p.students).sort(),
        }));

        // Optional search
        const q = query.trim().toLowerCase();
        if (!q) return arr;

        return arr.filter((p) => {
            const name = (p.parent_name || "").toLowerCase();
            const phone = (p.parent_phone || "").toLowerCase();
            const students = (p.students || []).join(" ").toLowerCase();
            return name.includes(q) || phone.includes(q) || students.includes(q);
        });
    }, [rows, query]);

    if (checking) {
        return (
            <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
                <h1 style={{ margin: 0 }}>Parents</h1>
                <p style={{ color: "#666" }}>Loading…</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
            <h1 style={{ margin: 0 }}>Parents</h1>
            <p style={{ margin: "6px 0 0", color: "#666" }}>
                Parents who have booked with you.
            </p>

            {message && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#fff7e6", border: "1px solid #ffe0a3" }}>
                    {message}
                </div>
            )}

            <div style={{ marginTop: 14 }}>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search parents or students…"
                    style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        outline: "none",
                        fontSize: 14,
                    }}
                />
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {parents.map((p) => (
                    <div key={p.parent_id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
                        <h3 style={{ margin: 0 }}>{p.parent_name}</h3>

                        <div style={{ marginTop: 8, fontSize: 14, color: "#333", display: "flex", flexDirection: "column", gap: 6 }}>
                            {p.parent_email ? (
                                <div>
                                    <span style={{ color: "#666", fontWeight: 700 }}>Email:</span>{" "}
                                    <a href={`mailto:${p.parent_email}`} style={{ color: "#0b3d91" }}>
                                        {p.parent_email}
                                    </a>
                                </div>
                            ) : (
                                <div style={{ color: "#777" }}>Email not available.</div>
                            )}

                            {p.parent_phone ? (
                                <div>
                                    <span style={{ color: "#666", fontWeight: 700 }}>Phone:</span>{" "}
                                    <a href={`tel:${p.parent_phone}`} style={{ color: "#0b3d91" }}>
                                        {p.parent_phone}
                                    </a>
                                </div>
                            ) : (
                                <div style={{ color: "#777" }}>Phone not provided.</div>
                            )}

                            {p.parent_phone ? (
                                <div>
                                    <span style={{ color: "#666", fontWeight: 700 }}>WhatsApp:</span>{" "}
                                    <a
                                        href={`https://wa.me/${String(p.parent_phone).replace(/[^\d]/g, "")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: "#0b3d91" }}
                                    >
                                        Message
                                    </a>
                                </div>
                            ) : null}

                            {p.unpaidCount > 0 ? (
                                <div>
                                    <span style={{ color: "#666", fontWeight: 700 }}>Unpaid:</span>{" "}
                                    {p.unpaidCount}
                                    {p.unpaidTotal > 0 ? (
                                        <>
                                            {" "}·{" "}
                                            <span style={{ fontWeight: 900 }}>${p.unpaidTotal.toFixed(2)}</span>{" "}
                                            owed
                                        </>
                                    ) : null}
                                </div>
                            ) : null}

                            <div>
                                <span style={{ color: "#666", fontWeight: 700 }}>Students:</span>{" "}
                                {p.students.length ? p.students.join(", ") : "None recorded"}
                            </div>

                            <div>
                                <span style={{ color: "#666", fontWeight: 700 }}>Bookings:</span>{" "}
                                {p.bookingsCount}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {parents.length === 0 && (
                <p style={{ marginTop: 16, color: "#777" }}>No parents found yet.</p>
            )}
        </div>
    );
}
