'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ role }) {
    const pathname = usePathname();

    const parentMenu = [
        { label: 'Dashboard', href: '/parent-dashboard' },
        { label: 'Students', href: '/students' },
        { label: 'Book', href: '/book' }, // Shortened for mobile
        { label: 'Payments', href: '/parent-payments' },
        { label: 'Profile', href: '/parent-profile' },
    ];

    const tutorMenu = [
        { label: 'Dashboard', href: '/tutor-dashboard' },
        { label: 'Calendar', href: '/tutor-calendar' },
        { label: 'Availability', href: '/availability' },
        { label: 'Payments', href: '/tutor-payments' },
        { label: 'Profile', href: '/tutor-profile' },
    ];

    const adminMenu = [
        { label: 'Dashboard', href: '/admin-dashboard' },
        { label: 'Bookings', href: '/bookings' },
        { label: 'Tutors', href: '/tutors' },
        { label: 'Payments', href: '/admin-payments' },
        { label: 'Settings', href: '/settings' },
    ];

    const menuItems = role === 'admin' ? adminMenu : role === 'tutor' ? tutorMenu : parentMenu;

    const getIcon = (label, isActive) => {
        const baseClass = `w-6 h-6 md:w-5 md:h-5 md:mr-3 transition-colors mx-auto ${isActive ? 'text-[#24985b]' : 'text-gray-400 group-hover:text-gray-500'}`;
        const name = label.toLowerCase();

        if (name.includes('dashboard')) {
            return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
        }
        if (name.includes('tutor') || name.includes('student')) {
            return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
        }
        if (name.includes('availability') || name.includes('calendar')) {
            return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
        }
        if (name.includes('book')) {
            return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
        }
        if (name.includes('payment')) {
            return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
        }
        if (name.includes('setting') || name.includes('profile')) {
            return <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
        }
        return <div className={baseClass} />;
    };

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <div className="hidden md:flex w-64 h-screen bg-white border-r border-gray-100 fixed left-0 top-0 flex-col py-8 z-50">
                <div className="px-8 mb-10">
                    <div className="text-2xl font-bold tracking-tight">
                        <span className="text-[#24985b]">Darsha</span>
                        <span className="text-[#24985b] font-medium">Tutor</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 capitalize font-medium">{role} Portal</div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-[#eaf6ef] text-[#24985b]' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {getIcon(item.label, isActive)}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* MOBILE BOTTOM NAV */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <nav className="flex justify-between items-center px-4 py-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center p-1 w-16 ${isActive ? 'text-[#24985b]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {getIcon(item.label, isActive)}
                                {/* 🚀 FIXED: Labels are now permanently visible and clearly legible */}
                                <span className={`text-[10px] mt-1 font-bold tracking-tight text-center w-full truncate ${isActive ? 'text-[#24985b]' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </>
    );
}