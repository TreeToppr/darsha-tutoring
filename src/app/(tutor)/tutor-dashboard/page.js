'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // 🚀 ADDED: To handle programmatic navigation

export default function TutorDashboard() {
    const router = useRouter(); // 🚀 ADDED
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

        const { data: bookingData } = await supabase
            .from('bookings')
            .select('*, meet_link, students(*)')
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
        e.stopPropagation(); // 🚀 Ensure clicking this doesn't navigate to the details page
        const { error } = await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId);
        if (error) alert(error.message);
        fetchDashboardData();
    };

    const isPastLesson = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return false;
        return new Date(`${dateStr}T${timeStr}`) < new Date();
    };

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
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome back, {firstName}!</h1>
                    <p className="text-gray-500 mt-1 font-medium">Your tutoring command center</p>
                </div>
            </div>

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
                            // 🚀 FIXED: Swapped <Link> for a clickable <div> to prevent <a> inside <a> errors
                            <div
                                key={b.id}
                                onClick={() => router.push(`/bookings/${b.id}`)}
                                className="block group cursor-pointer"
                            >
                                <div className="p-8 flex justify-between items-center hover:bg-gray-50/50 transition-all">
                                    <div className="space-y-1">
                                        <h3 className="font-black text-xl text-gray-900 group-hover:text-[#24985b] transition-colors">{b.subject}</h3>
                                        <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                                            <span className="flex items-center gap-1.5"><UserIcon /> {b.students?.full_name}</span>
                                            <span className="text-[#24985b]">📅 {new Date(b.session_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} @ {formatTime(b.start_time)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* 📍 IN-PERSON MAPS BUTTON */}
                                        {(b.lesson_mode === 'in_person' || b.lesson_mode === 'in-person') && activeTab !== 'cancelled' ? (
                                            <a
                                                href={b.booking_address_text ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.booking_address_text)}` : '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Stops the row from opening the details page
                                                    if (!b.booking_address_text) {
                                                        e.preventDefault();
                                                        alert('No address was provided for this booking.');
                                                    }
                                                }}
                                                title={b.booking_address_text || 'Address pending'}
                                                className="bg-[#24985b] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1d824d] shadow-sm transition-colors flex items-center gap-2 max-w-[200px]"
                                            >
                                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="truncate">
                                                    {b.booking_address_text ? b.booking_address_text.split(',')[0] : 'Map'}
                                                </span>
                                            </a>
                                        ) : 
                                        /* 💻 ONLINE MEET BUTTON */
                                        b.meet_link && activeTab !== 'cancelled' ? (
                                            <a
                                                href={b.meet_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-[#4285F4] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#3367D6] shadow-sm transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Join
                                            </a>
                                        ) : null}

                                        {/* QUICK ACCEPT BUTTON */}

                                        {activeTab === 'pending' && (
                                            <button
                                                onClick={(e) => handleAcceptBooking(e, b.id)}
                                                className="bg-[#24985b] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg shadow-[#24985b]/20"
                                            >
                                                Quick Accept
                                            </button>
                                        )}
                                        <svg className="w-6 h-6 text-gray-200 group-hover:text-[#24985b] group-hover:translate-x-1 transition-all hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                            </div>
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

const CalendarIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ClockIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const BookIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>;
const DollarIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /></svg>;
const UserIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;