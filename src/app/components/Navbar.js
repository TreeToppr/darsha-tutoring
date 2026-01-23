"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function NavLink({ href, children, active, onClick }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            style={{
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                color: active ? "#0b3d91" : "#222",
                background: active ? "#eaf2ff" : "transparent",
                fontWeight: active ? 800 : 650,
                border: "1px solid",
                borderColor: active ? "#b6d4ff" : "transparent",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
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

    const [menuOpen, setMenuOpen] = useState(false);

    // Close the mobile menu when route changes
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

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
        const base = [{ href: "/", label: "Home" }];

        if (!userId) {
            return [
                ...base,
                { href: "/auth/sign-in", label: "Sign in" },
                { href: "/auth/sign-up", label: "Sign up" },
            ];
        }

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
                ...base,
                { href: "/tutor/dashboard", label: "Dashboard" },
                { href: "/tutor/profile", label: "Profile" },
            ];
        }

        if (role === "student") {
            return [...base, { href: "/student/dashboard", label: "Dashboard" }];
        }

        if (role === "admin") {
            return [...base, { href: "/admin/dashboard", label: "Admin" }];
        }

        return base;
    }, [userId, role]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/sign-in");
    };

    const onNavClick = () => setMenuOpen(false);

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
            {/* Tiny CSS for responsive behaviour */}
            <style>{`
                .navDesktop { display: flex; align-items: center; gap: 8px; }
                .hamburger { display: none; }
                .mobilePanel { display: none; }

                @media (max-width: 720px) {
                    .navDesktop { display: none; }
                    .hamburger { display: inline-flex; }
                    .mobilePanel { display: block; }
                }
            `}</style>

            <div
                style={{
                    maxWidth: 960,
                    margin: "0 auto",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Link
                        href="/"
                        style={{
                            fontWeight: 900,
                            letterSpacing: 0.2,
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                            color: "#111",
                        }}
                    >
                        DarshaTutor
                    </Link>

                    {loading && (
                        <span style={{ fontSize: 12, color: "#777", whiteSpace: "nowrap" }}>
                            Loading…
                        </span>
                    )}
                </div>

                {/* Desktop links */}
                <nav className="navDesktop">
                    {links.map((l) => (
                        <NavLink key={l.href} href={l.href} active={pathname === l.href}>
                            {l.label}
                        </NavLink>
                    ))}

                    {userId && (
                        <button
                            onClick={handleSignOut}
                            style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "#fff",
                                cursor: "pointer",
                                fontWeight: 800,
                            }}
                        >
                            Sign out
                        </button>
                    )}
                </nav>

                {/* Mobile hamburger */}
                <button
                    className="hamburger"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Open menu"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: "1px solid #e6e6e6",
                        background: "#fff",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 35,
                        fontWeight: 900,
                    }}
                >
                    {menuOpen ? "×" : "≡"}
                </button>
            </div>

            {/* Mobile panel */}
            {menuOpen && (
                <div
                    className="mobilePanel"
                    style={{
                        borderTop: "1px solid #eee",
                        background: "white",
                    }}
                >
                    <div
                        style={{
                            maxWidth: 960,
                            margin: "0 auto",
                            padding: "10px 14px 14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}
                    >
                        {links.map((l) => (
                            <NavLink
                                key={l.href}
                                href={l.href}
                                active={pathname === l.href}
                                onClick={onNavClick}
                            >
                                {l.label}
                            </NavLink>
                        ))}

                        {userId && (
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    handleSignOut();
                                }}
                                style={{
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    border: "1px solid #ddd",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    textAlign: "left",
                                }}
                            >
                                Sign out
                            </button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
