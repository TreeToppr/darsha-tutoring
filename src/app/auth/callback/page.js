'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [message, setMessage] = useState("Securing Connection...");

    useEffect(() => {
        const run = async () => {
            try {
                // 1. If we landed here with an OAuth code, exchange it for a session
                const url = new URL(window.location.href);
                const code = url.searchParams.get("code");

                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) throw exchangeError;
                }

                // 2. Grab the active session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session) throw sessionError || new Error("No user session found.");

                const user = session.user;

                // 3. 🚀 THE NEW FIX: Extract and save the Google Provider Token!
                const googleRefreshToken = session.provider_refresh_token;

                if (googleRefreshToken) {
                    await supabase
                        .from('profiles')
                        .update({ google_refresh_token: googleRefreshToken })
                        .eq('id', user.id);
                }

                // 4. Ensure profile exists and check role
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                let role = profile?.role;

                if (profileError || !profile) {
                    const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Parent";
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

                // 5. Route them home!
                if (role === "parent") router.push("/parent-dashboard");
                else if (role === "tutor") router.push("/tutor-dashboard");
                else if (role === "admin") router.push("/admin-dashboard");
                else router.push("/auth/sign-in");

            } catch (e) {
                console.error("Callback Error:", e);
                setMessage(e?.message || "Sign-in failed. Redirecting...");
                setTimeout(() => router.push('/auth/sign-in'), 3000);
            }
        };

        run();
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="w-12 h-12 border-4 border-[#24985b] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm animate-pulse">{message}</p>
        </div>
    );
}