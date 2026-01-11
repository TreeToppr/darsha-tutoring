"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminDashboard() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth/sign-in");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "admin") {
                router.push("/auth/sign-in");
                return;
            }

            setChecking(false);
        };

        checkAuth();
    }, [router]);

    if (checking) return <p style={{ padding: 32 }}>Checking access...</p>;

    return (
        <main style={{ padding: 32 }}>
            <h1>Admin Dashboard</h1>
            <p>Global settings, tutors, terms, holidays.</p>
        </main>
    );
}
