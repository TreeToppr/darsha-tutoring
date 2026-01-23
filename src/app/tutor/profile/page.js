"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { logAudit } from "../../../lib/auditClient";

const TZ_OPTIONS = [
    "Pacific/Auckland",
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Europe/London",
    "Europe/Paris",
    "America/Los_Angeles",
    "America/New_York",
];

export default function TutorProfilePage() {
    const router = useRouter();

    const [checking, setChecking] = useState(true);
    const [loading, setLoading] = useState(false);

    const [message, setMessage] = useState("");
    const [tutor, setTutor] = useState(null);

    // Form state
    const [form, setForm] = useState({
        display_name: "",
        email: "",
        phone: "",
        bio: "",
        timezone: "Pacific/Auckland",
        is_active: true,
        default_window_start: "15:00",
        default_window_end: "20:00",

        // payment details (optional)
        payee_name: "",
        bank_account: "",
    });

    const initialSnapshot = useMemo(() => JSON.stringify(form), [tutor]); // snapshot after load (we reset after fetch)

    const isDirty = useMemo(() => {
        // Only meaningful after tutor is loaded
        if (!tutor) return false;
        // Compare current form against a stable snapshot captured right after load
        // We'll store the snapshot in tutor.__snapshot (below) so it doesn't keep changing.
        return JSON.stringify(form) !== tutor.__snapshot;
    }, [form, tutor]);

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

            // Load tutor row + (optional) payment details.
            // NOTE: if tutor_payment_details is 1:1, Supabase may return an array or an object depending on FK config.
            const { data, error } = await supabase
                .from("tutors")
                .select(`
          id,
          profile_id,
          display_name,
          timezone,
          is_active,
          email,
          phone,
          bio,
          bank_account_masked,
          default_window_start,
          default_window_end,
          tutor_payment_details(payee_name, bank_account)
        `)
                .eq("profile_id", user.id)
                .single();

            if (error || !data) {
                setMessage(error?.message || "Tutor record not found.");
                setChecking(false);
                return;
            }

            const payment = Array.isArray(data.tutor_payment_details)
                ? (data.tutor_payment_details[0] || null)
                : (data.tutor_payment_details || null);

            const loadedForm = {
                display_name: data.display_name || "",
                email: data.email || "",
                phone: data.phone || "",
                bio: data.bio || "",
                timezone: data.timezone || "Pacific/Auckland",
                is_active: Boolean(data.is_active),
                default_window_start: data.default_window_start ? String(data.default_window_start).slice(0, 5) : "15:00",
                default_window_end: data.default_window_end ? String(data.default_window_end).slice(0, 5) : "20:00",

                payee_name: payment?.payee_name || "",
                bank_account: payment?.bank_account || "",
            };

            // attach snapshot to tutor so dirty checking is stable
            const tutorWithSnapshot = { ...data, __snapshot: JSON.stringify(loadedForm) };

            setTutor(tutorWithSnapshot);
            setForm(loadedForm);
            setChecking(false);
        };

        init();
    }, [router]);

    const onChange = (key) => (e) => {
        const value = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [key]: value }));
    };

    const validate = () => {
        if (!form.display_name.trim()) return "Display name is required.";
        if (form.default_window_start && form.default_window_end) {
            const s = toMinutes(form.default_window_start);
            const e = toMinutes(form.default_window_end);
            if (Number.isFinite(s) && Number.isFinite(e) && s >= e) return "Default window end time must be after start time.";
        }
        return "";
    };

    const save = async () => {
        if (!tutor?.id) return;
        setMessage("");

        const err = validate();
        if (err) {
            setMessage(err);
            return;
        }

        setLoading(true);

        try {
            // 1) Update tutor profile fields
            const { error: upErr } = await supabase
                .from("tutors")
                .update({
                    display_name: form.display_name.trim(),
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    bio: form.bio || null,
                    timezone: form.timezone || null,
                    is_active: Boolean(form.is_active),
                    default_window_start: form.default_window_start || null,
                    default_window_end: form.default_window_end || null,
                })
                .eq("id", tutor.id);

            if (upErr) throw upErr;

            // 2) Optional: upsert payment details (unmasked)
            // This assumes tutor_payment_details has a unique row per tutor_id.
            // If your FK column is not tutor_id, change it here.
            const hasAnyPayment = Boolean(form.payee_name.trim() || form.bank_account.trim());
            if (hasAnyPayment) {
                const { error: payErr } = await supabase
                    .from("tutor_payment_details")
                    .upsert(
                        {
                            tutor_id: tutor.id,
                            payee_name: form.payee_name.trim() || null,
                            bank_account: form.bank_account.trim() || null,
                        },
                        { onConflict: "tutor_id" }
                    );

                if (payErr) throw payErr;
            }

            if (hasAnyPayment) {
                const masked = maskBankAccount(form.bank_account);

                const { error: maskErr } = await supabase
                    .from("tutors")
                    .update({ bank_account_masked: masked })
                    .eq("id", tutor.id);

                if (maskErr) throw maskErr;
            }

            await logAudit({
                action: "tutor.profile_updated",
                entityType: "tutor",
                entityId: tutor.id,
                metadata: {
                    fields: ["display_name", "email", "phone", "bio", "timezone", "is_active", "default_window_start", "default_window_end", "payment_details"],
                },
            });

            // Reload the tutor row so masked bank value updates if you have triggers
            const { data: refreshed } = await supabase
                .from("tutors")
                .select(`
                    id,
                    profile_id,
                    display_name,
                    timezone,
                    is_active,
                    email,
                    phone,
                    bio,
                    bank_account_masked,
                    default_window_start,
                    default_window_end,
                    tutor_payment_details(payee_name, bank_account)
                `)
                .eq("id", tutor.id)
                .single();

            const payment = Array.isArray(refreshed?.tutor_payment_details)
                ? (refreshed.tutor_payment_details[0] || null)
                : (refreshed?.tutor_payment_details || null);

            const loadedForm = {
                display_name: refreshed?.display_name || "",
                email: refreshed?.email || "",
                phone: refreshed?.phone || "",
                bio: refreshed?.bio || "",
                timezone: refreshed?.timezone || "Pacific/Auckland",
                is_active: Boolean(refreshed?.is_active),
                default_window_start: refreshed?.default_window_start ? String(refreshed.default_window_start).slice(0, 5) : "15:00",
                default_window_end: refreshed?.default_window_end ? String(refreshed.default_window_end).slice(0, 5) : "20:00",
                payee_name: payment?.payee_name || "",
                bank_account: payment?.bank_account || "",
            };

            setTutor({ ...refreshed, __snapshot: JSON.stringify(loadedForm) });
            setForm(loadedForm);

            setMessage("Saved.");
        } catch (e) {
            setMessage(e?.message || "Could not save profile.");
        } finally {
            setLoading(false);
        }
    };

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
            <div style={{ maxWidth: 860, margin: "0 auto" }}>
                <TopRow
                    title="Tutor profile"
                    subtitle="Update the details parents see, and your payment info."
                    right={
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <Link href="/tutor/dashboard" style={linkPill("#fff", "#111", "1px solid #ddd")}>Back</Link>
                            <button
                                type="button"
                                onClick={save}
                                disabled={!isDirty || loading}
                                style={{
                                    ...linkPill("#111", "#fff", "none"),
                                    opacity: !isDirty || loading ? 0.55 : 1,
                                    cursor: !isDirty || loading ? "not-allowed" : "pointer",
                                }}
                            >
                                {loading ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    }
                />

                {message ? (
                    <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#fff7e6", border: "1px solid #ffe0a3" }}>
                        {message}
                    </div>
                ) : null}

                {/* Hero card */}
                <div style={{ marginTop: 14, background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                        <AvatarLetter name={form.display_name || "Tutor"} />

                        <div style={{ minWidth: 220 }}>
                            <div style={{ fontSize: 22, fontWeight: 950 }}>{form.display_name || "Tutor"}</div>
                            <div style={{ marginTop: 4, color: "#666", fontWeight: 800, fontSize: 13 }}>
                                {form.timezone ? `Timezone: ${form.timezone}` : "Timezone not set"}
                                {form.is_active ? "" : " · inactive"}
                            </div>
                        </div>

                        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {/* <Link href="/tutor/availability" style={linkPill("#fff", "#111", "1px solid #ddd")}>
                                Availability
                            </Link> */}
                            <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #eee", background: "#fafafa", fontWeight: 900 }}>
                                Bank: {formatBankMask(tutor?.bank_account_masked)}
                            </div>

                        </div>
                    </div>
                </div>

                {/* Form grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                    <Card title="Public details">
                        <Field label="Display name" required>
                            <input value={form.display_name} onChange={onChange("display_name")} placeholder="e.g. Tim" style={inputStyle} />
                        </Field>

                        <Field label="Bio">
                            <textarea value={form.bio} onChange={onChange("bio")} placeholder="A short bio parents will see" style={textareaStyle} rows={6} />
                        </Field>

                        <Field label="Active">
                            <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                                <input type="checkbox" checked={form.is_active} onChange={onChange("is_active")} />
                                <span style={{ fontWeight: 800, color: "#333" }}>Available for bookings</span>
                            </label>
                        </Field>
                    </Card>

                    <Card title="Contact + defaults">
                        <Field label="Email">
                            <input value={form.email} onChange={onChange("email")} placeholder="e.g. tim@email.com" style={inputStyle} />
                        </Field>

                        <Field label="Phone">
                            <input value={form.phone} onChange={onChange("phone")} placeholder="e.g. 021..." style={inputStyle} />
                        </Field>

                        <Field label="Timezone">
                            <select value={form.timezone} onChange={onChange("timezone")} style={inputStyle}>
                                {TZ_OPTIONS.map((tz) => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </Field>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <Field label="Default window start">
                                <input type="time" value={form.default_window_start} onChange={onChange("default_window_start")} style={inputStyle} />
                            </Field>
                            <Field label="Default window end">
                                <input type="time" value={form.default_window_end} onChange={onChange("default_window_end")} style={inputStyle} />
                            </Field>
                        </div>
                    </Card>
                </div>

                {/* Payment details */}
                <div style={{ marginTop: 14 }}>
                    <Card title="Payment details (private)">
                        <div style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
                            These are not shown to parents. Your masked bank reference is shown where needed.
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <Field label="Payee name">
                                <input value={form.payee_name} onChange={onChange("payee_name")} placeholder="e.g. Tim Smith" style={inputStyle} />
                            </Field>

                            <Field label="Bank account">
                                <input value={form.bank_account} onChange={onChange("bank_account")} placeholder="e.g. 12-1234-1234567-00" style={inputStyle} />
                            </Field>
                        </div>
                    </Card>
                </div>

                {/* Mobile save bar */}
                <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                    <button
                        type="button"
                        onClick={save}
                        disabled={!isDirty || loading}
                        style={{
                            padding: "12px 14px",
                            borderRadius: 12,
                            border: "none",
                            background: "#111",
                            color: "#fff",
                            fontWeight: 950,
                            opacity: !isDirty || loading ? 0.55 : 1,
                            cursor: !isDirty || loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TopRow({ title, subtitle, right }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
                <h1 style={{ margin: 0 }}>{title}</h1>
                <p style={{ margin: "6px 0 0", color: "#555" }}>{subtitle}</p>
            </div>
            {right}
        </div>
    );
}

function Card({ title, children }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 950, marginBottom: 12 }}>{title}</div>
            {children}
        </div>
    );
}

function Field({ label, required, children }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <div style={{ color: "#666", fontWeight: 900, fontSize: 13 }}>{label}</div>
                {required ? <div style={{ color: "#c62828", fontWeight: 900, fontSize: 12 }}>*</div> : null}
            </div>
            <div style={{ marginTop: 6 }}>{children}</div>
        </div>
    );
}

function AvatarLetter({ name }) {
    const initial = String(name || "T").trim().slice(0, 1).toUpperCase();
    return (
        <div style={{ width: 54, height: 54, borderRadius: "50%", overflow: "hidden", background: "#f3f4f6", border: "1px solid #eee" }}>
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 950, color: "#111" }}>
                {initial}
            </div>
        </div>
    );
}

function toMinutes(hhmm) {
    const s = String(hhmm || "");
    if (s.length < 4) return NaN;
    const hh = Number(s.slice(0, 2));
    const mm = Number(s.slice(3, 5));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
    return hh * 60 + mm;
}

function linkPill(bg, colour, border) {
    return {
        background: bg,
        color: colour,
        border,
        padding: "10px 14px",
        borderRadius: 12,
        textDecoration: "none",
        fontWeight: 900,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    };
}

const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    outline: "none",
    fontWeight: 800,
    background: "#fff",
};

const textareaStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    outline: "none",
    fontWeight: 700,
    background: "#fff",
    resize: "vertical",
};

function maskBankAccount(input) {
    const s = String(input || "");
    if (!s.trim()) return null;

    // mask all digits except last 4, preserve separators (hyphens/spaces)
    const digits = s.replace(/\D/g, "");
    const last4 = digits.slice(-4);

    let seenDigits = 0;
    let masked = "";

    for (const ch of s) {
        if (/\d/.test(ch)) {
            seenDigits += 1;
            // if this digit is part of the last 4 digits, keep it
            const digitsLeft = digits.length - seenDigits;
            masked += digitsLeft < 4 ? ch : "0";
        } else {
            masked += ch;
        }
    }

    // If user entered only digits (no separators), masked will be all zeros except last 4.
    // That’s acceptable for display.
    return masked;
}

function formatBankMask(masked) {
    const s = String(masked || "");
    if (!s) return "Not set";
    return `****${s.slice(-4)}`;
}
