'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const TIMES = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

// Helper for icons
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.5-1.632Z" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>;

export default function CalendarPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', date: '', start: '09:00', end: '10:00' });

    const [baseDate, setBaseDate] = useState(new Date());

    const handleSyncGoogle = async () => {
        // This is your private trigger for the calendar permissions
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/calendar.readonly',
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            }
        });

        if (error) {
            console.error("Sync Error:", error.message);
            alert("Failed to start Google Sync: " + error.message);
        }
    };

    const getWeekDates = (base) => {
        const dayOfWeek = base.getDay();
        const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const first = base.getDate() + distanceToMonday;

        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(base);
            d.setDate(first + i);
            const pad = (n) => String(n).padStart(2, '0');
            return {
                name: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()],
                num: d.getDate(),
                fullStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            };
        });
    };
    const weekDates = getWeekDates(baseDate);

    // 🚀 THE FIX: Get the local New Zealand date string to prevent the Friday/Saturday drift
    const getLocalTodayStr = () => {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    };
    const actualTodayStr = getLocalTodayStr();

    const nextWeek = () => setBaseDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
    const prevWeek = () => setBaseDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
    const nextMonth = () => setBaseDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, prev.getDate()));
    const prevMonth = () => setBaseDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, prev.getDate()));
    const goToToday = () => setBaseDate(new Date());

    const currentViewMonth = new Date(weekDates[3].fullStr).toLocaleString('default', { month: 'long', year: 'numeric' });

    useEffect(() => { fetchCalendar(); }, []);

    async function fetchCalendar() {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const { data: localData, error } = await supabase
            .from('bookings')
            .select('*, students(*)')
            .eq('tutor_id', user.id)
            .neq('status', 'declined');

        if (error) console.error("Local Fetch Error:", error.message);

        let combined = [...(localData || [])];

        if (session.provider_token) {
            try {
                // 🚀 THE FIX: We pass the live provider_token directly from the browser!
                const res = await fetch('/api/google/calendar/list', {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'x-google-token': session.provider_token || '' // Send the Google token
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.events) {
                        const googleEvents = data.events.map(g => {
                            const isAllDay = !g.start.dateTime;
                            let session_date, start_time, durationMinutes;

                            if (isAllDay) {
                                session_date = g.start.date;
                                start_time = "08:00";
                                durationMinutes = 60;
                            } else {
                                const startDate = new Date(g.start.dateTime);
                                const endDate = new Date(g.end.dateTime);
                                durationMinutes = (endDate - startDate) / (1000 * 60);
                                const pad = (n) => String(n).padStart(2, '0');
                                session_date = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
                                start_time = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
                            }

                            return {
                                id: g.id,
                                subject: g.summary || 'Google Event',
                                session_date,
                                start_time,
                                duration: durationMinutes,
                                is_personal: true,
                                is_external: true,
                                location: g.location
                            };
                        });

                        googleEvents.forEach(g => {
                            if (!combined.some(l => l.google_event_id === g.id)) combined.push(g);
                        });
                    }
                }
            } catch (e) {
                console.error("Network error fetching Google events:", e);
            }
        } else {
            console.log("Skipping Google Sync: Tutor not logged in via Google.");
        }

        setEvents(combined);
        setLoading(false);
    }

    const handleAddEvent = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const start = new Date(`${formData.date}T${formData.start}`);
        const end = new Date(`${formData.date}T${formData.end}`);
        const durationMins = (end - start) / (1000 * 60);

        const { data, error } = await supabase.from('bookings').insert({
            tutor_id: user.id,
            subject: formData.title,
            session_date: formData.date,
            start_time: formData.start,
            status: 'confirmed',
            is_personal: true,
            duration: durationMins > 0 ? durationMins : 60
        }).select().single();

        if (error) {
            alert("Error saving event: " + error.message);
        } else {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch('/api/google/calendar/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ bookingId: data.id })
            });
            setIsAddModalOpen(false);
            fetchCalendar();
        }
    };

    const openDetails = (event) => {
        setSelectedEvent(event);
        setIsDetailsModalOpen(true);
    };

    const formatModalDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (loading) return <div className="p-20 text-center font-black text-[#24985b] animate-pulse">Syncing Calendar...</div>;

    return (
        <div className="max-w-[1400px] mx-auto p-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <div className="flex items-center gap-6">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Schedule</h1>
                        <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm mt-2">
                            <button onClick={prevMonth} className="px-3 py-2 hover:bg-gray-50 rounded-lg font-bold text-gray-400 text-[10px] uppercase tracking-widest transition-all">&laquo; Mo</button>
                            <button onClick={prevWeek} className="px-3 py-2 hover:bg-gray-50 rounded-lg font-bold text-gray-400 text-[10px] uppercase tracking-widest transition-all">&lsaquo; Wk</button>
                            <button onClick={goToToday} className="px-4 py-2 bg-gray-50 rounded-lg font-black text-gray-900 text-[10px] uppercase tracking-widest shadow-sm mx-1 hover:bg-gray-100 transition-all">Today</button>
                            <button onClick={nextWeek} className="px-3 py-2 hover:bg-gray-50 rounded-lg font-bold text-gray-400 text-[10px] uppercase tracking-widest transition-all">Wk &rsaquo;</button>
                            <button onClick={nextMonth} className="px-3 py-2 hover:bg-gray-50 rounded-lg font-bold text-gray-400 text-[10px] uppercase tracking-widest transition-all">Mo &raquo;</button>
                        </div>
                    </div>
                    <p className="text-gray-500 mt-3 font-medium text-sm">
                        {currentViewMonth} • Synced with Google
                    </p>
                </div>
                <div className="flex gap-4">
                    {/* 🚀 NEW: Your private Sync Button */}
                    <button onClick={handleSyncGoogle} className="bg-white border-2 border-gray-100 text-gray-600 px-6 py-4 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                        Sync Google
                    </button>

                    <button onClick={() => setIsAddModalOpen(true)} className="bg-[#24985b] text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">
                        + Add Event
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-gray-50 bg-gray-50/30">
                    <div className="p-4"></div>
                    {weekDates.map(day => {
                        const isToday = day.fullStr === actualTodayStr;
                        return (
                            <div key={day.fullStr} className={`p-4 text-center ${isToday ? 'bg-blue-50/50' : ''}`}>
                                <p className={`font-black text-[10px] uppercase tracking-widest ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{day.name}</p>
                                <p className={`text-xl font-black mt-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{day.num}</p>
                            </div>
                        )
                    })}
                </div>

                <div className="grid grid-cols-[100px_repeat(7,1fr)] divide-x divide-gray-50 relative">
                    <div className="flex flex-col">
                        {TIMES.map(time => (
                            <div key={time} className="h-24 border-b border-gray-50 p-3 text-[10px] font-bold text-gray-300 text-right uppercase">
                                {time > 12 ? `${time - 12} PM` : `${time} AM`}
                            </div>
                        ))}
                    </div>

                    {weekDates.map((day) => {
                        const isToday = day.fullStr === actualTodayStr;
                        return (
                            <div key={day.fullStr} className={`flex flex-col relative h-full ${isToday ? 'bg-blue-50/20' : ''}`}>
                                {TIMES.map(time => <div key={time} className="h-24 border-b border-gray-50"></div>)}

                                {/* 🚀 FIX: Used .substring(0, 10) to strip hidden timestamps, ensuring dates match exactly */}
                                {events.filter(e => e.session_date?.substring(0, 10) === day.fullStr).map(event => {

                                    // 🚀 FIX: Prevent silent crashes if start_time is missing
                                    if (!event.start_time) return null;

                                    const [hourStr, minStr] = event.start_time.split(':');
                                    const startHour = parseInt(hourStr) + (parseInt(minStr || '0') / 60);

                                    // 🚀 FIX: Clamp the event so it doesn't render off the grid
                                    const constrainedHour = Math.max(8, Math.min(21, startHour));
                                    const topPos = (constrainedHour - 8) * 96;

                                    const eventDuration = event.duration || 60;
                                    const height = (eventDuration / 60) * 96;

                                    // 🚀 FIX: Now checks full_name for the student correctly
                                    const studentName = event.students?.full_name || event.students?.display_name || event.students?.name || '';

                                    const isTutoring = !event.is_personal || event.subject?.toLowerCase().includes('tutoring');

                                    let styleClasses = 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100';

                                    if (isTutoring) {
                                        if (event.status === 'pending') {
                                            styleClasses = 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100';
                                        } else {
                                            styleClasses = 'bg-[#eaf6ef] text-[#24985b] border border-[#24985b]/30 hover:bg-[#dcf2e6]';
                                        }
                                    }

                                    let modeText = '';
                                    if (isTutoring) {
                                        if (event.lesson_mode === 'in_person') modeText = `📍 ${event.location || 'In Person'}`;
                                        else modeText = '💻 Online';
                                    }

                                    return (
                                        <button
                                            key={event.id}
                                            onClick={() => openDetails(event)}
                                            style={{ top: `${topPos}px`, height: `${height}px` }}
                                            // 🚀 FIX: Added z-10 to ensure it sits on top of the grid lines
                                            className={`absolute left-1 right-1 p-2 z-10 rounded-xl shadow-sm text-[10px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-1 text-left transition-all ${styleClasses}`}
                                        >
                                            <div className="flex justify-between items-start gap-1 w-full">
                                                <p className="font-black leading-tight break-words">{event.subject}</p>
                                                {event.status === 'pending' && (
                                                    <span className="shrink-0 bg-amber-200 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">New</span>
                                                )}
                                            </div>

                                            {height >= 70 && (
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    <p className="font-bold opacity-70">{event.start_time}</p>
                                                    {!event.is_personal && studentName && <p className="font-medium break-words leading-tight">{studentName}</p>}
                                                    {modeText && <p className="font-bold opacity-80 break-words leading-tight mt-0.5">{modeText}</p>}
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>

            {isDetailsModalOpen && selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="relative bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <button onClick={() => setIsDetailsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-all z-10">
                            <CloseIcon />
                        </button>

                        {(!selectedEvent.is_personal || selectedEvent.subject?.toLowerCase().includes('tutoring')) ? (
                            <div className="flex flex-col h-full">
                                <div className="bg-[#eaf6ef] p-10 pb-8 border-b border-[#24985b]/10">
                                    <span className="inline-block bg-[#24985b] text-white text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-widest mb-4">
                                        {selectedEvent.status === 'pending' ? 'Pending Request' : 'Tutoring Lesson'}
                                    </span>
                                    <h2 className="text-3xl font-black text-[#1a5c3a] leading-tight">{selectedEvent.subject}</h2>
                                </div>

                                <div className="p-10 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-gray-50 p-3 rounded-2xl text-gray-400"><CalendarIcon /></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date & Time</p>
                                                <p className="text-lg font-black text-gray-900 mt-1">{formatModalDate(selectedEvent.session_date)}</p>
                                                <p className="text-[#24985b] font-bold">{selectedEvent.start_time} ({selectedEvent.duration} mins)</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="bg-gray-50 p-3 rounded-2xl text-gray-400"><UserIcon /></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Student</p>
                                                <p className="text-lg font-black text-gray-900 mt-1">
                                                    {selectedEvent.students?.full_name || selectedEvent.students?.display_name || selectedEvent.students?.name || 'Student Name'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4 md:col-span-2">
                                            <div className="bg-gray-50 p-3 rounded-2xl text-gray-400"><LocationIcon /></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location</p>
                                                <p className="text-lg font-black text-gray-900 mt-1 flex items-center gap-2">
                                                    {selectedEvent.lesson_mode === 'in_person' ?
                                                        <><span>📍</span> {selectedEvent.location || 'In Person Address'}</> :
                                                        <><span>💻</span> Online Lesson</>
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                                        {selectedEvent.status === 'pending' && (
                                            <button className="flex-1 bg-[#24985b] text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-all">Accept Request</button>
                                        )}
                                        <button className="flex-1 bg-white border-2 border-red-100 text-red-500 py-4 rounded-2xl font-black text-lg hover:bg-red-50 transition-all">
                                            {selectedEvent.status === 'pending' ? 'Decline' : 'Cancel Lesson'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="bg-blue-50 p-10 pb-8 border-b border-blue-100">
                                    <span className="inline-block bg-blue-500 text-white text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-widest mb-4">Personal Event</span>
                                    <h2 className="text-3xl font-black text-blue-900 leading-tight break-words">{selectedEvent.subject}</h2>
                                    {selectedEvent.is_external && (
                                        <p className="text-blue-400 font-bold flex items-center gap-2 mt-3 text-sm">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                                            Synced from Google Calendar
                                        </p>
                                    )}
                                </div>
                                <div className="p-10 space-y-8">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-gray-50 p-3 rounded-2xl text-gray-400"><ClockIcon /></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">When</p>
                                            <p className="text-lg font-black text-gray-900 mt-1">{formatModalDate(selectedEvent.session_date)}</p>
                                            <p className="text-blue-500 font-bold">{selectedEvent.start_time} — {selectedEvent.duration} mins</p>
                                        </div>
                                    </div>
                                    {selectedEvent.location && (
                                        <div className="flex items-start gap-4">
                                            <div className="bg-gray-50 p-3 rounded-2xl text-gray-400"><LocationIcon /></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location</p>
                                                <p className="text-lg font-black text-gray-900 mt-1">{selectedEvent.location}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="pt-4 border-t border-gray-100">
                                        <button className="w-full bg-white border-2 border-gray-100 text-gray-400 py-4 rounded-2xl font-black text-lg hover:border-red-100 hover:text-red-500 transition-all">
                                            Delete Event
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddEvent} className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-black mb-6">Create Event</h2>
                        <div className="space-y-4 mb-8">
                            <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold" placeholder="Title" />
                            <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Start Time</label>
                                    <input type="time" value={formData.start} onChange={e => setFormData({ ...formData, start: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">End Time</label>
                                    <input type="time" value={formData.end} onChange={e => setFormData({ ...formData, end: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold mt-1" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                            <button type="submit" className="flex-[2] bg-[#24985b] text-white py-4 rounded-2xl font-black">Save</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}