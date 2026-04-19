"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignInPage() {
    // View State: 'choose', 'student', or 'parent'
    const [view, setView] = useState("choose");

    // Parent States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Student States
    const [studentCode, setStudentCode] = useState("");
    const [studentPin, setStudentPin] = useState("");

    // Shared States
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    // ==========================================
    // PARENT / TUTOR LOGIC
    // ==========================================
    const routeUserToDashboard = async (userId) => {
        try {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .single();

            if (profile?.role === 'admin') {
                router.push("/admin-dashboard");
                return;
            } else if (profile?.role === 'tutor') {
                router.push("/tutor-dashboard");
                return;
            }
            router.push("/parent-dashboard");
        } catch (error) {
            console.error("Routing error:", error);
            router.push("/parent-dashboard");
        }
    };

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_IN" && session?.user) {
                await routeUserToDashboard(session.user.id);
            }
        });
        return () => authListener.subscription.unsubscribe();
    }, []);

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setMessage(error.message);
            setLoading(false);
            return;
        }

        if (data?.user) {
            const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).single();

            if (!profile) {
                const fallbackName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email.split("@")[0] || "Parent";
                await supabase.from("profiles").insert({
                    id: data.user.id,
                    role: "parent",
                    full_name: fallbackName,
                    phone_number: data.user.user_metadata?.phone_number || null,
                });
            }
            await routeUserToDashboard(data.user.id);
        }
    };

    const handleGoogleSignIn = async (requestCalendar = false) => {
        setLoading(true);
        setMessage("");

        let options = {
            redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        };

        if (requestCalendar === true) {
            options.scopes = "https://www.googleapis.com/auth/calendar.readonly";
            options.queryParams = { access_type: "offline", prompt: "consent" };
        }

        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: options });
        if (error) {
            setMessage(error.message);
            setLoading(false);
        }
    };

    // ==========================================
    // STUDENT LOGIC
    // ==========================================
    const handleStudentSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            // Check if the student code and PIN match
            const { data: studentData, error } = await supabase
                .from("students")
                .select("id, full_name")
                .ilike("billing_code", studentCode.trim()) // ilike makes it case-insensitive (oli972 = OLI972)
                .eq("pin", studentPin.trim())
                .single();

            if (error || !studentData) {
                setMessage("Invalid Student ID or PIN. Please try again.");
                setLoading(false);
                return;
            }

            // Success! Store the ID securely in local storage so the student dashboard can find it
            localStorage.setItem('student_id', studentData.id);

            // Route them to their awesome launchpad
            router.push('/student-dashboard');

        } catch (err) {
            setMessage("An unexpected error occurred.");
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
                background: "radial-gradient(1200px 600px at 50% 0%, #d9b9fc 0%, transparent 90%), radial-gradient(1000px 600px at 50% 100%, #9cfbbd 0%, transparent 90%), #ffffff",
            }}
        >
            <div style={{ width: "100%", maxWidth: 460 }}>
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: 0.2 }}>
                        {view === 'choose' ? 'Who is logging in?' : 'Welcome back'}
                    </div>
                    <div style={{ color: "#666", marginTop: 6, fontSize: 14 }}>
                        {view === 'choose' ? 'Select your portal to continue' : 'Sign in to access your portal'}
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
                    <div style={{ padding: 24 }}>

                        {/* ============================== */}
                        {/* STATE 1: THE CHOOSER           */}
                        {/* ============================== */}
                        {view === 'choose' && (
                            <div style={{ display: 'grid', gap: 16 }}>
                                <button
                                    onClick={() => setView('student')}
                                    style={{
                                        width: "100%", padding: "20px", borderRadius: 16, border: "2px solid #eaf6ef", background: "#f0fdf4", color: "#24985b", cursor: "pointer", fontWeight: 900, fontSize: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s"
                                    }}
                                >
                                    <span style={{ fontSize: 32 }}>🎒</span>
                                    I am a Student
                                </button>

                                <button
                                    onClick={() => setView('parent')}
                                    style={{
                                        width: "100%", padding: "20px", borderRadius: 16, border: "2px solid #f3e8ff", background: "#faf5ff", color: "#600b91", cursor: "pointer", fontWeight: 900, fontSize: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s"
                                    }}
                                >
                                    <span style={{ fontSize: 32 }}>👨‍👩‍👧‍👦</span>
                                    I am a Parent / Tutor
                                </button>
                            </div>
                        )}

                        {/* ============================== */}
                        {/* STATE 2: STUDENT LOGIN         */}
                        {/* ============================== */}
                        {view === 'student' && (
                            <form onSubmit={handleStudentSignIn}>
                                <div style={{ display: "grid", gap: 16 }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#24985b", textTransform: 'uppercase', letterSpacing: 1 }}>
                                            Student ID
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. OLI972"
                                            value={studentCode}
                                            onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                                            required
                                            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "2px solid #eaf6ef", outline: "none", fontSize: 16, fontWeight: 'bold', background: '#f8fdfa', color: '#1d824d' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#24985b", textTransform: 'uppercase', letterSpacing: 1 }}>
                                            4-Digit PIN
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="••••"
                                            maxLength={4}
                                            value={studentPin}
                                            onChange={(e) => setStudentPin(e.target.value)}
                                            required
                                            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "2px solid #eaf6ef", outline: "none", fontSize: 24, fontWeight: 'bold', background: '#f8fdfa', letterSpacing: 8, textAlign: 'center', color: '#1d824d' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#24985b", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontWeight: 900, fontSize: 16, marginTop: 8 }}
                                    >
                                        {loading ? "Jumping in..." : "Enter Portal"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ============================== */}
                        {/* STATE 3: PARENT/TUTOR LOGIN    */}
                        {/* ============================== */}
                        {view === 'parent' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleGoogleSignIn(false)}
                                    disabled={loading}
                                    style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e6e6e6", background: "#fff", cursor: loading ? "not-allowed" : "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                                >
                                    <span style={{ width: 22, height: 22, borderRadius: 999, border: "1px solid #e6e6e6", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: "#444" }}>
                                        G
                                    </span>
                                    {loading ? "Redirecting..." : "Continue with Google"}
                                </button>

                                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                                    <div style={{ height: 1, background: "#eee", flex: 1 }} />
                                    <div style={{ fontSize: 12, color: "#777", fontWeight: 800 }}>OR</div>
                                    <div style={{ height: 1, background: "#eee", flex: 1 }} />
                                </div>

                                <form onSubmit={handleSignIn}>
                                    <div style={{ display: "grid", gap: 10 }}>
                                        <div>
                                            <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#222" }}>Email</label>
                                            <input
                                                type="email"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e6e6e6", outline: "none", fontSize: 14 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#222" }}>Password</label>
                                            <input
                                                type="password"
                                                placeholder="Your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e6e6e6", outline: "none", fontSize: 14 }}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#5b0b91", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontWeight: 900, fontSize: 14 }}
                                        >
                                            {loading ? "Signing in..." : "Sign in"}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {/* Error Message Display */}
                        {message && (
                            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid #ffd7d7", background: "#fff5f5", color: "#8a1f1f", fontWeight: 750, fontSize: 13 }}>
                                {message}
                            </div>
                        )}
                    </div>

                    {/* Footer Controls */}
                    <div style={{ padding: 14, borderTop: "1px solid #f1f1f1", background: "#fafafa", display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
                        {view !== 'choose' ? (
                            <button onClick={() => { setView('choose'); setMessage(""); }} style={{ fontSize: 13, color: "#555", fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}>
                                ← Back to options
                            </button>
                        ) : (
                            <div style={{ fontSize: 13, color: "#555" }}>
                                New here? <a href="/auth/sign-up" style={{ fontWeight: 900, color: "#600b91", textDecoration: "none" }}>Create an account</a>
                            </div>
                        )}
                        <a href="/" style={{ fontSize: 13, color: "#555", textDecoration: "none", fontWeight: 800 }}>
                            Back to Home
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}