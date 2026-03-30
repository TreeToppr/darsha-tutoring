'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [message, setMessage] = useState("Securing Connection...");

    // 🚀 The Magic Auto-Router
    const routeUserToDashboard = async (userId) => {
        try {
            // 1. Check the official role in the profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (profile?.role === 'admin') {
                console.log("Callback: Admin detected!");
                router.push('/admin-dashboard');
                return;
            } else if (profile?.role === 'tutor') {
                console.log("Callback: Tutor detected!");
                router.push('/tutor-dashboard');
                return;
            }

            // 2. 🚧 FUTURE V2 UPDATE: Check if they are a Student
            /*
            const { data: studentData } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', userId)
                .single();
                
            if (studentData || profile?.role === 'student') {
                console.log("Callback: Student detected!");
                router.push('/student-dashboard');
                return;
            }
            */

            // 3. Default Fallback: They are a Parent!
            console.log("Callback: Parent detected!");
            router.push('/parent-dashboard');

        } catch (error) {
            console.error("Callback Routing error:", error);
            router.push('/parent-dashboard');
        }
    };

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

                // 3. Extract and save the Google Provider Token (Crucial for Tutor Calendar Sync!)
                const googleRefreshToken = session.provider_refresh_token;

                if (googleRefreshToken) {
                    await supabase
                        .from('profiles')
                        .update({ google_refresh_token: googleRefreshToken })
                        .eq('id', user.id);
                }

                // 4. Ensure profile exists
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("id", user.id)
                    .single();

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
                }

                // 5. 🚀 Route them using the Magic Auto-Router!
                await routeUserToDashboard(user.id);

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