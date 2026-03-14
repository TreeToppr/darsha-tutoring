'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Link from 'next/link';

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState({ tutors: 0, students: 0, revenue: 0, activeBookings: 0 });
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
    }, []);

    async function fetchAdminData() {
        // 1. Fetch KPI Counts
        const { count: tutorCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'tutor');
        const { count: studentCount } = await supabase.from('students').select('id', { count: 'exact', head: true });

        // Active bookings (pending or confirmed)
        const { count: activeBookingCount } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'requested', 'confirmed']);

        // 2. Calculate Total Revenue (All Paid Bookings)
        const { data: revenueData } = await supabase
            .from('bookings')
            .select('amount_total')
            .eq('payment_status', 'paid');

        const totalRev = revenueData?.reduce((sum, b) => sum + parseFloat(b.amount_total || 0), 0) || 0;

        // 3. Fetch Recent Bookings for Table
        const { data: recent } = await supabase
            .from('bookings')
            .select(`
                id, 
                lesson_date, 
                amount_total, 
                status, 
                students(name), 
                tutor:profiles!tutor_id(full_name), 
                parent:profiles!parent_id(full_name)
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        setMetrics({
            tutors: tutorCount || 0,
            students: studentCount || 0,
            revenue: totalRev,
            activeBookings: activeBookingCount || 0
        });
        setRecentBookings(recent || []);
        setLoading(false);
    }

    if (loading) return <div className="p-8 text-gray-500 font-medium animate-pulse">Loading platform metrics...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
                <p className="text-gray-500 mt-1 text-sm font-medium">Platform overview and metrics</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <StatCard icon={<TutorsIcon />} value={metrics.tutors} label="Active Tutors" />
                <StatCard icon={<StudentsIcon />} value={metrics.students} label="Students" />
                <StatCard icon={<DollarIcon />} value={`$${metrics.revenue.toLocaleString()}`} label="Total Revenue" />
                <StatCard icon={<BookIcon />} value={metrics.activeBookings} label="Active Bookings" />
            </div>

            {/* Revenue Overview Placeholder (Matches Figma) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="font-bold text-gray-900">Revenue Overview</h2>
                    <select className="border border-gray-200 text-sm rounded-lg px-3 py-1.5 outline-none bg-gray-50 text-gray-700 font-medium cursor-pointer">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>This Year</option>
                    </select>
                </div>

                {/* Simulated Chart Area */}
                <div className="h-64 flex flex-col justify-end">
                    <div className="flex justify-between items-end h-full gap-2 px-4 border-b border-gray-100 pb-2">
                        {/* Placeholder bars */}
                        <div className="w-full bg-[#24985b]/10 rounded-t-sm h-[30%]"></div>
                        <div className="w-full bg-[#24985b]/10 rounded-t-sm h-[50%]"></div>
                        <div className="w-full bg-[#24985b]/10 rounded-t-sm h-[40%]"></div>
                        <div className="w-full bg-[#24985b]/20 rounded-t-sm h-[70%] border-t-2 border-[#24985b]"></div>
                        <div className="w-full bg-[#24985b]/10 rounded-t-sm h-[60%]"></div>
                        <div className="w-full bg-[#24985b]/10 rounded-t-sm h-[80%]"></div>
                        <div className="w-full bg-[#24985b]/10 rounded-t-sm h-[50%]"></div>
                    </div>
                    <div className="flex justify-between px-4 mt-4 text-xs font-medium text-gray-400">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900">Recent Bookings</h2>
                    <Link href="/admin/bookings" className="text-[#24985b] text-sm font-bold flex items-center gap-1 hover:underline">
                        View All <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 text-xs font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Tutor</th>
                                <th className="px-6 py-4 font-semibold">Parent</th>
                                <th className="px-6 py-4 font-semibold">Student</th>
                                <th className="px-6 py-4 font-semibold">Amount</th>
                                <th className="px-6 py-4 font-semibold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentBookings.length === 0 ? (
                                <tr><td colSpan="6" className="p-6 text-center text-gray-400">No bookings found.</td></tr>
                            ) : (
                                recentBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(booking.lesson_date).toLocaleDateString('en-US')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{booking.tutor?.full_name || '-'}</td>
                                        <td className="px-6 py-4 text-gray-600">{booking.parent?.full_name || '-'}</td>
                                        <td className="px-6 py-4 text-gray-600">{booking.students?.name || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">${booking.amount_total}</td>
                                        <td className="px-6 py-4 text-right">
                                            <StatusBadge status={booking.status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- UI Components & Icons ---

function StatCard({ icon, value, label }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="text-[#24985b] mb-4">{icon}</div>
            <div className="text-3xl font-black text-gray-900 tracking-tight">{value}</div>
            <div className="text-xs font-semibold text-gray-400 tracking-wide mt-1">{label}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const displayStatus = status === 'pending' ? 'requested' : status;

    const styles = {
        confirmed: "bg-green-100 text-green-700 border-green-200",
        requested: "bg-yellow-100 text-yellow-700 border-yellow-200",
        completed: "bg-blue-100 text-blue-700 border-blue-200",
        cancelled: "bg-red-50 text-red-600 border-red-100",
    };

    return (
        <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold capitalize border ${styles[displayStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {displayStatus}
        </span>
    );
}

// Inline SVGs matching Figma
function TutorsIcon() {
    return <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function StudentsIcon() {
    return <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function DollarIcon() {
    return <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function BookIcon() {
    return <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
}