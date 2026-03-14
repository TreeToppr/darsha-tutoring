"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    // const signInWithGoogle = async () => {
    //     await supabase.auth.signInWithOAuth({
    //         provider: "google",
    //         options: {
    //             redirectTo: `${window.location.origin}/auth/callback`,
    //         },
    //     });
    // };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage(error.message);
            setLoading(false);
            return;
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setMessage("Signed in, but could not load user.");
            setLoading(false);
            return;
        }

        let { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            const fallbackName =
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email ||
                "Parent";

            const fallbackPhone = user.user_metadata?.phone_number || null;

            // Default new users to parent
            const { error: insertError } = await supabase.from("profiles").insert({
                id: user.id,
                role: "parent",
                full_name: fallbackName,
                phone_number: fallbackPhone,
            });

            if (insertError) {
                setMessage(insertError.message);
                setLoading(false);
                return;
            }

            // Re-load profile after insert
            const { data: newProfile, error: newProfileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (newProfileError || !newProfile) {
                setMessage("Signed in, but could not load profile.");
                setLoading(false);
                return;
            }

            profile = newProfile;
        }

        const role = profile.role;

        if (role === "parent") router.push("/parent-dashboard");
        else if (role === "tutor") router.push("/tutor-dashboard");
        else if (role === "admin") router.push("/admin-dashboard");
        else setMessage("Signed in, but role is unknown.");

        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                // 🚀 ADD THESE BACK: This is the "Passport" that lets you see Google Events
                scopes: 'https://www.googleapis.com/auth/calendar.readonly',
                redirectTo: typeof window !== "undefined"
                    ? `${window.location.origin}/auth/callback`
                    : undefined,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent', // This forces Google to show the "Allow Calendar" checkboxes
                },
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
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 18,
                background:
                    "radial-gradient(1200px 600px at 50% 0%, #d9b9fc 0%, transparent 90%), radial-gradient(1000px 600px at 50% 100%, #9cfbbd 0%, transparent 90%), #ffffff",
            }}
        >
            <div style={{ width: "100%", maxWidth: 460 }}>
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.2 }}>Welcome back</div>
                    <div style={{ color: "#666", marginTop: 6, fontSize: 14 }}>
                        Sign in to manage bookings and students.
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

                        {/* Email/password */}
                        <form onSubmit={handleSignIn}>
                            <div style={{ display: "grid", gap: 10 }}>
                                <div>
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

                                <div>
                                    <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#222" }}>
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
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

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        width: "100%",
                                        padding: "12px 12px",
                                        borderRadius: 12,
                                        border: "1px solid #5b0b91",
                                        background: "#5b0b91",
                                        color: "#fff",
                                        cursor: loading ? "not-allowed" : "pointer",
                                        fontWeight: 900,
                                        fontSize: 14,
                                    }}
                                >
                                    {loading ? "Signing in..." : "Sign in"}
                                </button>
                            </div>
                        </form>

                        {message && (
                            <div
                                style={{
                                    marginTop: 14,
                                    padding: 12,
                                    borderRadius: 12,
                                    border: "1px solid #ffd7d7",
                                    background: "#fff5f5",
                                    color: "#8a1f1f",
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
                            New here?{" "}
                            <a href="/auth/sign-up" style={{ fontWeight: 900, color: "#600b91", textDecoration: "none" }}>
                                Create an account
                            </a>
                        </div>

                        <a href="/" style={{ fontSize: 13, color: "#555", textDecoration: "none", fontWeight: 800 }}>
                            Back to Home
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}

