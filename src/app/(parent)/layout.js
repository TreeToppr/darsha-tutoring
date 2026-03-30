'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

export default function ParentPortalLayout({ children }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth/sign-in');
            } else {
                setIsAuthenticated(true);
            }
            setLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/auth/sign-in');
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#24985b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-bold animate-pulse">Securing Portal...</p>
                </div>
            </div>
        );
    }

    return isAuthenticated ? (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar role="parent" />

            {/* 🚀 UPDATED: Made responsive. Added pb-24 so content doesn't hide behind bottom nav */}
            <main className="flex-1 w-full p-4 md:p-8 lg:p-12 md:ml-64 pb-24 md:pb-8 overflow-y-auto">
                {children}
            </main>

        </div>
    ) : null;
}