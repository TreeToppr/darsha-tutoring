'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';

export default function StudentProfilePage() {
    const { id } = useParams();
    const router = useRouter();

    const [student, setStudent] = useState(null);
    const [parentProfile, setParentProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchStudentData();
    }, [id]);

    async function fetchStudentData() {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        const { data: tutorRecord, error: tutorError } = await supabase
            .from('tutors')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (tutorError || !tutorRecord) {
            console.error('Tutor record not found:', tutorError);
            setLoading(false);
            return;
        }

        const { data: studentData, error: studentErr } = await supabase
            .from('students')
            .select('*')
            .eq('id', id)
            .single();

        if (studentErr || !studentData) {
            console.error('Student not found:', studentErr);
            setLoading(false);
            return;
        }

        setStudent(studentData);

        if (studentData.parent_id) {
            const { data: parentData, error: parentErr } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone')
                .eq('id', studentData.parent_id)
                .maybeSingle();

            if (parentErr) {
                console.error('Parent profile not found:', parentErr);
            }

            setParentProfile(parentData || null);
        }

        const { data: bookingData, error: bookingErr } = await supabase
            .from('bookings')
            .select('*')
            .eq('student_id', id)
            .eq('tutor_id', tutorRecord.id)
            .order('session_date', { ascending: false });

        if (bookingErr) {
            console.error('Bookings could not be loaded:', bookingErr);
            setBookings([]);
            setReports([]);
            setLoading(false);
            return;
        }

        setBookings(bookingData || []);

        const bookingIds = (bookingData || []).map(b => b.id);

        if (bookingIds.length > 0) {
            const { data: reportData, error: reportErr } = await supabase
                .from('lesson_reports')
                .select('*')
                .in('booking_id', bookingIds)
                .order('created_at', { ascending: false });

            if (reportErr) {
                console.error('Lesson reports could not be loaded:', reportErr);
            }

            setReports(reportData || []);
        } else {
            setReports([]);
        }

        setLoading(false);
    }

    const getLatestSkills = () => {
        const skillMap = new Map();

        reports.forEach(report => {
            if (report.ai_skills_analysis && Array.isArray(report.ai_skills_analysis)) {
                report.ai_skills_analysis.forEach(skill => {
                    if (!skill.skill_name) return;

                    const normalizedName = skill.skill_name.trim().toLowerCase();

                    if (!skillMap.has(normalizedName)) {
                        skillMap.set(normalizedName, {
                            name: skill.skill_name,
                            level: Number(skill.mastery_level) || 0,
                            lastPracticed: report.created_at
                        });
                    }
                });
            }
        });

        return Array.from(skillMap.values()).sort((a, b) => b.level - a.level);
    };

    if (loading) {
        return (
            <div className="p-10 font-bold text-gray-400 animate-pulse max-w-5xl mx-auto">
                Loading Student Dossier...
            </div>
        );
    }

    if (!student) {
        return (
            <div className="p-10 max-w-5xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="text-sm font-bold text-gray-400 hover:text-[#24985b] mb-6"
                >
                    ← Back
                </button>

                <div className="bg-red-50 border border-red-100 rounded-3xl p-8">
                    <h1 className="text-2xl font-black text-red-700">Student not found</h1>
                    <p className="text-sm font-medium text-red-500 mt-2">
                        This student could not be loaded, or you may not have access to this profile.
                    </p>
                </div>
            </div>
        );
    }

    const latestSkills = getLatestSkills();

    const activeBookings = bookings.filter(b => b.status !== 'cancelled');

    const upcomingBookings = activeBookings
        .filter(b => new Date(`${b.session_date}T${b.start_time || '00:00'}`) >= new Date())
        .sort((a, b) => new Date(`${a.session_date}T${a.start_time || '00:00'}`) - new Date(`${b.session_date}T${b.start_time || '00:00'}`));

    const pastBookings = activeBookings
        .filter(b => new Date(`${b.session_date}T${b.start_time || '00:00'}`) < new Date())
        .sort((a, b) => new Date(`${b.session_date}T${b.start_time || '00:00'}`) - new Date(`${a.session_date}T${a.start_time || '00:00'}`));

    const completedLessons = pastBookings.length;
    const upcomingLessons = upcomingBookings.length;
    const latestReport = reports[0] || null;
    const lastLesson = pastBookings[0] || null;
    const nextLesson = upcomingBookings[0] || null;

    const averageMastery = latestSkills.length > 0
        ? (latestSkills.reduce((sum, s) => sum + s.level, 0) / latestSkills.length).toFixed(1)
        : '-';

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 pb-32 animate-in fade-in duration-500">
            <button
                onClick={() => router.back()}
                className="text-sm font-bold text-gray-400 hover:text-[#24985b] flex items-center gap-2 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path d="M15 19l-7-7 7-7" />
                </svg>
                Back to Roster
            </button>

            {/* HERO PROFILE CARD */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#24985b] opacity-[0.02] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-[#eaf6ef] text-[#24985b] flex items-center justify-center font-black text-5xl shrink-0 shadow-sm">
                        {student.first_name?.[0] || student.full_name?.[0] || 'S'}
                    </div>

                    <div className="flex-1 w-full">
                        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6">
                            <div>
                                <p className="text-[10px] font-black text-[#24985b] uppercase tracking-[0.3em] mb-2">
                                    Student Dossier
                                </p>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                                    {student.full_name || 'Unnamed student'}
                                </h1>
                                <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">
                                    {student.billing_code ? `ID: ${student.billing_code}` : 'No billing code'}
                                </p>
                            </div>

                            <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 flex gap-6">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lessons</p>
                                    <p className="text-xl font-black text-gray-900">{activeBookings.length}</p>
                                </div>
                                <div className="w-px bg-gray-200"></div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Mastery</p>
                                    <p className="text-xl font-black text-[#24985b]">{averageMastery}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SNAPSHOT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SnapshotCard
                    label="Year Level"
                    value={student.year_level || 'Not set'}
                    detail="Student school year"
                />
                <SnapshotCard
                    label="Parent"
                    value={parentProfile?.full_name || 'Parent not found'}
                    detail={parentProfile?.email || 'No parent email available'}
                />
                <SnapshotCard
                    label="Next Lesson"
                    value={nextLesson ? formatDate(nextLesson.session_date) : 'None scheduled'}
                    detail={nextLesson ? `${nextLesson.subject || 'Lesson'} at ${formatTime(nextLesson.start_time)}` : 'No upcoming lesson'}
                />
                <SnapshotCard
                    label="Completed Lessons"
                    value={completedLessons}
                    detail="Past non-cancelled lessons"
                />
                <SnapshotCard
                    label="Upcoming Lessons"
                    value={upcomingLessons}
                    detail="Future non-cancelled lessons"
                />
                <SnapshotCard
                    label="Last Lesson"
                    value={lastLesson ? formatDate(lastLesson.session_date) : 'No past lesson'}
                    detail={lastLesson ? `${lastLesson.subject || 'Lesson'} at ${formatTime(lastLesson.start_time)}` : 'No completed lesson yet'}
                />
            </div>

            {/* LATEST FOCUS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-blue-50 border border-blue-100 rounded-[2rem] p-8">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                        Latest Learning Focus
                    </p>
                    <p className="text-blue-950 font-bold text-base leading-relaxed">
                        {latestReport?.next_lesson_suggestions ||
                            'No learning focus has been recorded yet. Upload a lesson report to start building the student’s learning history.'}
                    </p>
                </div>

                <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Reports
                    </p>
                    <p className="text-4xl font-black text-gray-900">{reports.length}</p>
                    <p className="text-sm font-bold text-gray-400 mt-2">
                        {latestReport ? `Latest report: ${formatDate(latestReport.created_at)}` : 'No reports yet'}
                    </p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-6 border-b border-gray-100 px-4 overflow-x-auto">
                <TabBtn
                    label="Skills & Progress"
                    active={activeTab === 'overview'}
                    onClick={() => setActiveTab('overview')}
                />
                <TabBtn
                    label="Lesson History"
                    count={activeBookings.length}
                    active={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                />
            </div>

            {/* TAB CONTENT: SKILLS & PROGRESS */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                    <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                            <svg className="w-6 h-6 text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Current Skill Mastery
                        </h2>

                        {latestSkills.length === 0 ? (
                            <p className="text-gray-400 font-medium text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                No skills data yet. Upload a lesson report after their next session to start tracking progress.
                            </p>
                        ) : (
                            <div className="space-y-5">
                                {latestSkills.map((skill, idx) => (
                                    <div key={`${skill.name}-${idx}`} className="flex items-center gap-4 group">
                                        <div className="w-1/3">
                                            <p className="text-sm font-bold text-gray-700 truncate">{skill.name}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                                                Last seen: {formatDate(skill.lastPracticed)}
                                            </p>
                                        </div>

                                        <div className="flex-1 flex gap-1.5 h-3">
                                            {[1, 2, 3, 4, 5].map(level => (
                                                <div
                                                    key={level}
                                                    className={`flex-1 rounded-full transition-all duration-500 ${level <= skill.level
                                                            ? 'bg-[#24985b] shadow-sm scale-y-100'
                                                            : 'bg-gray-100 scale-y-75 group-hover:scale-y-100'
                                                        }`}
                                                ></div>
                                            ))}
                                        </div>

                                        <span className="text-xs font-black text-[#24985b] w-8 text-right">
                                            {skill.level}/5
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: LESSON HISTORY */}
            {activeTab === 'history' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-2">
                    <div>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">
                            Upcoming Lessons
                        </h3>

                        {upcomingBookings.length === 0 ? (
                            <p className="text-sm text-gray-400 font-medium ml-2 italic">
                                No upcoming lessons scheduled.
                            </p>
                        ) : (
                            <div className="bg-white border border-gray-100 rounded-[2rem] divide-y divide-gray-50 shadow-sm overflow-hidden">
                                {upcomingBookings.map(b => (
                                    <BookingRow key={b.id} booking={b} router={router} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">
                            Past Lessons
                        </h3>

                        {pastBookings.length === 0 ? (
                            <p className="text-sm text-gray-400 font-medium ml-2 italic">
                                No past lessons found.
                            </p>
                        ) : (
                            <div className="bg-white border border-gray-100 rounded-[2rem] divide-y divide-gray-50 shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                                {pastBookings.map(b => (
                                    <BookingRow key={b.id} booking={b} router={router} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SnapshotCard({ label, value, detail }) {
    return (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-xl font-black text-gray-900 truncate">{value}</p>
            <p className="text-xs font-bold text-gray-400 mt-2 truncate">{detail}</p>
        </div>
    );
}

function TabBtn({ label, active, onClick, count }) {
    return (
        <button
            onClick={onClick}
            className={`pb-4 text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${active
                    ? 'text-gray-900 border-b-4 border-[#24985b]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            {label}
            {count !== undefined && (
                <span className="bg-emerald-100 text-[#24985b] px-2 py-0.5 rounded-lg text-[10px]">
                    {count}
                </span>
            )}
        </button>
    );
}

function BookingRow({ booking, router }) {
    const isPast = new Date(`${booking.session_date}T${booking.start_time || '00:00'}`) < new Date();

    return (
        <div
            onClick={() => router.push(`/bookings/${booking.id}`)}
            className="p-6 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group"
        >
            <div>
                <p className="font-bold text-gray-900 group-hover:text-[#24985b] transition-colors">
                    {booking.subject || 'Lesson'}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-gray-500">
                    <span>{formatDate(booking.session_date)}</span>
                    <span>•</span>
                    <span>{formatTime(booking.start_time)}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <StatusBadge status={booking.status} isPast={isPast} />
                <svg className="w-5 h-5 text-gray-300 group-hover:text-[#24985b] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    );
}

function StatusBadge({ status, isPast }) {
    if (isPast && status === 'accepted') {
        return (
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500">
                Completed
            </span>
        );
    }

    if (status === 'accepted') {
        return (
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#eaf6ef] text-[#24985b]">
                Confirmed
            </span>
        );
    }

    if (status === 'requested') {
        return (
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-700">
                Requested
            </span>
        );
    }

    return (
        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-600">
            {status || 'Unknown'}
        </span>
    );
}

function formatTime(t) {
    if (!t) return '';

    const [h, m] = t.split(':');
    const hours = parseInt(h, 10);

    if (Number.isNaN(hours)) return t;

    return `${((hours + 11) % 12) + 1}:${m} ${hours >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(dateValue) {
    if (!dateValue) return 'No date';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleDateString('en-NZ', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}