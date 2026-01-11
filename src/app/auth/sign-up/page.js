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

        setMessage("Check your email to confirm your signup.");
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage(error.message);
            setLoading(false);
        }
    };

    return (
        <main style={{ maxWidth: 480, margin: "0 auto", padding: 32 }}>
            <h1>Create account</h1>

            <form onSubmit={handleSignUp}>
                <div style={{ marginBottom: 12 }}>
                    <input
                        type="text"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <input
                        type="tel"
                        placeholder="Phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                    />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create account"}
                </button>
            </form>

            <div style={{ marginTop: 16 }}>
                <button type="button" onClick={handleGoogleSignIn} disabled={loading} style={{ width: "100%" }}>
                    {loading ? "Redirecting..." : "Continue with Google"}
                </button>
            </div>

            {message && <p>{message}</p>}
        </main>
    );
}
