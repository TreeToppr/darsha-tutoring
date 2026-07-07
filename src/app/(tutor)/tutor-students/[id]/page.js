'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';

export default function StudentProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [student, setStudent] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchStudentData();
    }, [id]);

    async function fetchStudentData() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        // 1. Get Tutor ID
        const { data: tutorRecord } = await supabase
            .from('tutors')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (!tutorRecord) {
            setLoading(false);
            return;
        }

        // 2. Get Student Details
        const { data: studentData, error: studentErr } = await supabase
            .from('students')
            .select('*')
            .eq('id', id)
            .single();

        if (studentErr) {
            console.error(studentErr);
            setLoading(false);
            return;
        }
        setStudent(studentData);

        // 3. Get All Bookings for THIS student with THIS tutor
        const { data: bookingData } = await supabase
            .from('bookings')
            .select('*')
            .eq('student_id', id)
            .eq('tutor_id', tutorRecord.id)
            .order('session_date', { ascending: false }); // Newest first

        if (bookingData) {
            setBookings(bookingData);

            // 4. Get all Lesson Reports tied to these bookings to build the Skills Radar
            const bookingIds = bookingData.map(b => b.id);
            if (bookingIds.length > 0) {
                const { data: reportData } = await supabase
                    .from('lesson_reports')
                    .select('*')
                    .in('booking_id', bookingIds)
                    .order('created_at', { ascending: false }); // Newest reports first

                if (reportData) setReports(reportData);
            }
        }
        setLoading(false);
    }

    // 🚀 THE SKILLS RADAR: Aggregate the latest mastery level for every unique skill taught
    const getLatestSkills = () => {
        const skillMap = new Map();

        // Because reports are sorted newest-first, we only keep the FIRST time we see a skill
        reports.forEach(report => {
            if (report.ai_skills_analysis && Array.isArray(report.ai_skills_analysis)) {
                report.ai_skills_analysis.forEach(skill => {
                    const normalizedName = skill.skill_name.trim().toLowerCase();
                    if (!skillMap.has(normalizedName)) {
                        skillMap.set(normalizedName, {
                            name: skill.skill_name,
                            level: skill.mastery_level,
                            lastPracticed: report.created_at
                        });
                    }
                });
            }
        });

        return Array.from(skillMap.values()).sort((a, b) => b.level - a.level);
    };

    if (loading) return <div className="p-10 font-bold text-gray-400 animate-pulse max-w-4xl mx-auto">Loading Student Dossier...</div>;
    if (!student) return <div className="p-10 font-bold text-red-500 max-w-4xl mx-auto">Student not found.</div>;

    const latestSkills = getLatestSkills();
    const upcomingBookings = bookings.filter(b => new Date(`${b.session_date}T${b.start_time}`) >= new Date() && b.status !== 'cancelled');
    const pastBookings = bookings.filter(b => new Date(`${b.session_date}T${b.start_time}`) < new Date() && b.status !== 'cancelled');

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 pb-32 animate-in fade-in duration-500">
            <button onClick={() => router.back()} className="text-sm font-bold text-gray-400 hover:text-[#24985b] flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                Back to Roster
            </button>

            {/* HERO PROFILE CARD */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#24985b] opacity-[0.02] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-[#eaf6ef] text-[#24985b] flex items-center justify-center font-black text-5xl shrink-0 shadow-sm z-10">
                    {student.first_name?.[0] || student.full_name?.[0] || 'S'}
                </div>

                <div className="z-10 flex-1 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{student.full_name}</h1>
                            <p className="text-gray-400 font-bold mt-1 uppercase tracking-widest text-xs">ID: {student.billing_code || 'No Billing Code'}</p>
                        </div>
                        <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 flex gap-6">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Lessons</p>
                                <p className="text-xl font-black text-gray-900">{bookings.length}</p>
                            </div>
                            <div className="w-px bg-gray-200"></div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Mastery</p>
                                <p className="text-xl font-black text-[#24985b]">
                                    {latestSkills.length > 0
                                        ? (latestSkills.reduce((sum, s) => sum + s.level, 0) / latestSkills.length).toFixed(1)
                                        : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-6 border-b border-gray-100 px-4">
                <TabBtn label="Skills & Progress" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <TabBtn label="Lesson History" count={bookings.length} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            </div>

            {/* TAB CONTENT: SKILLS & PROGRESS */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                    <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                            <svg className="w-6 h-6 text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Current Skill Mastery
                        </h2>

                        {latestSkills.length === 0 ? (
                            <p className="text-gray-400 font-medium text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                No skills data yet. Upload a lesson report after their next session to start tracking progress!
                            </p>
                        ) : (
                            <div className="space-y-5">
                                {latestSkills.map((skill, idx) => (
                                    <div key={idx} className="flex items-center gap-4 group">
                                        <div className="w-1/3">
                                            <p className="text-sm font-bold text-gray-700 truncate">{skill.name}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Last seen: {new Date(skill.lastPracticed).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        <div className="flex-1 flex gap-1.5 h-3">
                                            {[1, 2, 3, 4, 5].map(level => (
                                                <div key={level} className={`flex-1 rounded-full transition-all duration-500 ${level <= skill.level ? 'bg-[#24985b] shadow-sm scale-y-100' : 'bg-gray-100 scale-y-75 group-hover:scale-y-100'}`}></div>
                                            ))}
                                        </div>
                                        <span className="text-xs font-black text-[#24985b] w-8 text-right">{skill.level}/5</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {reports.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8">
                            <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Latest AI Focus Recommendation</h2>
                            <p className="text-blue-900 font-bold text-sm leading-relaxed">{reports[0].next_lesson_suggestions || "No recommendations provided in the last report."}</p>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: LESSON HISTORY */}
            {activeTab === 'history' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-2">

                    {/* Upcoming */}
                    <div>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Upcoming Lessons</h3>
                        {upcomingBookings.length === 0 ? (
                            <p className="text-sm text-gray-400 font-medium ml-2 italic">No upcoming lessons scheduled.</p>
                        ) : (
                            <div className="bg-white border border-gray-100 rounded-[2rem] divide-y divide-gray-50 shadow-sm overflow-hidden">
                                {upcomingBookings.map(b => <BookingRow key={b.id} booking={b} router={router} />)}
                            </div>
                        )}
                    </div>

                    {/* Past */}
                    <div>
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Past Lessons</h3>
                        {pastBookings.length === 0 ? (
                            <p className="text-sm text-gray-400 font-medium ml-2 italic">No past lessons found.</p>
                        ) : (
                            <div className="bg-white border border-gray-100 rounded-[2rem] divide-y divide-gray-50 shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                                {pastBookings.map(b => <BookingRow key={b.id} booking={b} router={router} />)}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}

// Sub-components
function TabBtn({ label, active, onClick, count }) {
    return (
        <button onClick={onClick} className={`pb-4 text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'text-gray-900 border-b-4 border-[#24985b]' : 'text-gray-400 hover:text-gray-600'}`}>
            {label} {count !== undefined && <span className="bg-emerald-100 text-[#24985b] px-2 py-0.5 rounded-lg text-[10px]">{count}</span>}
        </button>
    );
}

function BookingRow({ booking, router }) {
    const isPast = new Date(`${booking.session_date}T${booking.start_time}`) < new Date();

    return (
        <div
            onClick={() => router.push(`/bookings/${booking.id}`)}
            className="p-6 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group"
        >
            <div>
                <p className="font-bold text-gray-900 group-hover:text-[#24985b] transition-colors">{booking.subject}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-gray-500">
                    <span>{new Date(booking.session_date).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span>•</span>
                    <span>{formatTime(booking.start_time)}</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <StatusBadge status={booking.status} isPast={isPast} />
                <svg className="w-5 h-5 text-gray-300 group-hover:text-[#24985b] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
        </div>
    );
}

function StatusBadge({ status, isPast }) {
    if (isPast && status === 'accepted') return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500">Completed</span>;
    if (status === 'accepted') return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#eaf6ef] text-[#24985b]">Confirmed</span>;
    if (status === 'requested') return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-700">Requested</span>;
    return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-600">{status}</span>;
}

function formatTime(t) {
    if (!t) return '';
    let [h, m] = t.split(':');
    let hours = parseInt(h);
    return `${((hours + 11) % 12 + 1)}:${m} ${hours >= 12 ? 'PM' : 'AM'}`;
}