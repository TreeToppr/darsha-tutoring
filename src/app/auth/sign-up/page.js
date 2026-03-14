'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage('');

        // 1. Send the registration to Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    // This securely passes the name so Supabase can automatically drop it into your profiles table!
                    full_name: formData.fullName,
                }
            }
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        // 2. Handle the response based on your Supabase settings
        if (data?.user?.identities?.length === 0) {
            // This happens if the user already exists
            setError("An account with this email already exists. Please sign in.");
        } else {
            // Success! 
            setSuccessMessage("Account created successfully! Redirecting...");

            setTimeout(() => {
                router.push('/parent-dashboard');
            }, 2000);
        }

        setLoading(false);
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
                    "radial-gradient(1200px 600px at 50% 0%, #9cfbbd 0%, transparent 90%), radial-gradient(1000px 600px at 50% 100%, #d9b9fc 0%, transparent 90%), #ffffff",
            }}
        >
            <div style={{ width: "100%", maxWidth: 460 }}>
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.2 }}>Create your account</div>
                    <div style={{ color: "#666", marginTop: 6, fontSize: 14 }}>
                        Start booking and managing lessons today.
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
                        <form onSubmit={handleSignUp}>
                            <div style={{ display: "grid", gap: 10 }}>

                                <div>
                                    <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, color: "#222" }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Marina Bloom"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required
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
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={6}
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
                                    disabled={loading || successMessage !== ''}
                                    style={{
                                        width: "100%",
                                        padding: "12px 12px",
                                        borderRadius: 12,
                                        border: "1px solid #24985b",
                                        background: "#24985b",
                                        color: "#fff",
                                        cursor: (loading || successMessage !== '') ? "not-allowed" : "pointer",
                                        fontWeight: 900,
                                        fontSize: 14,
                                        opacity: (loading || successMessage !== '') ? 0.6 : 1,
                                    }}
                                >
                                    {loading ? "Creating account..." : "Sign Up"}
                                </button>
                            </div>
                        </form>

                        {error && (
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
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div
                                style={{
                                    marginTop: 14,
                                    padding: 12,
                                    borderRadius: 12,
                                    border: "1px solid #d7f4e3",
                                    background: "#f0fdf4",
                                    color: "#24985b",
                                    fontWeight: 750,
                                    fontSize: 13,
                                }}
                            >
                                {successMessage}
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
                            {/* Using <a> tag instead of <Link> to avoid the RSC freeze bug */}
                            <a href="/auth/sign-in" style={{ fontWeight: 900, color: "#24985b", textDecoration: "none" }}>
                                Sign in
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