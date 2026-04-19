'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Link from 'next/link';

export default function StudentDashboard() {
    const [student, setStudent] = useState(null);
    const [upcomingLessons, setUpcomingLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const studentId = localStorage.getItem('student_id');
        if (studentId) {
            fetchStudentData(studentId);
        } else {
            setLoading(false);
        }
    }, []);

    async function fetchStudentData(id) {
        // Fetch the student profile
        const { data: studentData } = await supabase.from('students').select('*').eq('id', id).single();
        if (studentData) {
            setStudent(studentData);

            // 🚀 Fetch Upcoming Lessons specifically for this student
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: bookings } = await supabase
                .from('bookings')
                .select('*, tutors(display_name, profiles(avatar_url))')
                .eq('student_id', id)
                .gte('session_date', todayStr)
                .neq('status', 'cancelled')
                .order('session_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (bookings) setUpcomingLessons(bookings);
        }
        setLoading(false);
    }

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':');
        let hours = parseInt(h);
        return `${hours % 12 || 12}:${m} ${hours >= 12 ? 'PM' : 'AM'}`;
    };

    const handleSignOut = () => {
        localStorage.removeItem('student_id');
        window.location.href = '/auth/sign-in';
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-[#24985b] text-xl animate-pulse">Loading Portal...</div>;

    if (!student) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8faff] p-6">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-3xl mb-4">🕵️</div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Student Not Found</h1>
                <p className="text-gray-500 font-medium mb-6">Please ask your parent for your Portal Link.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8faff] font-sans pb-32">
            {/* Top Navigation */}
            <nav className="bg-white px-6 md:px-12 py-5 flex justify-between items-center border-b border-gray-100 sticky top-0 z-50">
                <div className="font-black text-2xl tracking-tighter text-gray-900">
                    Darsha<span className="text-[#24985b]">Tutor</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#eaf6ef] text-[#24985b] rounded-full flex items-center justify-center font-black text-lg uppercase shadow-sm border-2 border-white ring-2 ring-gray-50">
                            {student.full_name[0]}
                        </div>
                        <span className="font-bold text-gray-700 hidden sm:block">
                            {student.full_name.split(' ')[0]}
                        </span>
                    </div>
                    <button 
                        onClick={handleSignOut} 
                        className="text-xs font-bold text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6 md:p-12 space-y-10 animate-in fade-in duration-500">

                {/* Welcome Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Hey, {student.full_name.split(' ')[0]}! 👋</h1>
                        <p className="text-gray-500 mt-2 font-medium text-lg">Welcome to your student portal.</p>
                    </div>
                    {student.can_student_book && (
                        <Link href="/student-book" className="w-full md:w-auto bg-[#24985b] text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-[#24985b]/20 hover:scale-105 active:scale-95 transition-all text-center">
                            Request a Lesson
                        </Link>
                    )}
                </div>

                {/* Upcoming Lessons List */}
                <div className="space-y-6">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Your Upcoming Schedule</h2>

                    {upcomingLessons.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center">
                            <div className="text-4xl mb-4 opacity-50">📅</div>
                            <h3 className="text-xl font-black text-gray-900 mb-1">No lessons scheduled</h3>
                            <p className="text-gray-500 font-medium text-sm">You have no upcoming lessons right now.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {upcomingLessons.map(lesson => (
                                <div key={lesson.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm hover:border-[#24985b]/30 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 shrink-0 bg-gray-50 rounded-[1.2rem] flex flex-col items-center justify-center border border-gray-100">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(lesson.session_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <span className="text-xl font-black text-[#24985b]">{new Date(lesson.session_date).getDate()}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl text-gray-900">{lesson.subject}</h3>
                                            <p className="text-sm font-bold text-gray-500 mt-1 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {formatTime(lesson.start_time)} ({lesson.duration} mins)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-t-0 border-gray-50 pt-4 md:pt-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#eaf6ef] text-[#24985b] flex items-center justify-center font-black text-xs uppercase overflow-hidden">
                                                {lesson.tutors?.profiles?.avatar_url ? (
                                                    <img src={lesson.tutors.profiles.avatar_url} alt="Tutor" className="w-full h-full object-cover" />
                                                ) : (
                                                    lesson.tutors?.display_name?.[0] || 'T'
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-gray-500">{lesson.tutors?.display_name}</span>
                                        </div>

                                        {lesson.status === 'requested' ? (
                                            <span className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                                Pending Parent
                                            </span>
                                        ) : lesson.meet_link ? (
                                            <a href={lesson.meet_link} target="_blank" rel="noopener noreferrer" className="bg-[#4285F4] text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                Join Call
                                            </a>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                                Confirmed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}