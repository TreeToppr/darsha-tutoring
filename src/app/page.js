'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LandingPage() {
    const [session, setSession] = useState(null);
    const [dashboardUrl, setDashboardUrl] = useState(null); //   Start as null

    useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setSession(user);
                // Fetch the actual role from the profiles table
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                //   Set the correct URL based on role
                if (profile?.role === 'admin') setDashboardUrl('/admin-dashboard');
                else if (profile?.role === 'tutor') setDashboardUrl('/tutor-dashboard');
                else setDashboardUrl('/parent-dashboard');
            }
        }
        checkAuth();
    }, []);
    
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-[#24985b] selection:text-white">
            {/*   NAVBAR */}
            <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#24985b] rounded-lg flex items-center justify-center text-white font-black text-xl">D</div>
                        <span className="text-xl font-black tracking-tight text-gray-900">DarshaTutor</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 font-bold text-sm text-gray-500">
                        <a href="#how-it-works" className="hover:text-[#24985b] transition-colors">How it works</a>
                        <a href="#features" className="hover:text-[#24985b] transition-colors">Features</a>
                        
                        {/* 🚀 EYE-CATCHING BADGE */}
                        <a href="/updates" className="flex items-center gap-2 bg-emerald-50 border border-[#24985b]/20 text-[#24985b] px-3 py-1.5 rounded-full hover:bg-[#24985b] hover:text-white transition-all group">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#24985b] opacity-75 group-hover:bg-white"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#24985b] group-hover:bg-white"></span>
                            </span>
                            What's New
                        </a>
                    </div>

                    <div className="flex items-center gap-4">
                        {session ? (
                            <a href={dashboardUrl} className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-black transition-all active:scale-95">
                                Go to Dashboard
                            </a>
                        ) : (
                            <>
                                <a href="/auth/sign-in" className="text-gray-600 font-bold text-sm hover:text-gray-900 hidden sm:block">Sign In</a>
                                <a href="/auth/sign-up" className="bg-[#24985b] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-[#24985b]/30 hover:bg-[#1d824d] transition-all active:scale-95">
                                    Get Started
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/*   HERO SECTION */}
            <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100%] h-[100%] opacity-40 pointer-events-none"
                    style={{
                        background: "radial-gradient(circle at 50% 50%, #d9b9fc 0%, #bbf7d0 100%)"
                    }}>

                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eaf6ef] text-[#24985b] font-bold text-xs uppercase tracking-widest mb-6 border border-[#24985b]/20">
                        <span className="w-2 h-2 rounded-full bg-[#24985b] animate-pulse"></span>
                        Now accepting new students
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 leading-[1.1] mb-6">
                        Expert Tutoring, <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#24985b] to-[#0b3d91]">Tailored to Succeed.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-500 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
                        Book top-tier tutors, manage your children's lessons, and track their progress all in one easy-to-use platform.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="/auth/sign-up" className="w-full sm:w-auto bg-[#24985b] text-white px-8 py-4 rounded-full font-black text-lg shadow-xl shadow-[#24985b]/20 hover:bg-[#1d824d] hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                            Get Started
                        </a>
                        <a href="/auth/sign-in" className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-100 px-8 py-4 rounded-full font-black text-lg hover:border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                            Sign In
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                        </a>
                    </div>
                </div>
            </section>

            {/*   HOW IT WORKS */}
            <section id="how-it-works" className="py-24 bg-gray-50 border-y border-gray-100">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">How DarshaTutor Works</h2>
                        <p className="text-gray-500 font-medium">Three simple steps to better grades and higher confidence.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative group hover:shadow-xl hover:border-[#24985b]/30 transition-all">
                            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">1. Create a Profile</h3>
                            <p className="text-gray-500 font-medium text-sm leading-relaxed">Sign up in seconds and add your children's profiles, including their current year levels.</p>
                        </div>

                        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative group hover:shadow-xl hover:border-[#24985b]/30 transition-all">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">2. Book a Lesson</h3>
                            <p className="text-gray-500 font-medium text-sm leading-relaxed">Select a subject, choose whether you want online or in-person, and instantly lock in a time.</p>
                        </div>

                        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative group hover:shadow-xl hover:border-[#24985b]/30 transition-all">
                            <div className="w-14 h-14 bg-[#eaf6ef] text-[#24985b] rounded-2xl flex items-center justify-center mb-6">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">3. Learn & Pay</h3>
                            <p className="text-gray-500 font-medium text-sm leading-relaxed">Your child attends the lesson, and you can securely pay the invoice directly from your dashboard.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/*   FEATURES */}
            <section id="features" className="py-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="bg-gray-900 rounded-[3rem] p-10 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#24985b] opacity-20 blur-[100px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

                        <div className="flex-1 relative z-10">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">Everything you need to manage tutoring.</h2>
                            <ul className="space-y-5">
                                <li className="flex items-center gap-4 text-gray-300 font-medium">
                                    <div className="w-8 h-8 rounded-full bg-[#24985b]/20 text-[#24985b] flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    View all upcoming lessons in one sleek dashboard.
                                </li>
                                <li className="flex items-center gap-4 text-gray-300 font-medium">
                                    <div className="w-8 h-8 rounded-full bg-[#24985b]/20 text-[#24985b] flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    Request reschedules or cancellations with one click.
                                </li>
                                <li className="flex items-center gap-4 text-gray-300 font-medium">
                                    <div className="w-8 h-8 rounded-full bg-[#24985b]/20 text-[#24985b] flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    Pay securely via standard bank transfer using POLi.
                                </li>
                            </ul>
                            <a href="/auth/sign-up" className="inline-block mt-10 bg-[#24985b] text-white px-8 py-4 rounded-full font-black shadow-lg hover:bg-[#1d824d] transition-colors">
                                Create Free Account
                            </a>
                        </div>

                        <div className="flex-1 w-full relative z-10">
                            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                    <div className="text-white font-bold">Upcoming Lesson</div>
                                    <div className="bg-[#24985b] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Confirmed</div>
                                </div>
                                <div className="text-white">
                                    <div className="text-xl font-black mb-1">Mathematics</div>
                                    <div className="text-gray-400 text-sm font-medium">with Marina Bloom • 60 mins</div>
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <div className="h-10 flex-1 bg-white/5 rounded-xl border border-white/10"></div>
                                    <div className="h-10 flex-[2] bg-[#24985b] rounded-xl"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-white border-t border-gray-100 py-12 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-[#24985b] rounded flex items-center justify-center text-white font-black text-xs">D</div>
                    <span className="text-lg font-black tracking-tight text-gray-900">DarshaTutor</span>
                </div>
                <p className="text-sm font-medium text-gray-400 mb-6">Empowering students to reach their full potential.</p>
                <div className="flex items-center justify-center gap-6 text-sm font-bold text-gray-500">
                    <a href="/auth/sign-in" className="hover:text-gray-900 transition-colors">Sign In</a>
                    <a href="/auth/sign-up" className="hover:text-gray-900 transition-colors">Sign Up</a>
                    <a href="/updates" className="hover:text-[#24985b] transition-colors">What's New</a>
                </div>
                <p className="text-xs font-medium text-gray-400 mt-12">© {new Date().getFullYear()} DarshaTutor. All rights reserved.</p>
            </footer>
        </div>
    );
}