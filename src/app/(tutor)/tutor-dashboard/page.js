'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Link from 'next/link';

export default function TutorDashboard() {
    const [firstName, setFirstName] = useState('');
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [stats, setStats] = useState({ today: 0, week: 0, pending: 0, earnings: 0 });
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');

    useEffect(() => { fetchDashboardData(); }, []);

    async function fetchDashboardData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Profile for name & Google status
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            setFirstName(profile.full_name?.split(' ')[0] || 'Tutor');
            setIsGoogleConnected(!!profile.google_refresh_token);
        }

        const { data: tutorRecord } = await supabase.from('tutors').select('id').eq('profile_id', user.id).single();
        if (!tutorRecord) {
            setLoading(false);
            return;
        }

        // Fetch all bookings
        const { data: bookingData } = await supabase
            .from('bookings')
            .select('*, students(*)')
            .eq('tutor_id', tutorRecord.id)
            .order('session_date', { ascending: true });

        if (bookingData) {
            setBookings(bookingData);
            const now = new Date().toISOString().split('T')[0];
            
            const pending = bookingData.filter(b => b.status === 'requested').length;
            const lessonsToday = bookingData.filter(b => b.session_date === now && b.status === 'accepted').length;
            const weekEarnings = bookingData
                .filter(b => b.status === 'accepted' || b.payment_status === 'paid')
                .reduce((sum, b) => sum + parseFloat(b.amount_total || 0), 0);

            setStats({ today: lessonsToday, week: bookingData.filter(b => b.status === 'accepted').length, pending, earnings: weekEarnings });
        }
        setLoading(false);
    }

    const handleAcceptBooking = async (e, bookingId) => {
        e.preventDefault(); // Prevents the Link from triggering
        const { error } = await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId);
        if (error) alert(error.message);
        fetchDashboardData();
    };

    // Helper: Check if lesson is past
    const isPastLesson = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return false;
        return new Date(`${dateStr}T${timeStr}`) < new Date();
    };

    // Filter Logic
    const upcoming = bookings.filter(b => b.status === 'accepted' && !isPastLesson(b.session_date, b.start_time));
    const past = bookings.filter(b => b.status === 'accepted' && isPastLesson(b.session_date, b.start_time)).reverse();
    const pending = bookings.filter(b => b.status === 'requested');
    const reschedules = bookings.filter(b => !!b.reschedule_new_date);
    const cancelled = bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected');

    const displayBookings = 
        activeTab === 'upcoming' ? upcoming :
        activeTab === 'past' ? past :
        activeTab === 'pending' ? pending :
        activeTab === 'reschedule' ? reschedules : cancelled;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome back, {firstName}!</h1>
                    <p className="text-gray-500 mt-1 font-medium">Your tutoring command center</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={<CalendarIcon />} value={stats.week} label="Lessons This Week" />
                <StatCard icon={<ClockIcon />} value={stats.today} label="Today" />
                <StatCard icon={<BookIcon />} value={stats.pending} label="Pending Requests" />
                <StatCard icon={<DollarIcon />} value={`$${stats.earnings}`} label="Est. Earnings" />
            </div>

            {!isGoogleConnected && (
                <div className="bg-[#2563eb] text-white rounded-3xl p-8 shadow-xl flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black mb-1">Google Calendar Disconnected</h2>
                        <p className="text-blue-100 opacity-80">Sync your lessons to your personal calendar</p>
                    </div>
                    <button onClick={() => window.location.href = "/api/google/oauth/start"} className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-black hover:bg-blue-50 transition-all">Connect</button>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex px-8 pt-6 border-b border-gray-100 gap-8 overflow-x-auto no-scrollbar">
                    <TabBtn label="Upcoming" count={upcoming.length} active={activeTab === 'upcoming'} onClick={() => setActiveTab('upcoming')} />
                    <TabBtn label="Past Bookings" active={activeTab === 'past'} onClick={() => setActiveTab('past')} />
                    <TabBtn label="Pending" count={pending.length} active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} />
                    <TabBtn label="Reschedules" count={reschedules.length} active={activeTab === 'reschedule'} onClick={() => setActiveTab('reschedule')} />
                    <TabBtn label="Cancelled" active={activeTab === 'cancelled'} onClick={() => setActiveTab('cancelled')} />
                </div>

                <div className="divide-y divide-gray-50 min-h-[300px]">
                    {displayBookings.length === 0 ? (
                        <div className="p-20 text-center text-gray-400 font-bold">No lessons found in this section.</div>
                    ) : (
                        displayBookings.map(b => (
                            <Link key={b.id} href={`/bookings/${b.id}`} className="block group">
                                <div className="p-8 flex justify-between items-center hover:bg-gray-50/50 transition-all">
                                    <div className="space-y-1">
                                        <h3 className="font-black text-xl text-gray-900 group-hover:text-[#24985b] transition-colors">{b.subject}</h3>
                                        <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                                            <span className="flex items-center gap-1.5"><UserIcon /> {b.students?.full_name}</span>
                                            <span className="text-[#24985b]">📅 {new Date(b.session_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} @ {formatTime(b.start_time)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        {activeTab === 'pending' && (
                                            <button 
                                                onClick={(e) => handleAcceptBooking(e, b.id)}
                                                className="bg-[#24985b] text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-[#24985b]/20"
                                            >
                                                Quick Accept
                                            </button>
                                        )}
                                        <svg className="w-6 h-6 text-gray-200 group-hover:text-[#24985b] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function TabBtn({ label, active, onClick, count }) {
    return (
        <button onClick={onClick} className={`pb-4 text-base font-black transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'text-gray-900 border-b-4 border-[#24985b]' : 'text-gray-400 hover:text-gray-600'}`}>
            {label} {count > 0 && <span className="bg-emerald-100 text-[#24985b] px-2 py-0.5 rounded-lg text-[10px]">{count}</span>}
        </button>
    );
}

function StatCard({ icon, value, label }) {
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="text-[#24985b] mb-4 opacity-40">{icon}</div>
            <div className="text-3xl font-black text-gray-900">{value}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</div>
        </div>
    );
}

function formatTime(t) {
    if (!t) return '';
    let [h, m] = t.split(':');
    let hours = parseInt(h);
    return `${((hours + 11) % 12 + 1)}:${m} ${hours >= 12 ? 'PM' : 'AM'}`;
}

// Icons
const CalendarIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ClockIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const BookIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>;
const DollarIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /></svg>;
const UserIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;