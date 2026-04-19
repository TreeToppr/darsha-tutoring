'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Sidebar({ role }) {
    const pathname = usePathname();
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
            if (data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        }
    };

    useEffect(() => {
        fetchNotifications();
        const channel = supabase.channel('notifs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => { fetchNotifications(); }).subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const handleMarkAsRead = async (notifId) => {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    };

    const handleNotificationClick = (e, notif) => {
        e.preventDefault();
        handleMarkAsRead(notif.id);
        setIsDropdownOpen(false);

        if (notif.href) {
            router.push(notif.href);
        }
    };

    const parentMenu = [{ label: 'Dashboard', href: '/parent-dashboard' }, { label: 'Students', href: '/students' }, { label: 'Book', href: '/book' }, { label: 'Payments', href: '/parent-payments' }, { label: 'Profile', href: '/parent-profile' }];
    const tutorMenu = [{ label: 'Dashboard', href: '/tutor-dashboard' }, { label: 'Calendar', href: '/tutor-calendar' }, { label: 'Wrap-up', href: '/upload-lesson' }, { label: 'Availability', href: '/availability' }, { label: 'Payments', href: '/tutor-payments' }, { label: 'Profile', href: '/tutor-profile' }];
    const adminMenu = [{ label: 'Dashboard', href: '/admin-dashboard' }, { label: 'Bookings', href: '/bookings' }, { label: 'Tutors', href: '/tutors' }, { label: 'Payments', href: '/admin-payments' }, { label: 'Settings', href: '/settings' }];
    const menuItems = role === 'admin' ? adminMenu : role === 'tutor' ? tutorMenu : parentMenu;

    const getIcon = (label, isActive) => {
        const baseClass = `w-6 h-6 md:w-5 md:h-5 md:mr-3 transition-colors mx-auto ${isActive ? 'text-[#24985b]' : 'text-gray-400 group-hover:text-gray-500'}`;
        const name = label.toLowerCase();
        if (name.includes('dashboard')) return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
        if (name.includes('tutor') || name.includes('student')) return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
        if (name.includes('availability') || name.includes('calendar')) return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
        if (name.includes('book')) return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
        if (name.includes('payment')) return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
        if (name.includes('setting') || name.includes('profile')) return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
        if (name.includes('wrap-up')) return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        return <div className={baseClass} />;
    };

    return (
        <>
            {/* -------------------- DESKTOP VIEW -------------------- */}
            <div className="hidden md:flex w-64 h-screen bg-white border-r border-gray-100 fixed left-0 top-0 flex-col py-8 z-[100]">
                {isDropdownOpen && (
                    <div
                        className="fixed inset-0 z-[110] bg-black/5 backdrop-blur-[1px]"
                        onClick={() => setIsDropdownOpen(false)}
                    ></div>
                )}

                <div className="px-8 mb-10 flex items-start justify-between relative z-[120]">
                    <div>
                        <div className="text-2xl font-bold tracking-tight"><span className="text-[#24985b]">Darsha</span><span className="text-[#24985b] font-medium">Tutor</span></div>
                        <div className="text-xs text-gray-400 mt-1 capitalize font-medium">{role} Portal</div>
                    </div>

                    <div className="relative">
                        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="p-2 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all focus:outline-none relative">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {unreadCount > 0 && <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white shadow-sm">{unreadCount}</span>}
                        </button>

                        {/* DESKTOP DROPDOWN */}
                        {isDropdownOpen && (
                            <div className="absolute top-12 left-0 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[130] animate-in zoom-in-95 duration-200">
                                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                    <span className="font-black text-gray-900">Notifications</span>
                                    {unreadCount > 0 && <span className="bg-[#24985b] text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{unreadCount} New</span>}
                                </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <p className="p-8 text-center text-sm font-bold text-gray-400">You're all caught up! 🎉</p>
                                    ) : (
                                        notifications.map(n => (
                                            <a
                                                key={n.id}
                                                href={n.href || '#'}
                                                onClick={(e) => handleNotificationClick(e, n)}
                                                className={`block p-4 transition-colors ${!n.is_read ? 'bg-emerald-50/30' : 'bg-white'} hover:bg-gray-50`}
                                            >
                                                <div className="flex gap-3 text-left">
                                                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#24985b] shrink-0 mt-1.5"></div>}
                                                    <div>
                                                        <p className={`text-sm ${!n.is_read ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>{n.title}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">{new Date(n.created_at).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                            </a>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link key={item.href} href={item.href} className={`group flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-[#eaf6ef] text-[#24985b]' : 'text-gray-500 hover:bg-gray-50'}`}>
                                {getIcon(item.label, isActive)}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/*   ADDED: Desktop "What's New" Button */}
                <div className="px-4 mt-auto mb-4">
                    <Link
                        href="/updates"
                        className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl text-purple-600 bg-purple-50 hover:bg-purple-100 transition-all font-bold text-sm border border-purple-100"
                    >
                        <div className="relative">
                            <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                            </span>
                        </div>
                        What's New
                    </Link>
                </div>
            </div>


            {/* -------------------- MOBILE VIEW -------------------- */}

            {/* MOBILE BOTTOM NAV */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-[100] shadow-[0_-5px_20px_rgba(0,0,0,0.05)] flex items-center">
                <nav className="flex-1 flex justify-around items-center px-2 py-2 relative z-[120]">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center p-1 w-14 ${isActive ? 'text-[#24985b]' : 'text-gray-400 hover:text-gray-600'}`}>
                                {getIcon(item.label, isActive)}
                                <span className={`text-[9px] mt-1 font-bold tracking-tight text-center w-full truncate ${isActive ? 'text-[#24985b]' : 'text-gray-400'}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* FLOATING ACTION BUTTON (FAB) & SHEET FOR MOBILE */}
            <div className="md:hidden">
                {/* Full screen backdrop when open */}
                {isDropdownOpen && (
                    <div
                        className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm transition-all"
                        onClick={() => setIsDropdownOpen(false)}
                    ></div>
                )}

                {/* The Floating Button */}
                <div className="fixed bottom-20 right-4 z-[120]">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="p-3.5 bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 text-gray-500 hover:text-gray-900 transition-all focus:outline-none relative flex items-center justify-center"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>

                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white shadow-sm">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* The Floating Bottom Sheet Modal */}
                {isDropdownOpen && (
                    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-[130] animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[70vh]">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <span className="font-black text-gray-900">Notifications</span>
                            {unreadCount > 0 && <span className="bg-[#24985b] text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">{unreadCount} New</span>}
                        </div>

                        {/*   ADDED: Mobile "What's New" Banner */}
                        <Link
                            href="/updates"
                            onClick={() => setIsDropdownOpen(false)}
                            className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between group active:bg-purple-100 transition-colors shrink-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                    </span>
                                </div>
                                <span className="font-black text-purple-700 text-sm">See What's New!</span>
                            </div>
                            <svg className="w-4 h-4 text-purple-300 group-active:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </Link>

                        <div className="overflow-y-auto divide-y divide-gray-50 custom-scrollbar flex-1">
                            {notifications.length === 0 ? (
                                <div className="p-10 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-sm font-bold text-gray-400">You're all caught up! 🎉</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <a
                                        key={n.id}
                                        href={n.href || '#'}
                                        onClick={(e) => handleNotificationClick(e, n)}
                                        className={`block p-4 text-left transition-colors ${!n.is_read ? 'bg-emerald-50/30' : 'bg-white'} hover:bg-gray-50`}
                                    >
                                        <div className="flex gap-3">
                                            {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#24985b] shrink-0 mt-1.5"></div>}
                                            <div>
                                                <p className={`text-sm ${!n.is_read ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>{n.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">{new Date(n.created_at).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}