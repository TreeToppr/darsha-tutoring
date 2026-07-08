'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

export default function TutorPeopleDirectory() {
    const [activeTab, setActiveTab] = useState('students');
    const [myStudents, setMyStudents] = useState([]);
    const [myParents, setMyParents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTutor, setCurrentTutor] = useState(null);

    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const [expandedParentId, setExpandedParentId] = useState(null);
    const [savingRateId, setSavingRateId] = useState(null); // Tracks which student is saving

    useEffect(() => {
        fetchMyPeople();
    }, []);

    async function fetchMyPeople() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 🚀 FIX 1: First, get the actual 'tutor_id' for this logged-in user
        const { data: tutorRecord, error: tutorError } = await supabase
            .from('tutors')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (tutorError || !tutorRecord) {
            console.error("Could not find tutor record:", tutorError);
            setLoading(false);
            return;
        }

        setCurrentTutor(tutorRecord);

        // 🚀 FIX 2: Now fetch bookings using the correct tutorRecord.id
        const { data: bookings } = await supabase
            .from('bookings')
            .select('*')
            .eq('tutor_id', tutorRecord.id)
            .neq('status', 'cancelled'); // We ignore cancelled lessons so they don't skew the math

        if (!bookings || bookings.length === 0) {
            setLoading(false);
            return;
        }

        // 3. Extract unique Student IDs and Parent IDs
        const studentIds = [...new Set(bookings.map(b => b.student_id))];
        const parentIds = [...new Set(bookings.map(b => b.parent_id))];

        // 4. Fetch the actual Student and Parent records
        const { data: students } = await supabase.from('students').select('*').in('id', studentIds);
        const { data: parents } = await supabase.from('profiles').select('*').in('id', parentIds);

        const { data: tutorStudentSettings, error: settingsError } = await supabase
            .from('tutor_student_settings')
            .select('*')
            .eq('tutor_id', tutorRecord.id)
            .in('student_id', studentIds);

        if (settingsError) {
            console.error("Could not load tutor student settings:", settingsError);
        }

        // 5. Enrich Students with their specific financial/lesson stats for THIS tutor
        const enrichedStudents = (students || []).map(student => {
            const studentBookings = bookings.filter(b => b.student_id === student.id);
            const totalPaid = studentBookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.amount_total, 0);
            const totalOwed = studentBookings.filter(b => b.payment_status === 'unpaid').reduce((sum, b) => sum + b.amount_total, 0);
            const parentInfo = parents?.find(p => p.id === student.parent_id);
            const tutorStudentSetting = tutorStudentSettings?.find(setting => setting.student_id === student.id);

            return {
                ...student,
                studentBookings,
                totalPaid,
                totalOwed,
                parentInfo,
                tutorStudentSetting,
                tutor_custom_hourly_rate: tutorStudentSetting?.custom_hourly_rate ?? null
            };
        }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

        // 6. Enrich Parents with their specific financial stats for THIS tutor
        const enrichedParents = (parents || []).map(parent => {
            const parentBookings = bookings.filter(b => b.parent_id === parent.id);
            const childrenITeach = enrichedStudents.filter(s => s.parent_id === parent.id);

            const totalPaid = parentBookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.amount_total, 0);
            const totalOwed = parentBookings.filter(b => b.payment_status === 'unpaid').reduce((sum, b) => sum + b.amount_total, 0);

            return { ...parent, parentBookings, childrenITeach, totalPaid, totalOwed };
        }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

        setMyStudents(enrichedStudents);
        setMyParents(enrichedParents);
        setLoading(false);
    }

    // --- CUSTOM RATE SAVER ---
    const handleUpdateRate = async (studentId, newRateStr) => {
        if (!currentTutor?.id) {
            alert("Tutor record not loaded yet. Please refresh and try again.");
            return;
        }

        const parsedRate = newRateStr === '' ? null : parseFloat(newRateStr);

        if (newRateStr !== '' && (!Number.isFinite(parsedRate) || parsedRate <= 0)) {
            alert("Please enter a valid hourly rate greater than 0, or leave it blank to use your default rate.");
            return;
        }

        setSavingRateId(studentId);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("You need to be signed in to update rates.");
            setSavingRateId(null);
            return;
        }

        const { data, error } = await supabase
            .from('tutor_student_settings')
            .upsert(
                {
                    tutor_id: currentTutor.id,
                    student_id: studentId,
                    custom_hourly_rate: parsedRate,
                    created_by: user.id,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'tutor_id,student_id' }
            )
            .select()
            .single();

        if (!error) {
            setMyStudents(myStudents.map(s =>
                s.id === studentId
                    ? {
                        ...s,
                        tutorStudentSetting: data,
                        tutor_custom_hourly_rate: data?.custom_hourly_rate ?? null
                    }
                    : s
            ));
        } else {
            console.error("Error saving tutor-specific rate:", error);
            alert("Error saving rate: " + error.message);
        }

        setSavingRateId(null);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(val);
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' });

    if (loading) return <div className="p-12 text-center text-[#24985b] font-black animate-pulse">Loading Roster...</div>;

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-8 animate-in fade-in duration-500 pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">My Roster</h1>
                    <p className="text-gray-500 mt-2 font-medium">Track your students, view lesson history, and set custom rates.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`flex-1 md:w-32 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'students' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Students
                    </button>
                    <button
                        onClick={() => setActiveTab('parents')}
                        className={`flex-1 md:w-32 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'parents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Parents
                    </button>
                </div>
            </div>

            {myStudents.length === 0 && (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                    <h3 className="text-xl font-black text-gray-900 mb-2">No students yet!</h3>
                    <p className="text-gray-500 font-medium">Once a parent books a lesson with you, they will appear here.</p>
                </div>
            )}

            {/* --- STUDENTS TAB --- */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    {myStudents.map(student => {
                        const isExpanded = expandedStudentId === student.id;
                        return (
                            <div key={student.id} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-blue-500 shadow-lg ring-4 ring-blue-500/10' : 'border-gray-200 shadow-sm'}`}>
                                <div onClick={() => setExpandedStudentId(isExpanded ? null : student.id)} className="p-6 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl uppercase shrink-0">
                                            {student.full_name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900">
                                                {student.full_name}
                                                {student.tutor_custom_hourly_rate && (
                                                    <span className="ml-3 bg-blue-100 text-blue-700 text-[10px] uppercase tracking-widest px-2 py-1 rounded-md font-bold">Custom Rate</span>
                                                )}
                                            </h3>
                                            <p className="text-sm font-medium text-gray-500">Year {student.year_level || 'N/A'} • Parent: {student.parentInfo?.full_name || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className="hidden sm:block text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Owed to You</p>
                                            <p className={`font-black ${student.totalOwed > 0 ? 'text-orange-500' : 'text-gray-900'}`}>{formatCurrency(student.totalOwed)}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-auto">
                                            <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/30 p-6 md:p-8">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                                            {/* Left Column: Settings */}
                                            <div className="space-y-6">
                                                <Link
                                                    href={`/tutor-students/${student.id}`}
                                                    className="inline-flex w-full items-center justify-center rounded-2xl bg-[#24985b] px-5 py-3 text-sm font-black text-white hover:bg-[#1f7f4d] transition-colors"
                                                >
                                                    View Student Profile
                                                </Link>
                                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative">
                                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Custom Hourly Rate
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mb-4 font-medium">
                                                        Override your own default rate for this student. Other tutors can set their own rate separately.
                                                    </p>

                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                            <span className="text-gray-500 font-bold">$</span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            placeholder="Default"
                                                            defaultValue={student.tutor_custom_hourly_rate || ''}
                                                            onBlur={(e) => handleUpdateRate(student.id, e.target.value)}
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                        Leave blank to use your standard tutor rate.
                                                    </p>

                                                    {savingRateId === student.id && (
                                                        <div className="absolute top-4 right-4 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md animate-pulse">Saving...</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Column: History */}
                                            <div className="md:col-span-2">
                                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Lesson History ({student.studentBookings.length})</h4>
                                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                    {student.studentBookings.sort((a, b) => new Date(b.session_date) - new Date(a.session_date)).map(booking => (
                                                        <div key={booking.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center text-sm shadow-sm hover:border-blue-200 transition-colors">
                                                            <div>
                                                                <p className="font-bold text-gray-900">{formatDate(booking.session_date)}</p>
                                                                <p className="text-gray-500 font-medium text-xs">{booking.subject} • {booking.duration} mins</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-black text-gray-900 text-lg">{formatCurrency(booking.amount_total)}</p>
                                                                <p className={`text-[10px] font-black uppercase tracking-widest ${booking.payment_status === 'paid' ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                                    {booking.payment_status}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {student.studentBookings.length === 0 && <p className="text-sm italic text-gray-400">No lessons completed yet.</p>}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- PARENTS TAB --- */}
            {activeTab === 'parents' && (
                <div className="space-y-4">
                    {myParents.map(parent => {
                        const isExpanded = expandedParentId === parent.id;
                        return (
                            <div key={parent.id} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-purple-500 shadow-lg ring-4 ring-purple-500/10' : 'border-gray-200 shadow-sm'}`}>
                                <div onClick={() => setExpandedParentId(isExpanded ? null : parent.id)} className="p-6 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xl uppercase shrink-0">
                                            {parent.full_name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900">{parent.full_name}</h3>
                                            <p className="text-sm font-medium text-gray-500">{parent.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className="hidden sm:block text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Owed to You</p>
                                            <p className={`font-black ${parent.totalOwed > 0 ? 'text-orange-500' : 'text-gray-900'}`}>{formatCurrency(parent.totalOwed)}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-auto">
                                            <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/30 p-6">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Their Students (That you teach)</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {parent.childrenITeach.map(child => (
                                                <div key={child.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3 shadow-sm">
                                                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full font-black flex items-center justify-center text-xs shrink-0 uppercase">{child.full_name?.[0] || '?'}</div>
                                                    <p className="font-bold text-gray-900 text-sm">{child.full_name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}