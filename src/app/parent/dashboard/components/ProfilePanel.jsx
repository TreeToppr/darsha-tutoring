"use client";

/**
 * ProfilePanel (Parent Dashboard)
 * Pure UI component:
 * - No Supabase calls inside
 * - Displays account, credits, tutors
 */
export default function ProfilePanel({
    profile,
    students,
    tutors,
    creditBalanceNzd = 0,
    creditLedgerRows = [],
}) {
    const parentName = profile?.full_name || "Parent";
    const parentEmail = profile?.email || "";

    // return (
    //     <div style={{ display: "grid", gap: 14 }}>
    //         {/* Account */}
    //         <Section title="Account">
    //             <Row label="Name" value={parentName} />
    //             {parentEmail ? <Row label="Email" value={parentEmail} /> : null}
    //             <Row label="Role" value="Parent" />
    //             <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
    //                 This dashboard shows only your students and bookings.
    //             </div>
    //         </Section>

    //         {/* Credits */}
    //         <Section title="Credits (NZD)">
    //             <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
    //                 <div>
    //                     <div style={{ fontSize: 13, color: "#666", fontWeight: 900 }}>Current balance</div>
    //                     <div style={{ fontSize: 28, fontWeight: 950, marginTop: 6 }}>
    //                         ${Number(creditBalanceNzd || 0).toFixed(2)}
    //                     </div>
    //                 </div>

    //                 <div style={{ maxWidth: 420 }}>
    //                     <div style={{ fontSize: 13, color: "#666", fontWeight: 900 }}>How credits work</div>
    //                     <div style={{ marginTop: 6, fontSize: 13, color: "#555", lineHeight: 1.4 }}>
    //                         Credits can be used for any tutor, any subject, any lesson. Expiry rules can be added later.
    //                     </div>
    //                 </div>
    //             </div>

    //             <div style={{ marginTop: 14 }}>
    //                 <div style={{ fontWeight: 900, marginBottom: 8 }}>Recent credit activity</div>

    //                 {creditLedgerRows.length === 0 ? (
    //                     <div style={{ color: "#666", fontSize: 13 }}>No credit activity yet.</div>
    //                 ) : (
    //                     <div style={{ display: "grid", gap: 8 }}>
    //                         {creditLedgerRows.map((r) => {
    //                             const delta = Number(r.delta_amount || 0);
    //                             const sign = delta >= 0 ? "+" : "-";
    //                             const abs = Math.abs(delta).toFixed(2);

    //                             return (
    //                                 <div
    //                                     key={r.id}
    //                                     style={{
    //                                         border: "1px solid #eee",
    //                                         borderRadius: 12,
    //                                         padding: 10,
    //                                         display: "flex",
    //                                         justifyContent: "space-between",
    //                                         gap: 10,
    //                                         alignItems: "center",
    //                                         flexWrap: "wrap",
    //                                     }}
    //                                 >
    //                                     <div style={{ minWidth: 220 }}>
    //                                         <div style={{ fontWeight: 900, fontSize: 13 }}>{r.reason || "Credit update"}</div>
    //                                         <div style={{ color: "#777", fontSize: 12, marginTop: 2 }}>
    //                                             {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
    //                                         </div>
    //                                     </div>

    //                                     <div
    //                                         style={{
    //                                             fontWeight: 950,
    //                                             color: delta >= 0 ? "#0a7a3a" : "#b00020",
    //                                         }}
    //                                     >
    //                                         {sign}${abs} {r.currency || "NZD"}
    //                                     </div>
    //                                 </div>
    //                             );
    //                         })}
    //                     </div>
    //                 )}
    //             </div>
    //         </Section>

    //         {/* Students (quick summary) */}
    //         <Section title="Students">
    //             {students?.length ? (
    //                 <div style={{ display: "grid", gap: 8 }}>
    //                     {students.map((s) => (
    //                         <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
    //                             <div style={{ fontWeight: 900 }}>{s.full_name || "Student"}</div>
    //                             <div style={{ marginTop: 4, color: "#666", fontSize: 13 }}>
    //                                 Year level: {s.year_level ?? "Not set"}
    //                             </div>
    //                         </div>
    //                     ))}
    //                 </div>
    //             ) : (
    //                 <div style={{ color: "#666", fontSize: 13 }}>No students yet.</div>
    //             )}
    //         </Section>

    //         {/* Tutors */}
    //         <Section title="Tutors">
    //             {tutors?.length ? (
    //                 <div style={{ display: "grid", gap: 10 }}>
    //                     {tutors.map((t) => (
    //                         <div
    //                             key={t.id}
    //                             style={{
    //                                 border: "1px solid #eee",
    //                                 borderRadius: 14,
    //                                 padding: 12,
    //                                 background: "#fff",
    //                             }}
    //                         >
    //                             <div style={{ fontWeight: 950, fontSize: 16 }}>{t.full_name || "Tutor"}</div>
    //                             <div style={{ marginTop: 6, display: "grid", gap: 4, color: "#555", fontSize: 13 }}>
    //                                 {t.email ? <div>Email: {t.email}</div> : null}
    //                                 {t.phone ? <div>Phone: {t.phone}</div> : null}

    //                                 {/* Bank details are sensitive: show minimal info only */}
    //                                 {t.bank_account_last4 ? <div>Bank: ending {t.bank_account_last4}</div> : null}
    //                             </div>
    //                         </div>
    //                     ))}
    //                 </div>
    //             ) : (
    //                 <div style={{ color: "#666", fontSize: 13 }}>No tutors available yet.</div>
    //             )}
    //         </Section>
    //     </div>
    // );
}

function Section({ title, children }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ color: "#666", fontWeight: 900, fontSize: 13 }}>{label}</div>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{value}</div>
        </div>
    );
}
