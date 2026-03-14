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
    const [selectedBooking, setSelectedBooking] = useState(null);

    const [isRescheduling, setIsRescheduling] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('sync') === 'success') {
            fetchDashboardData();
        }
    }, []);

    useEffect(() => { fetchDashboardData(); }, []);

    async function fetchDashboardData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            setFirstName(profile.full_name?.split(' ')[0] || 'Tutor');
            const hasToken = profile.google_refresh_token && profile.google_refresh_token.length > 0;
            setIsGoogleConnected(!!hasToken);
        }

        const { data: tutorRecord } = await supabase
            .from('tutors')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (!tutorRecord) {
            setLoading(false);
            return;
        }

        const { data: bookingData, error: fetchError } = await supabase
            .from('bookings')
            .select('*, students(*), parent:profiles!parent_id(full_name)')
            .eq('tutor_id', tutorRecord.id)
            .order('session_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (fetchError) {
            console.error("Dashboard Fetch Error:", fetchError);
        }

        if (bookingData) {
            setBookings(bookingData);
            const now = new Date().toISOString().split('T')[0];

            const isReschedule = (b) => b.reschedule_status === 'requested' || b.reschedule_status === 'pending' || !!b.reschedule_new_date;

            const lessonsToday = bookingData.filter(b => b.session_date === now && b.status === 'accepted').length;
            const pending = bookingData.filter(b => b.status === 'requested' && !isReschedule(b)).length;

            const weekEarnings = bookingData
                .filter(b => b.status === 'accepted' || b.payment_status === 'paid')
                .reduce((sum, b) => sum + parseFloat(b.amount_total || 0), 0);

            setStats({ today: lessonsToday, week: bookingData.filter(b => b.status === 'accepted').length, pending, earnings: weekEarnings });
        }
        setLoading(false);
    }

    const handleAcceptBooking = async (booking) => {
        let updateData = { status: 'accepted' };

        const isReschedule = booking.reschedule_status === 'requested' || booking.reschedule_status === 'pending' || !!booking.reschedule_new_date;

        if (isReschedule) {
            updateData = {
                ...updateData,
                session_date: booking.reschedule_new_date || booking.session_date,
                start_time: booking.reschedule_new_start_time || booking.start_time,
                end_time: booking.reschedule_new_end_time || booking.end_time,
                reschedule_status: null,
                reschedule_new_date: null,
                reschedule_new_start_time: null,
                reschedule_new_end_time: null,
                reschedule_message: null
            };
        }

        const { error } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', booking.id);

        if (error) {
            alert("Failed to update: " + error.message);
            return;
        }

        fetchDashboardData();
        setSelectedBooking(null);
    };

    // 🚀 NEW: Function to open the picker and pre-fill the inputs!
    const handleOpenReschedulePicker = () => {
        if (!selectedBooking) return;

        // Pre-fill with the Parent's requested date, or fallback to the current lesson date
        setNewDate(selectedBooking.reschedule_new_date || selectedBooking.session_date || '');

        // Pre-fill with the Parent's requested time, or fallback to the current lesson time
        setNewTime(selectedBooking.reschedule_new_start_time || selectedBooking.start_time || '');

        setIsRescheduling(true);
    };

    const handleTutorManualReschedule = async () => {
        if (!newDate || !newTime) {
            alert("Please pick both a new date and time.");
            return;
        }

        let [hours, minutes] = newTime.split(':').map(Number);
        let duration = selectedBooking.duration || 60;
        let totalMins = (hours * 60) + minutes + duration;
        let endHours = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
        let endMins = String(totalMins % 60).padStart(2, '0');
        let newEndTime = `${endHours}:${endMins}`;

        const { error } = await supabase
            .from('bookings')
            .update({
                session_date: newDate,
                start_time: newTime,
                end_time: newEndTime,
                status: 'accepted',
                reschedule_status: null,
                reschedule_new_date: null,
                reschedule_new_start_time: null,
                reschedule_new_end_time: null,
                reschedule_message: null
            })
            .eq('id', selectedBooking.id);

        if (error) {
            alert("Failed to move lesson: " + error.message);
        } else {
            fetchDashboardData();
            setSelectedBooking(null);
            setIsRescheduling(false);
        }
    };

    const handleRejectBooking = async (bookingId) => {
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'rejected', reschedule_status: null })
            .eq('id', bookingId);

        if (error) alert(error.message);
        fetchDashboardData();
        setSelectedBooking(null);
    };

    const formatBeautifulDate = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return '';
        const date = new Date(dateStr);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        const dayName = days[date.getDay()];
        const monthName = months[date.getMonth()];
        const d = date.getDate();
        const ordinal = d > 3 && d < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][d % 10];
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${dayName} ${d}${ordinal} ${monthName} AT ${hours}:${minutes}${ampm}`;
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(val);

    const isReschedule = (b) => b.reschedule_status === 'requested' || b.reschedule_status === 'pending' || !!b.reschedule_new_date;

    const upcomingBookings = bookings.filter(b => (b.status === 'accepted' || b.status === 'completed') && !isReschedule(b));
    const rescheduleBookings = bookings.filter(b => isReschedule(b));
    const pendingBookings = bookings.filter(b => b.status === 'requested' && !isReschedule(b));
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected');

    const displayBookings =
        activeTab === 'upcoming' ? upcomingBookings :
            activeTab === 'pending' ? pendingBookings :
                activeTab === 'reschedule' ? rescheduleBookings :
                    cancelledBookings;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 relative">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome back, {firstName}!</h1>
                <p className="text-gray-500 mt-1 font-medium">Here's your schedule for today</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={<CalendarIcon />} value={stats.week} label="This Week" />
                <StatCard icon={<ClockIcon />} value={stats.today} label="Today" />
                <StatCard icon={<BookIcon />} value={stats.pending} label="Pending" />
                <StatCard icon={<DollarIcon />} value={`$${stats.earnings}`} label="This Week" />
            </div>

            {!isGoogleConnected && (
                <div className="bg-[#2563eb] text-white rounded-3xl p-8 shadow-xl shadow-blue-500/10 flex justify-between items-center animate-in slide-in-from-top-4">
                    <div>
                        <h2 className="text-xl font-black mb-1">Google Calendar</h2>
                        <p className="text-blue-100 font-medium opacity-80">Not connected • Sync your schedule to stay organized</p>
                    </div>
                    <button
                        onClick={() => window.location.href = "/api/google/oauth/start"}
                        className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-black hover:bg-blue-50 transition-all"
                    >
                        Connect Account
                    </button>
                </div>
            )}

            {/* Bookings List Section */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 pt-6 border-b border-gray-100 flex gap-8 overflow-x-auto custom-scrollbar whitespace-nowrap">
                    <button onClick={() => setActiveTab('upcoming')} className={`pb-4 text-sm md:text-base font-black transition-all ${activeTab === 'upcoming' ? 'text-gray-900 border-b-2 border-[#24985b]' : 'text-gray-400 hover:text-gray-600'}`}>Upcoming Lessons</button>
                    <button onClick={() => setActiveTab('pending')} className={`pb-4 text-sm md:text-base font-black transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'text-gray-900 border-b-2 border-[#24985b]' : 'text-gray-400 hover:text-gray-600'}`}>
                        Pending Requests
                        {pendingBookings.length > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] text-white ${activeTab === 'pending' ? 'bg-orange-500' : 'bg-orange-300'}`}>{pendingBookings.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('reschedule')} className={`pb-4 text-sm md:text-base font-black transition-all flex items-center gap-2 ${activeTab === 'reschedule' ? 'text-gray-900 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}>
                        Reschedules
                        {rescheduleBookings.length > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] text-white ${activeTab === 'reschedule' ? 'bg-blue-500' : 'bg-blue-300'}`}>{rescheduleBookings.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('cancelled')} className={`pb-4 text-sm md:text-base font-black transition-all ${activeTab === 'cancelled' ? 'text-gray-900 border-b-2 border-red-500' : 'text-gray-400 hover:text-gray-600'}`}>Cancelled</button>
                </div>

                <div className="divide-y divide-gray-50 min-h-[300px]">
                    {displayBookings.length === 0 ? (
                        <div className="p-16 text-center animate-in fade-in duration-300">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                {activeTab === 'upcoming' ? <CalendarIcon /> : activeTab === 'cancelled' ? <CloseIcon /> : <BookIcon />}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {activeTab === 'upcoming' ? "No upcoming lessons" : activeTab === 'pending' ? "You're all caught up!" : activeTab === 'reschedule' ? "No reschedule requests" : "No cancelled lessons"}
                            </h3>
                            <p className="text-gray-400 font-medium text-sm">
                                {activeTab === 'upcoming' ? "When you accept requests, they will appear here." : activeTab === 'pending' ? "You don't have any pending requests to review." : activeTab === 'reschedule' ? "Students haven't requested any changes." : "Everything is running smoothly."}
                            </p>
                        </div>
                    ) : (
                        displayBookings.map(b => {
                            const studentName = b.students?.first_name || b.students?.full_name || b.students?.name || b.students?.display_name || 'Student';
                            return (
                                <div
                                    key={b.id}
                                    onClick={() => {
                                        setSelectedBooking(b);
                                        setIsRescheduling(false);
                                        setNewDate('');
                                        setNewTime('');
                                    }}
                                    className="p-8 flex justify-between items-center hover:bg-gray-50/50 transition-all cursor-pointer group animate-in slide-in-from-bottom-2 duration-300"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-[#24985b] transition-colors">{b.subject}</h3>
                                            {isReschedule(b) && activeTab !== 'reschedule' && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600">Reschedule</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-400">
                                            <span className="flex items-center gap-1.5 text-gray-600"><UserIcon /> {studentName}</span>
                                            <span className={`flex items-center gap-1.5 uppercase tracking-tighter ${activeTab === 'cancelled' ? 'text-gray-400 line-through' : 'text-[#24985b]'}`}>
                                                📅 {formatBeautifulDate(b.session_date, b.start_time)}
                                            </span>
                                            {b.payment_status === 'paid' ? <span className="text-[#24985b] flex items-center gap-1">✓ Paid</span> : <span className="text-orange-500">Unpaid</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {activeTab === 'upcoming' && <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#eaf6ef] text-[#24985b]">Accepted</span>}
                                        {activeTab === 'cancelled' && <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500">{b.status}</span>}
                                        {(activeTab === 'pending' || activeTab === 'reschedule') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAcceptBooking(b); }}
                                                className="bg-[#24985b] text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-[#24985b]/20 hover:scale-105 transition-all"
                                            >
                                                Accept
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Booking Details Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-3xl my-auto shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 md:p-12">
                            <button onClick={() => setSelectedBooking(null)} className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-2 mb-8 transition-colors">
                                <ArrowLeftIcon className="w-4 h-4" /> Back to Dashboard
                            </button>

                            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-10">
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{selectedBooking.subject} Lesson</h2>
                                    <p className="text-gray-500 font-medium mt-2 text-lg">Student: {selectedBooking.students?.first_name || selectedBooking.students?.full_name || selectedBooking.students?.name || 'Student'}</p>
                                </div>
                                <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border ${selectedBooking.status === 'accepted' ? 'border-[#24985b] text-[#24985b] bg-[#eaf6ef]' : selectedBooking.status === 'cancelled' || selectedBooking.status === 'rejected' ? 'border-red-400 text-red-600 bg-red-50' : 'border-yellow-400 text-yellow-600 bg-yellow-50'}`}>
                                    {selectedBooking.status === 'accepted' ? 'Accepted' : selectedBooking.status}
                                </span>
                            </div>

                            {isReschedule(selectedBooking) && (
                                <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                                    <div className="mt-1 bg-white p-2 rounded-full text-blue-500 shadow-sm"><ClockIcon className="w-4 h-4" /></div>
                                    <div>
                                        <h4 className="font-bold text-blue-900 uppercase tracking-widest text-xs mb-3">Reschedule Requested</h4>
                                        {selectedBooking.reschedule_new_date && selectedBooking.reschedule_new_start_time && (
                                            <div className="bg-white/60 p-3 rounded-xl inline-block mb-3 border border-blue-100">
                                                <p className="font-black text-blue-900 text-sm flex items-center gap-2">
                                                    📅 Proposed Time: <span className="text-blue-600">{formatBeautifulDate(selectedBooking.reschedule_new_date, selectedBooking.reschedule_new_start_time).split(' AT ')[0]} at {formatTimeOnly(selectedBooking.reschedule_new_start_time)}</span>
                                                </p>
                                            </div>
                                        )}
                                        <p className="font-medium text-blue-800 italic leading-relaxed">"{selectedBooking.reschedule_message || 'Student requested a new time.'}"</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-y-8 gap-x-4 mb-12">
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><CalendarIcon className="w-4 h-4 opacity-50" /> Date</p>
                                    <p className="font-bold text-gray-900 text-lg">{formatBeautifulDate(selectedBooking.session_date, selectedBooking.start_time).split(' AT ')[0]}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><UserIcon className="w-4 h-4 opacity-50" /> Student</p>
                                    <p className="font-bold text-gray-900 text-lg">{selectedBooking.students?.first_name || selectedBooking.students?.full_name || 'Student'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><ClockIcon className="w-4 h-4 opacity-50" /> Time</p>
                                    <p className="font-bold text-gray-900 text-lg">{formatTimeOnly(selectedBooking.start_time)} <span className="text-gray-400 font-medium text-sm">({selectedBooking.duration || 60} mins)</span></p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><DollarIcon className="w-4 h-4 opacity-50" /> Amount</p>
                                    <p className="font-bold text-gray-900 text-lg">{formatCurrency(selectedBooking.amount_total)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><LocationIcon className="w-4 h-4 opacity-50" /> Type</p>
                                    <p className="font-bold text-gray-900 text-lg capitalize">{selectedBooking.lesson_mode === 'in_person' ? 'In Person' : 'Online'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><CreditCardIcon className="w-4 h-4 opacity-50" /> Payment</p>
                                    <p className={`font-bold text-lg capitalize ${selectedBooking.payment_status === 'paid' ? 'text-[#24985b]' : 'text-orange-500'}`}>{selectedBooking.payment_status}</p>
                                </div>
                            </div>

                            <div className="mb-12">
                                <h3 className="font-black text-gray-900 text-xl mb-8">Booking Timeline</h3>
                                <div className="relative border-l-2 md:border-l-0 md:flex md:flex-col md:items-center border-gray-100 ml-4 md:ml-0 space-y-8">
                                    <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-100 -translate-x-1/2"></div>
                                    <div className="relative w-full md:flex md:justify-end pl-8 md:pl-0">
                                        <div className="md:w-1/2 md:pl-10 flex relative">
                                            <div className="absolute -left-[45px] md:-left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#24985b] rounded-full flex items-center justify-center border-[6px] border-white z-10 shadow-sm"><CheckIcon className="w-3 h-3 text-white" /></div>
                                            <div className="bg-gray-50 p-5 rounded-3xl w-full border border-gray-100">
                                                <p className="font-bold text-gray-900">Booking Requested</p>
                                                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{new Date(selectedBooking.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative w-full md:flex md:justify-start pl-8 md:pl-0">
                                        <div className="md:w-1/2 md:pr-10 flex justify-end relative">
                                            <div className={`absolute -left-[45px] md:right-[-16px] md:left-auto top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-[6px] border-white z-10 shadow-sm ${selectedBooking.status === 'accepted' ? 'bg-[#24985b]' : selectedBooking.status === 'cancelled' || selectedBooking.status === 'rejected' ? 'bg-red-500' : 'bg-gray-200'}`}>
                                                {(selectedBooking.status === 'accepted' || selectedBooking.status === 'cancelled' || selectedBooking.status === 'rejected') && <CheckIcon className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                                            </div>
                                            <div className={`p-5 rounded-3xl w-full border ${selectedBooking.status === 'accepted' || selectedBooking.status === 'cancelled' || selectedBooking.status === 'rejected' ? 'bg-gray-50 border-gray-100' : 'bg-white border-dashed border-gray-200 opacity-60'}`}>
                                                <p className={`font-bold ${selectedBooking.status === 'cancelled' || selectedBooking.status === 'rejected' ? 'text-red-600' : 'text-gray-900'}`}>{selectedBooking.status === 'cancelled' ? 'Cancelled' : selectedBooking.status === 'rejected' ? 'Rejected by Tutor' : 'Accepted by Tutor'}</p>
                                                <p className="text-xs font-bold mt-1 uppercase tracking-widest text-gray-400">{selectedBooking.status === 'accepted' ? 'Accepted' : selectedBooking.status === 'cancelled' || selectedBooking.status === 'rejected' ? 'Closed' : 'Pending'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative w-full md:flex md:justify-end pl-8 md:pl-0">
                                        <div className="md:w-1/2 md:pl-10 flex relative">
                                            <div className={`absolute -left-[45px] md:-left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-[6px] border-white z-10 shadow-sm ${selectedBooking.payment_status === 'paid' ? 'bg-[#24985b]' : 'bg-gray-200'}`}>
                                                {selectedBooking.payment_status === 'paid' && <CheckIcon className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                                            </div>
                                            <div className={`p-5 rounded-3xl w-full border ${selectedBooking.payment_status === 'paid' ? 'bg-gray-50 border-gray-100' : 'bg-white border-dashed border-gray-200 opacity-60'}`}>
                                                <p className="font-bold text-gray-900">Payment Received</p>
                                                <p className={`text-xs font-bold mt-1 uppercase tracking-widest ${selectedBooking.payment_status === 'paid' ? 'text-gray-400' : 'text-orange-400'}`}>{selectedBooking.payment_status === 'paid' ? 'Paid' : 'Awaiting Payment'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons & Reschedule Date Picker */}
                            {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'rejected' && (
                                <div className="mt-8 pt-8 border-t border-gray-100">
                                    {isRescheduling ? (
                                        <div className="animate-in slide-in-from-bottom-2">
                                            <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                                                <CalendarIcon className="text-blue-500 w-5 h-5" /> Confirm Reschedule Details
                                            </h4>
                                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">New Date</label>
                                                    <input
                                                        type="date"
                                                        value={newDate}
                                                        onChange={e => setNewDate(e.target.value)}
                                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">New Time</label>
                                                    <input
                                                        type="time"
                                                        value={newTime}
                                                        onChange={e => setNewTime(e.target.value)}
                                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={handleTutorManualReschedule} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/30">
                                                    Confirm & Move Lesson
                                                </button>
                                                <button onClick={() => setIsRescheduling(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-500 hover:bg-gray-50 py-4 rounded-2xl font-bold transition-all">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            {/* Standard 1-Click Accept */}
                                            {(selectedBooking.status === 'requested' || isReschedule(selectedBooking)) && (
                                                <button
                                                    onClick={() => handleAcceptBooking(selectedBooking)}
                                                    className="flex-[2] bg-[#24985b] hover:bg-[#1d824d] text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-[#24985b]/20"
                                                >
                                                    Accept {isReschedule(selectedBooking) ? 'Proposed Time' : 'Booking'}
                                                </button>
                                            )}

                                            {/* 🚀 FIXED: Button now calls handleOpenReschedulePicker to pre-fill the inputs! */}
                                            <button
                                                onClick={handleOpenReschedulePicker}
                                                className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-4 rounded-2xl font-bold transition-all"
                                            >
                                                {isReschedule(selectedBooking) ? 'Edit & Accept' : 'Reschedule'}
                                            </button>

                                            <button
                                                onClick={() => handleRejectBooking(selectedBooking.id)}
                                                className="flex-1 bg-white border-2 border-red-50 text-red-500 hover:bg-red-50 hover:border-red-100 py-4 rounded-2xl font-bold transition-all"
                                            >
                                                {selectedBooking.status === 'accepted' && !isReschedule(selectedBooking) ? 'Cancel Lesson' : 'Decline'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, value, label }) {
    return (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="text-[#24985b] mb-4 opacity-50">{icon}</div>
            <div className="text-3xl font-black text-gray-900">{value}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</div>
        </div>
    );
}

const formatTimeOnly = (timeStr) => {
    if (!timeStr) return '';
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
};

function CalendarIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function ClockIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function BookIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>; }
function DollarIcon({ className = "w-6 h-6" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /></svg>; }
function UserIcon({ className = "w-4 h-4" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>; }
function LocationIcon({ className = "w-4 h-4" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function CreditCardIcon({ className = "w-4 h-4" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>; }
function ArrowLeftIcon({ className = "w-4 h-4" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>; }
function CheckIcon({ className = "w-3 h-3" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>; }
function CloseIcon({ className = "w-5 h-5" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>; }