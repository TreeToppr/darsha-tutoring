"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
import { supabase } from "../../lib/supabaseClient";


function NavLink({ href, children, active }) {
    return (
        <Link
            href={href}
            style={{
                padding: "8px 10px",
                borderRadius: 8,
                textDecoration: "none",
                color: active ? "#0b3d91" : "#222",
                background: active ? "#eaf2ff" : "transparent",
                fontWeight: active ? 700 : 600,
                border: "1px solid",
                borderColor: active ? "#b6d4ff" : "transparent",
            }}
        >
            {children}
        </Link>
    );
}

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [role, setRole] = useState(null);

    // Load auth + profile role, keep it in sync
    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);

            const { data } = await supabase.auth.getUser();
            const user = data?.user || null;

            if (!mounted) return;

            if (!user) {
                setUserId(null);
                setRole(null);
                setLoading(false);
                return;
            }

            setUserId(user.id);

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!mounted) return;

            setRole(profile?.role || null);
            setLoading(false);
        };

        load();

        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            load();
        });

        return () => {
            mounted = false;
            sub?.subscription?.unsubscribe?.();
        };
    }, []);

    const links = useMemo(() => {
        // Always visible
        const base = [{ href: "/", label: "Home" }];

        if (!userId) {
            return [
                ...base,
                { href: "/auth/sign-in", label: "Sign in" },
                { href: "/auth/sign-up", label: "Sign up" },
            ];
        }

        // Signed in: role-specific navigation
        if (role === "parent") {
            return [
                // ...base,
                { href: "/parent/profile", label: "Profile" },
                { href: "/parent/dashboard", label: "Dashboard" },
                { href: "/parent/students", label: "Students" },
                { href: "/book", label: "Book" },
            ];
        }

        if (role === "tutor") {
            return [
                // ...base,
                { href: "/tutor/profile", label: "Profile" },
                { href: "/tutor/dashboard", label: "Dashboard" },
                { href: "/tutor/availability", label: "Availability" },
            ];
        }

        if (role === "student") {
            return [...base, { href: "/student/dashboard", label: "Dashboard" }];
        }

        if (role === "admin") {
            return [...base, { href: "/admin/dashboard", label: "Admin" }];
        }

        // Fallback if role missing
        return base;
    }, [userId, role]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/sign-in");
    };

    return (
        <header
            style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
                background: "white",
                borderBottom: "1px solid #eee",
            }}
        >
            <div
                style={{
                    maxWidth: 960,
                    margin: "0 auto",
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, letterSpacing: 0.2 }}>Tutoring</span>
                    {loading && (
                        <span style={{ fontSize: 12, color: "#777" }}>Loading…</span>
                    )}
                </div>

                <nav style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {links.map((l) => (
                        <NavLink key={l.href} href={l.href} active={pathname === l.href}>
                            {l.label}
                        </NavLink>
                    ))}

                    {userId && (
                        <button
                            onClick={handleSignOut}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                background: "#fff",
                                cursor: "pointer",
                                fontWeight: 700,
                            }}
                        >
                            Sign out
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
}
