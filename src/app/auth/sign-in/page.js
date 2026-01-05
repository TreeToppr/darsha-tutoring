"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

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

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            setMessage("Signed in, but could not load profile.");
            setLoading(false);
            return;
        }

        const role = profile.role;

        if (role === "parent") router.push("/parent/dashboard");
        else if (role === "student") router.push("/student/dashboard");
        else if (role === "tutor") router.push("/tutor/dashboard");
        else if (role === "admin") router.push("/admin/dashboard");
        else setMessage("Signed in, but role is unknown.");

        setLoading(false);
    };

    return (
        <main style={{ maxWidth: 480, margin: "0 auto", padding: 32 }}>
            <h1>Sign in</h1>

            <form onSubmit={handleSignIn}>
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
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            {message && <p>{message}</p>}
        </main>
    );
}
