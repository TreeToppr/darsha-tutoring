"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    phone_number: phoneNumber.trim(),
                },
            },
        });

        if (error) {
            setMessage(error.message);
            setLoading(false);
            return;
        }

        // If email confirmations are OFF, Supabase returns a session immediately.
        if (data?.session) {
            // Optional: create profile row immediately (recommended)
            const userId = data.user?.id;

            const fallbackName =
                data.user?.user_metadata?.full_name ||
                data.user?.email ||
                fullName.trim() ||
                "Parent";

            const fallbackPhone =
                data.user?.user_metadata?.phone_number ||
                phoneNumber.trim() ||
                null;

            // Create profile if missing (safe upsert pattern)
            const { error: profileUpsertError } = await supabase
                .from("profiles")
                .upsert(
                    {
                        id: userId,
                        role: "parent",
                        full_name: fallbackName,
                        phone_number: fallbackPhone,
                    },
                    { onConflict: "id" }
                );

            if (profileUpsertError) {
                setMessage(profileUpsertError.message);
                setLoading(false);
                return;
            }

            router.push("/parent/dashboard");
            return;
        }

        // If confirmations are ON, there is no session yet. pookie
        setMessage("Account created. Please check your email to confirm, then sign in.");
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo:
                    typeof window !== "undefined"
                        ? `${window.location.origin}/auth/callback`
                        : undefined,
            },
        });

        if (error) {
            setMessage(error.message);
            setLoading(false);
        }
    };

    return (
        <main
            style={{
                minHeight: "calc(100vh - 72px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 18,
                background:
                    "radial-gradient(1200px 600px at 15% 0%, #eef5ff 0%, transparent 60%), radial-gradient(900px 500px at 90% 10%, #f5f7ff 0%, transparent 55%), #ffffff",
            }}
        >
            <div style={{ width: "100%", maxWidth: 520 }}>
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.2 }}>Create your account</div>
                    <div style={{ color: "#666", marginTop: 6, fontSize: 14 }}>
                        Takes 30 seconds. You can update details later.
                    </div>
                </div>

                <div
                    style={{
                        border: "1px solid #eee",
                        borderRadius: 16,
                        background: "#fff",
                        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
                        overflow: "hidden",
                    }}
                >
                    <div style={{ padding: 18 }}>
                        {/* Google */}
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "12px 12px",
                                borderRadius: 12,
                                border: "1px solid #e6e6e6",
                                background: "#fff",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10,
                            }}
                        >
                            <span
                                aria-hidden="true"
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 999,
                                    border: "1px solid #e6e6e6",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    fontSize: 12,
                                    color: "#444",
                                }}
                            >
                                G
                            </span>
                            {loading ? "Redirecting..." : "Continue with Google"}
                        </button>

                        {/* Divider */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                            <div style={{ height: 1, background: "#eee", flex: 1 }} />
                            <div style={{ fontSize: 12, color: "#777", fontWeight: 800 }}>OR</div>
                            <div style={{ height: 1, background: "#eee", flex: 1 }} />
                        </div>

                        <form onSubmit={handleSignUp}>
                            <div style={{ display: "grid", gap: 10 }}>
                                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                                    <div style={{ gridColumn: "1 / span 2" }}>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#222" }}>
                                            Full name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Alice Bing"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                            autoComplete="name"
                                            style={{
                                                width: "100%",
                                                padding: "12px 12px",
                                                borderRadius: 12,
                                                border: "1px solid #e6e6e6",
                                                outline: "none",
                                                fontSize: 14,
                                            }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: "1 / span 2" }}>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#222" }}>
                                            Phone number
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="e.g. 021 123 4567"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            required
                                            autoComplete="tel"
                                            style={{
                                                width: "100%",
                                                padding: "12px 12px",
                                                borderRadius: 12,
                                                border: "1px solid #e6e6e6",
                                                outline: "none",
                                                fontSize: 14,
                                            }}
                                        />
                                        <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
                                            Used for booking coordination only.
                                        </div>
                                    </div>

                                    <div style={{ gridColumn: "1 / span 2" }}>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#222" }}>
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                            style={{
                                                width: "100%",
                                                padding: "12px 12px",
                                                borderRadius: 12,
                                                border: "1px solid #e6e6e6",
                                                outline: "none",
                                                fontSize: 14,
                                            }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: "1 / span 2" }}>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#222" }}>
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Create a password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="new-password"
                                            style={{
                                                width: "100%",
                                                padding: "12px 12px",
                                                borderRadius: 12,
                                                border: "1px solid #e6e6e6",
                                                outline: "none",
                                                fontSize: 14,
                                            }}
                                        />
                                        <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
                                            Tip: use 8+ characters.
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        width: "100%",
                                        padding: "12px 12px",
                                        borderRadius: 12,
                                        border: "1px solid #0b3d91",
                                        background: "#0b3d91",
                                        color: "#fff",
                                        cursor: loading ? "not-allowed" : "pointer",
                                        fontWeight: 900,
                                        fontSize: 14,
                                    }}
                                >
                                    {loading ? "Creating..." : "Create account"}
                                </button>
                            </div>
                        </form>

                        {message && (
                            <div
                                style={{
                                    marginTop: 14,
                                    padding: 12,
                                    borderRadius: 12,
                                    border: message.toLowerCase().includes("check your email") ? "1px solid #cfe6ff" : "1px solid #ffd7d7",
                                    background: message.toLowerCase().includes("check your email") ? "#f2f8ff" : "#fff5f5",
                                    color: message.toLowerCase().includes("check your email") ? "#0b3d91" : "#8a1f1f",
                                    fontWeight: 750,
                                    fontSize: 13,
                                }}
                            >
                                {message}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            padding: 14,
                            borderTop: "1px solid #f1f1f1",
                            background: "#fafafa",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ fontSize: 13, color: "#555" }}>
                            Already have an account?{" "}
                            <a href="/auth/sign-in" style={{ fontWeight: 900, color: "#0b3d91", textDecoration: "none" }}>
                                Sign in
                            </a>
                        </div>

                        <a href="/" style={{ fontSize: 13, color: "#555", textDecoration: "none", fontWeight: 800 }}>
                            Back to Home
                        </a>
                    </div>
                </div>

                {/* Mobile: make the two-column grid collapse naturally */}
                <style>{`
                    @media (max-width: 520px) {
                        .authGridTwoCol { grid-template-columns: 1fr !important; }
                    }
                `}</style>
            </div>
        </main>
    );
}
