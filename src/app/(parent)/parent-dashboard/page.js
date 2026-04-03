'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Link from 'next/link';

export default function ParentDashboard() {
    const [firstName, setFirstName] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ upcoming: 0, week: 0, owed: 0, students: 0 });
    const [nextLesson, setNextLesson] = useState(null);
    const [upcoming, setUpcoming] = useState([]);

    const [selectedBooking, setSelectedBooking] = useState(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [showRescheduleInput, setShowRescheduleInput] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [rescheduleText, setRescheduleText] = useState('');

    const [payingBookingId, setPayingBookingId] = useState(null);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [showBankDetails, setShowBankDetails] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [bankReference, setBankReference] = useState('');

    const handleCopyAllDetails = async () => {
        try {
            await navigator.clipboard.writeText(`DarshaTutor\n12-3027-0030406-01`);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('booking') === 'bank_transfer_pending') {
            setBankReference(params.get('ref') || 'Lesson Fee');
            setShowBankDetails(true);
            window.history.replaceState(null, '', '/parent-dashboard');
        }
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile) setFirstName(profile.full_name?.split(' ')[0] || 'Parent');

        const { count: studentCount } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('parent_id', user.id);

        const { data: bookingData, error } = await supabase
            .from('bookings')
            .select('*, students(full_name), tutors(display_name, profiles(full_name))')
            .eq('parent_id', user.id)
            .order('session_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) console.error("Fetch Error:", error.message);

        if (bookingData) {
            const todayStr = new Date().toISOString().split('T')[0];

            const futureBookings = bookingData.filter(b => b.session_date >= todayStr && b.status !== 'declined' && b.status !== 'cancelled');
            setUpcoming(futureBookings);

            const now = new Date();
            const dayOfWeek = now.getDay();
            const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - dayOfWeek);
            const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + (6 - dayOfWeek));

            const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const startYMD = toYMD(startOfWeek);
            const endYMD = toYMD(endOfWeek);

            const lessonsThisWeek = futureBookings.filter(b => b.session_date >= startYMD && b.session_date <= endYMD).length;

            const amountOwed = futureBookings
                .filter(b => b.payment_status === 'unpaid')
                .reduce((sum, b) => sum + Number(b.amount_total || 0), 0);

            setStats({
                upcoming: futureBookings.length,
                week: lessonsThisWeek,
                owed: amountOwed,
                students: studentCount || 0
            });

            if (futureBookings.length > 0) {
                setNextLesson(futureBookings[0]);
            } else {
                setNextLesson(null);
            }
        }

        setLoading(false);
    }

    const handlePayNow = async (bookingId) => {
        setPayingBookingId(bookingId);
        try {
            const response = await fetch(`/api/poli/initiate?bookingId=${bookingId}`);
            const result = await response.json();

            if (result.url) {
                window.location.assign(result.url);
            } else {
                showToast(result.error || "Failed to get payment URL", "error");
                setPayingBookingId(null);
            }
        } catch (error) {
            console.error("Payment Error:", error);
            showToast("An unexpected error occurred.", "error");
            setPayingBookingId(null);
        }
    };

    const handleCancelBooking = async () => {
        setIsProcessing(true);
        const { error } = await supabase
            .from('bookings')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            })
            .eq('id', selectedBooking.id);

        if (!error) {
            fetch('/api/email/booking-cancelled', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: selectedBooking.id })
            }).catch(e => console.error(e));

            setSelectedBooking(null);
            setShowCancelConfirm(false);
            fetchDashboardData();
            showToast("Booking cancelled successfully.");
        } else {
            showToast("Error cancelling booking.", "error");
        }
        setIsProcessing(false);
    };

    const handleRequestReschedule = async () => {
        if (!rescheduleText.trim()) {
            showToast("Please enter a new proposed time or message.", "error");
            return;
        }

        setIsProcessing(true);
        const { error } = await supabase
            .from('bookings')
            .update({
                reschedule_status: 'pending',
                reschedule_requested_by: 'parent',
                reschedule_requested_at: new Date().toISOString(),
                reschedule_message: rescheduleText
            })
            .eq('id', selectedBooking.id);

        if (!error) {
            setSelectedBooking(null);
            setShowRescheduleInput(false);
            setRescheduleText('');
            fetchDashboardData();
            showToast("Reschedule request sent to the tutor!");
        } else {
            console.error(error);
            showToast("Error requesting reschedule.", "error");
        }
        setIsProcessing(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    const openModal = (booking) => {
        setSelectedBooking(booking);
        setShowRescheduleInput(false);
        setShowCancelConfirm(false);
    };

    if (loading) return <div className="p-8 text-gray-500 font-medium animate-pulse">Loading dashboard...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 relative">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Welcome back, {firstName}!</h1>
                <p className="text-gray-500 mt-1 md:mt-2 text-sm md:text-base font-medium">Here's what's happening with your lessons</p>
            </div>

            {/* 🚀 UPGRADED: Larger text inside StatCards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                <StatCard icon={<CalendarIcon />} value={stats.upcoming} label="Upcoming Lessons" />
                <StatCard icon={<ClockIcon />} value={stats.week} label="This Week" />
                <StatCard icon={<DollarIcon />} value={`$${stats.owed}`} label="Amount Due" />
                <StatCard icon={<UsersIcon />} value={stats.students} label="Active Students" />
            </div>

            {nextLesson ? (
                <div className="bg-[#24985b] text-white rounded-2xl md:rounded-[2rem] p-6 md:p-8 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-3">
                        <p className="font-bold text-emerald-100 text-sm md:text-base tracking-wide">Next Lesson</p>
                        <span className="bg-emerald-500/40 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm capitalize">
                            {nextLesson.status === 'pending' ? 'requested' : nextLesson.status}
                        </span>
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold">{nextLesson.subject} with {nextLesson.tutors?.display_name || nextLesson.tutors?.profiles?.full_name || 'Tutor'}</h2>
                    <p className="text-emerald-100 text-sm md:text-base mt-1">{nextLesson.students?.full_name} • {nextLesson.duration} mins</p>

                    <div className="flex items-center gap-5 mt-5 text-sm md:text-base font-medium text-emerald-50">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 opacity-80" />
                            {new Date(nextLesson.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 opacity-80" />
                            {nextLesson.start_time}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 md:mt-8 relative z-10">
                        <button
                            onClick={() => openModal(nextLesson)}
                            className="flex-1 bg-white text-[#24985b] py-3.5 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-base font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            View Details
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-[#24985b] text-white rounded-2xl md:rounded-[2rem] p-8 shadow-md text-center">
                    <h2 className="text-xl md:text-2xl font-bold mb-2">No upcoming lessons</h2>
                    <p className="text-emerald-100 text-sm md:text-base mb-6">You are all caught up! Ready to book your next session?</p>
                    <Link href="/book" className="bg-white text-[#24985b] px-8 py-3.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 inline-block">
                        Book a Lesson
                    </Link>
                </div>
            )}

            <div className="bg-white rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
                <div className="p-5 md:p-6 border-b border-gray-50 flex justify-between items-center">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800">Upcoming Bookings</h2>
                    <Link href="/book" className="text-[#24985b] text-sm font-bold flex items-center gap-1 hover:underline">
                        Book New <span className="hidden md:inline">Lesson</span> <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>

                <div className="divide-y divide-gray-50">
                    {upcoming.length === 0 ? (
                        <div className="p-8 text-center text-sm md:text-base text-gray-400 font-medium">No active bookings found.</div>
                    ) : (
                        upcoming.map((booking) => (
                            <div
                                key={booking.id}
                                onClick={() => openModal(booking)}
                                className="p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 hover:bg-gray-50/50 transition-colors cursor-pointer"
                            >
                                {/* 🚀 UPGRADED: Larger text for list items */}
                                <div className="w-full md:w-auto">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-gray-900 text-base md:text-lg">{booking.subject} <span className="text-gray-500 font-medium">with {booking.tutors?.display_name || booking.tutors?.profiles?.full_name || 'Tutor'}</span></h3>
                                        <div className="md:hidden mt-0.5">
                                            <StatusBadge status={booking.status} />
                                        </div>
                                    </div>
                                    <p className="text-gray-600 text-sm mt-1.5 mb-2">{booking.students?.full_name} • {booking.duration} mins</p>
                                    <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                                        <span className="flex items-center gap-1.5">
                                            <CalendarIcon className="w-4 h-4" />
                                            {new Date(booking.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <ClockIcon className="w-4 h-4" />
                                            {booking.start_time}
                                        </span>
                                        <span className="text-gray-900 font-black">${booking.amount_total}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0" onClick={e => e.stopPropagation()}>
                                    <div className="hidden md:block">
                                        {booking.reschedule_status === 'pending' ? (
                                            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200">Reschedule Pending</span>
                                        ) : (
                                            <StatusBadge status={booking.status} />
                                        )}
                                    </div>

                                    {booking.payment_status === 'unpaid' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePayNow(booking.id); }}
                                            disabled={payingBookingId === booking.id}
                                            className="w-full md:w-auto bg-[#24985b] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#1d824d] shadow-sm transition-colors disabled:opacity-50"
                                        >
                                            {payingBookingId === booking.id ? 'Redirecting...' : `Pay $${booking.amount_total}`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedBooking && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedBooking(null)}
                >
                    <div
                        className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 pt-6 pb-4 flex justify-between items-center shrink-0 border-b border-gray-50/50 mb-2">
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Dashboard
                            </button>

                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="hidden md:flex p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-3 mt-4">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">{selectedBooking.subject} Lesson</h2>
                                    <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">with {selectedBooking.tutors?.display_name || selectedBooking.tutors?.profiles?.full_name || 'Tutor'}</p>
                                </div>
                                <StatusBadge status={selectedBooking.status} />
                            </div>

                            {selectedBooking.reschedule_status === 'pending' && (
                                <div className="mb-8 p-5 bg-blue-50 border border-blue-100 rounded-xl text-blue-800">
                                    <p className="font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <ClockIcon className="w-5 h-5" /> Reschedule Requested
                                    </p>
                                    <p className="text-sm font-medium italic">"{selectedBooking.reschedule_message}"</p>
                                    <p className="text-xs opacity-70 mt-3">Waiting for the tutor to review and confirm the new time.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-y-6 md:gap-y-8 gap-x-6 md:gap-x-12 mb-10">
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 md:gap-2 mb-1">
                                        <CalendarIcon className="w-4 h-4" /> Date
                                    </p>
                                    <p className="font-bold text-sm md:text-base text-gray-900">{formatDate(selectedBooking.session_date)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 md:gap-2 mb-1">
                                        <UsersIcon className="w-4 h-4" /> Student
                                    </p>
                                    <p className="font-bold text-sm md:text-base text-gray-900">{selectedBooking.students?.full_name}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 md:gap-2 mb-1">
                                        <ClockIcon className="w-4 h-4" /> Time
                                    </p>
                                    <p className="font-bold text-sm md:text-base text-gray-900">{selectedBooking.start_time} <span className="text-gray-500 font-medium text-xs md:text-sm">({selectedBooking.duration}m)</span></p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 md:gap-2 mb-1">
                                        <DollarIcon className="w-4 h-4" /> Amount
                                    </p>
                                    <p className="font-bold text-sm md:text-base text-gray-900">${selectedBooking.amount_total}.00</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 md:gap-2 mb-1">
                                        <LocationIcon className="w-4 h-4" /> Type
                                    </p>
                                    <p className="font-bold text-sm md:text-base text-gray-900 capitalize">{selectedBooking.lesson_mode?.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 md:gap-2 mb-1">
                                        <CreditCardIcon className="w-4 h-4" /> Payment
                                    </p>
                                    <p className={`font-bold text-sm md:text-base ${selectedBooking.payment_status === 'paid' ? 'text-[#24985b]' : 'text-orange-500'}`}>
                                        {selectedBooking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-10 p-6 bg-gray-50 border border-gray-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-12 h-12 bg-[#eaf6ef] text-[#24985b] rounded-full flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                                        {(selectedBooking.tutors?.display_name || selectedBooking.tutors?.profiles?.full_name || 'D')[0]}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your Tutor</p>
                                        <p className="font-bold text-gray-900">{selectedBooking.tutors?.display_name || selectedBooking.tutors?.profiles?.full_name || 'Darsha'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 w-full md:w-auto">
                                    <a
                                        href={`mailto:darshatutor@gmail.com?subject=Regarding our lesson on ${new Date(selectedBooking.session_date).toLocaleDateString()}`}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:text-[#24985b] hover:border-[#24985b] px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        Email
                                    </a>

                                    <a
                                        href="tel:+64272341544"
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#24985b] hover:bg-[#1d824d] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-[#24985b]/20"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        Text
                                    </a>
                                </div>
                            </div>

                            <div className="mb-10">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Booking Timeline</h3>
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">

                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-[#24985b] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <CheckIcon className="w-3 h-3" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-gray-50 shadow-sm">
                                            <h4 className="font-bold text-gray-900 text-sm">Booking Requested</h4>
                                            <span className="text-xs font-medium text-gray-500">{formatDateTime(selectedBooking.created_at)}</span>
                                        </div>
                                    </div>

                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${selectedBooking.status === 'confirmed' || selectedBooking.status === 'completed' || selectedBooking.status === 'accepted' ? 'bg-[#24985b]' : 'bg-gray-300'}`}>
                                            {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'completed' || selectedBooking.status === 'accepted') && <CheckIcon className="w-3 h-3" />}
                                        </div>
                                        <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border ${selectedBooking.status === 'confirmed' || selectedBooking.status === 'completed' || selectedBooking.status === 'accepted' ? 'border-gray-100 bg-gray-50 shadow-sm' : 'border-dashed border-gray-200 bg-transparent opacity-50'}`}>
                                            <h4 className="font-bold text-gray-900 text-sm">Confirmed by Tutor</h4>
                                            {selectedBooking.status === 'confirmed' || selectedBooking.status === 'completed' || selectedBooking.status === 'accepted' ?
                                                <span className="text-xs font-medium text-[#24985b]">Confirmed</span> :
                                                <span className="text-xs font-medium text-gray-500">Pending</span>
                                            }
                                        </div>
                                    </div>

                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${selectedBooking.payment_status === 'paid' ? 'bg-[#24985b]' : 'bg-gray-300'}`}>
                                            {selectedBooking.payment_status === 'paid' && <CheckIcon className="w-3 h-3" />}
                                        </div>
                                        <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border ${selectedBooking.payment_status === 'paid' ? 'border-gray-100 bg-gray-50 shadow-sm' : 'border-dashed border-gray-200 bg-transparent opacity-50'}`}>
                                            <h4 className="font-bold text-gray-900 text-sm">Payment Received</h4>
                                            <span className={`text-xs font-medium ${selectedBooking.payment_status === 'paid' ? 'text-gray-500' : 'text-orange-400'}`}>
                                                {selectedBooking.payment_status === 'paid' ? 'Paid via POLi' : 'Awaiting Payment'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {showCancelConfirm ? (
                                <div className="pt-6 border-t border-gray-100 animate-in slide-in-from-bottom-2">
                                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 border border-red-100">
                                        <p className="text-sm font-bold flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Are you sure?
                                        </p>
                                        <p className="text-xs mt-1 font-medium opacity-90">Cancelling this booking cannot be undone. If you've already paid, please contact the tutor regarding a refund.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">No, keep it</button>
                                        <button onClick={handleCancelBooking} disabled={isProcessing} className="flex-[2] bg-red-500 text-white py-3.5 text-sm rounded-xl font-bold shadow-sm hover:bg-red-600 transition-colors disabled:opacity-50">
                                            {isProcessing ? 'Cancelling...' : 'Yes, cancel'}
                                        </button>
                                    </div>
                                </div>
                            ) : showRescheduleInput ? (
                                <div className="pt-6 border-t border-gray-100 animate-in slide-in-from-bottom-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Propose a new time</label>
                                    <textarea
                                        value={rescheduleText}
                                        onChange={(e) => setRescheduleText(e.target.value)}
                                        placeholder="E.g., Could we move this to Tuesday?"
                                        className="w-full border border-gray-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#24985b]/20 outline-none mb-4"
                                        rows="3"
                                    />
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowRescheduleInput(false)} className="flex-1 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                                        <button onClick={handleRequestReschedule} disabled={isProcessing} className="flex-[2] bg-[#24985b] text-white py-3.5 text-sm rounded-xl font-bold shadow-sm hover:bg-[#1d824d] transition-colors disabled:opacity-50">
                                            {isProcessing ? 'Sending...' : 'Send Request'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 border-t border-gray-100">
                                    <button
                                        onClick={() => { setShowCancelConfirm(false); setShowRescheduleInput(true); }}
                                        disabled={selectedBooking.reschedule_status === 'pending'}
                                        className="w-full md:flex-1 bg-[#24985b] text-white py-4 rounded-xl md:rounded-2xl text-sm font-bold shadow-sm hover:bg-[#1d824d] transition-colors disabled:opacity-50"
                                    >
                                        {selectedBooking.reschedule_status === 'pending' ? 'Reschedule Pending' : 'Request Reschedule'}
                                    </button>
                                    <button
                                        onClick={() => { setShowRescheduleInput(false); setShowCancelConfirm(true); }}
                                        className="w-full md:flex-1 bg-white text-red-500 py-4 rounded-xl md:rounded-2xl text-sm font-bold border-2 border-red-50 hover:bg-red-50 transition-colors"
                                    >
                                        Cancel Booking
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast.show && (
                <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className={`px-6 py-4 rounded-full shadow-xl flex items-center gap-3 font-bold text-sm tracking-wide ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
                        {toast.type === 'success' ? (
                            <div className="bg-[#24985b] rounded-full p-0.5"><CheckIcon className="w-4 h-4 text-white" /></div>
                        ) : (
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        {toast.message}
                    </div>
                </div>
            )}

            {showBankDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                        </div>
                        <h2 className="text-2xl font-black mb-2 text-gray-900">Booking Confirmed!</h2>
                        <p className="text-gray-500 mb-6 text-sm font-medium">To complete your booking, please transfer the funds using your banking app.</p>

                        <div className="bg-gray-50 rounded-3xl p-6 mb-8 text-left border border-gray-100">
                            <div className="mb-5">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Account Name</p>
                                <p className="font-bold text-lg text-gray-900 tracking-wider">DarshaTutor</p>
                            </div>

                            <div className="mb-6">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Account Number</p>
                                <p className="font-mono font-black text-xl text-gray-900 tracking-wider">12-3027-0030406-01</p>
                            </div>

                            <button
                                onClick={handleCopyAllDetails}
                                className={`w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mb-6 ${isCopied
                                    ? 'bg-[#eaf6ef] text-[#24985b] border-2 border-[#24985b]/20'
                                    : 'bg-white border-2 border-purple-100 text-purple-600 hover:bg-purple-50 hover:border-purple-200 shadow-sm'
                                    }`}
                            >
                                {isCopied ? (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        Copied to Clipboard!
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        Copy Bank Details
                                    </>
                                )}
                            </button>

                            <div className="pt-5 border-t border-gray-200">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reference (Important)</p>
                                <p className="font-black text-purple-600 text-lg">{bankReference}</p>
                                <p className="text-[11px] text-gray-400 tracking-widest mb-1">(Also located in Students Page if you lose it)</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowBankDetails(false)}
                            className="w-full bg-[#24985b] text-white py-4 rounded-xl text-base font-bold hover:bg-[#1d824d] transition-all shadow-lg shadow-[#24985b]/20"
                        >
                            I understand
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// 🚀 UPGRADED: Scaled up font sizes and removed the aggressive icon scaling
function StatCard({ icon, value, label }) {
    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div className="text-[#24985b] mb-2 md:mb-4">{icon}</div>
            <div className="text-3xl font-black text-gray-900">{value}</div>
            <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const displayStatus = status === 'pending' ? 'requested' : status;
    const styles = {
        confirmed: "bg-[#eaf6ef] text-[#24985b] border-[#24985b]/20",
        requested: "bg-yellow-50 text-yellow-700 border-yellow-200",
        completed: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return (
        <span className={`px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider border ${styles[displayStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {displayStatus}
        </span>
    );
}

function CalendarIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function ClockIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function DollarIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function UsersIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>; }
function LocationIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function CreditCardIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>; }
function CheckIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>; }