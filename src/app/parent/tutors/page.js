"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function ParentTutorsPage() {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [message, setMessage] = useState("");
    const [tutors, setTutors] = useState([]);
    const [tutorStats, setTutorStats] = useState({});
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

            if (!profile || profile.role !== "parent") {
                router.push("/auth/sign-in");
                return;
            }

            const { data: bookingsData, error: bookingsErr } = await supabase
                .from("bookings")
                .select("tutor_id, payment_status, amount_total")
                .eq("parent_id", user.id);

            if (bookingsErr) {
                setMessage(bookingsErr.message);
                setTutorStats({});
            } else {
                const stats = {};
                for (const b of bookingsData || []) {
                    const tid = b.tutor_id;
                    if (!tid) continue;

                    if (!stats[tid]) stats[tid] = { bookingsCount: 0, unpaidCount: 0, owedTotal: 0 };

                    stats[tid].bookingsCount += 1;

                    const payStatus = String(b?.payment_status || "unpaid").toLowerCase();
                    const total = Number(b?.amount_total || 0);

                    if (payStatus !== "paid") {
                        stats[tid].unpaidCount += 1;
                        if (Number.isFinite(total) && total > 0) stats[tid].owedTotal += total;
                    }
                }
                setTutorStats(stats);
            }

            const { data, error } = await supabase
                .from("tutors")
                .select("id, display_name, bio, email, phone")
                .eq("is_active", true)
                .order("display_name", { ascending: true });

            if (error) {
                setMessage(error.message);
                setTutors([]);
                setChecking(false);
                return;
            }

            setTutors(data || []);
            setChecking(false);
        };

        init();
    }, [router]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return tutors;
        return tutors.filter((t) => {
            const name = (t.display_name || "").toLowerCase();
            const bio = (t.bio || "").toLowerCase();
            return name.includes(q) || bio.includes(q);
        });
    }, [tutors, query]);

    if (checking) {
        return (
            <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
                <h1 style={{ margin: 0 }}>Tutors</h1>
                <p style={{ color: "#666" }}>Loading…</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ margin: 0 }}>Tutors</h1>
                    <p style={{ margin: "6px 0 0", color: "#666" }}>
                        Contact details and info about your tutor.
                    </p>
                </div>

                <Link
                    href="/book"
                    style={{
                        background: "#1f7aea",
                        color: "#fff",
                        padding: "10px 14px",
                        borderRadius: 10,
                        textDecoration: "none",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                    }}
                >
                    + Book a lesson
                </Link>
            </div>

            {message && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#fff7e6", border: "1px solid #ffe0a3" }}>
                    {message}
                </div>
            )}

            <div style={{ marginTop: 14 }}>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tutors by name or bio…"
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
                {filtered.map((t) => (
                    <div key={t.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fff" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                            <h3 style={{ margin: 0 }}>{t.display_name || "Tutor"}</h3>
                        </div>

                        {t.bio && (
                            <p style={{ margin: "10px 0 0", color: "#444", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                                {t.bio}
                            </p>
                        )}

                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                            {t.email && (
                                <div>
                                    <span style={{ color: "#666", fontWeight: 700 }}>Email:</span>{" "}
                                    <a href={`mailto:${t.email}`} style={{ color: "#0b3d91" }}>
                                        {t.email}
                                    </a>
                                </div>
                            )}

                            {t.phone && (
                                <div>
                                    <span style={{ color: "#666", fontWeight: 700 }}>Phone:</span>{" "}
                                    <a href={`tel:${t.phone}`} style={{ color: "#0b3d91" }}>
                                        {t.phone}
                                    </a>
                                </div>
                            )}

                            {t.phone && (
                                <div>
                                    <span style={{ color: "#666", fontWeight: 700 }}>WhatsApp:</span>{" "}
                                    <a
                                        href={`https://wa.me/${String(t.phone).replace(/[^\d]/g, "")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: "#0b3d91" }}
                                    >
                                        Message
                                    </a>
                                </div>
                            )}

                            {!t.email && !t.phone && (
                                <div style={{ color: "#777" }}>
                                    Contact details not provided yet.
                                </div>
                            )}

                            {tutorStats?.[t.id]?.bookingsCount ? (
                                <div style={{ marginTop: 10, fontSize: 14, color: "#333" }}>
                                    <div>
                                        <span style={{ color: "#666", fontWeight: 700 }}>Your bookings:</span>{" "}
                                        {tutorStats[t.id].bookingsCount}
                                    </div>

                                    {tutorStats[t.id].unpaidCount > 0 ? (
                                        <div>
                                            <span style={{ color: "#666", fontWeight: 700 }}>Unpaid:</span>{" "}
                                            {tutorStats[t.id].unpaidCount}
                                            {tutorStats[t.id].owedTotal > 0 ? (
                                                <>
                                                    {" "}·{" "}
                                                    <span style={{ fontWeight: 900 }}>${tutorStats[t.id].owedTotal.toFixed(2)}</span>{" "}
                                                    owed
                                                </>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <p style={{ marginTop: 16, color: "#777" }}>No tutors found.</p>
            )}
        </div>
    );
}
