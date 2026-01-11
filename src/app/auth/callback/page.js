"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [message, setMessage] = useState("Signing you in...");

    useEffect(() => {
        const run = async () => {
            try {
                // If we landed here with an OAuth code, exchange it for a session
                const url = new URL(window.location.href);
                const code = url.searchParams.get("code");

                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;
                }

                const { data: userRes, error: userError } = await supabase.auth.getUser();
                if (userError || !userRes?.user) throw userError || new Error("No user session found.");
                const user = userRes.user;

                // Ensure profile exists (Google users often won't have one yet)
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                let role = profile?.role;

                if (profileError || !profile) {
                    const fallbackName =
                        user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.email ||
                        "Parent";

                    const fallbackPhone = user.user_metadata?.phone_number || null;

                    const { error: insertError } = await supabase.from("profiles").insert({
                        id: user.id,
                        role: "parent",
                        full_name: fallbackName,
                        phone_number: fallbackPhone,
                    });

                    if (insertError) throw insertError;

                    role = "parent";
                }

                if (role === "parent") router.push("/parent/dashboard");
                else if (role === "student") router.push("/student/dashboard");
                else if (role === "tutor") router.push("/tutor/dashboard");
                else if (role === "admin") router.push("/admin/dashboard");
                else router.push("/auth/sign-in");
            } catch (e) {
                setMessage(e?.message || "Sign-in failed.");
            }
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main style={{ maxWidth: 520, margin: "0 auto", padding: 32 }}>
            <h1>One moment…</h1>
            <p>{message}</p>
        </main>
    );
}
