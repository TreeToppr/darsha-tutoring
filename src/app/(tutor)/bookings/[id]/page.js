'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { sendNotification } from '../../../../lib/notifications';

export default function TutorBookingDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [booking, setBooking] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    // Reschedule States
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');

    // 🚀 NEW: Edit Report States
    const [isEditingReport, setIsEditingReport] = useState(false);
    const [editedSummary, setEditedSummary] = useState('');
    const [editedSkills, setEditedSkills] = useState([]);
    const [editedNextLesson, setEditedNextLesson] = useState('');

    const fetchData = async () => {
        const { data: b } = await supabase.from('bookings').select('*, students(*)').eq('id', id).single();
        const { data: r } = await supabase.from('lesson_reports').select('*').eq('booking_id', id).maybeSingle();
        setBooking(b);
        setReport(r);
        if (b) {
            setNewDate(b.session_date);
            setNewTime(b.start_time);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [id]);

    const handleStatusUpdate = async (newStatus, extra = {}) => {
        const { error } = await supabase.from('bookings').update({ status: newStatus, ...extra }).eq('id', id);
        if (!error) {
            const parentId = booking.parent_id || booking.students?.parent_id;
            if (parentId) {
                const title = newStatus === 'accepted' ? "Lesson Confirmed ✅" : "Lesson Cancelled ❌";
                const msg = newStatus === 'accepted' ? `Your booking for ${booking.subject} is confirmed!` : `The ${booking.subject} lesson was cancelled.`;
                await sendNotification(parentId, title, msg, `/parent-bookings/${booking.id}`);
            }
            setIsRescheduling(false);
            fetchData();
        }
    };

    const handleReschedule = async () => {
        if (!newDate || !newTime) return alert("Please select date and time");
        await handleStatusUpdate('accepted', {
            session_date: newDate,
            start_time: newTime,
            reschedule_status: null
        });
    };

    // 🚀 NEW: Start Editing
    const handleStartEdit = () => {
        setEditedSummary(report.ai_summary || '');
        setEditedSkills(report.ai_skills_analysis || []);
        setEditedNextLesson(report.next_lesson_suggestions || '');
        setIsEditingReport(true);
    };

    // 🚀 NEW: Save Edits
    const handleSaveReport = async () => {
        const { error } = await supabase
            .from('lesson_reports')
            .update({
                ai_summary: editedSummary,
                ai_skills_analysis: editedSkills,
                next_lesson_suggestions: editedNextLesson
            })
            .eq('id', report.id);

        if (error) alert("Error saving edits: " + error.message);
        else {
            setIsEditingReport(false);
            fetchData(); // Refresh to show saved data
        }
    };

    // 🚀 NEW: Handle Skill Changes dynamically
    const handleSkillChange = (index, field, value) => {
        const updatedSkills = [...editedSkills];
        updatedSkills[index][field] = value;
        setEditedSkills(updatedSkills);
    };

    const handleApproveReport = async () => {
        const { error } = await supabase.from('lesson_reports').update({ is_approved: true }).eq('id', report.id);
        if (!error) {
            const parentId = booking.parent_id || booking.students?.parent_id;
            if (parentId) {
                await sendNotification(parentId, "Lesson Update 📝", `${booking.students?.full_name}'s report for ${booking.subject} is ready!`, `/parent-bookings/${booking.id}`);
            }
            alert("Report approved and parent notified!");
            fetchData();
        }
    };

    if (loading) return <div className="p-10 animate-pulse text-gray-400 font-bold">Loading Lesson...</div>;
    if (!booking) return <div className="p-10 text-red-500">Lesson not found.</div>;

    const requestedDate = new Date(booking.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
    const sessionDate = new Date(booking.session_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });

    const steps = [
        { label: 'Requested', date: requestedDate, done: true },
        { label: 'Confirmed', date: booking.status === 'accepted' || booking.status === 'completed' ? 'Done' : null, done: booking.status === 'accepted' || booking.status === 'completed' },
        { label: 'Lesson Held', date: sessionDate, done: new Date(`${booking.session_date}T${booking.start_time}`) < new Date() },
        { label: 'Paid', date: booking.payment_status === 'paid' ? 'Received' : null, done: booking.payment_status === 'paid' }
    ];

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 pb-32">
            <Link href="/tutor-dashboard" className="text-sm font-bold text-gray-400 hover:text-[#24985b] flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                Back to Dashboard
            </Link>

            {/* HERO & TIMELINE */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#24985b] opacity-[0.02] rounded-full -translate-y-1/2 translate-x-1/4"></div>
                <div className="relative z-10 space-y-10">
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                            {booking.subject} <span className="text-gray-300 font-medium">with</span> {booking.students?.full_name}
                        </h1>
                        <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Lesson Management Portal</p>
                    </div>

                    <div className="flex justify-between items-start relative max-w-3xl mx-auto md:mx-0">
                        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 -z-0 mx-10"></div>
                        {steps.map((step, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 relative z-10 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-all duration-500 ${step.done ? 'bg-[#24985b] text-white scale-110' : 'bg-gray-100 text-gray-300'}`}>
                                    {step.done ? <CheckIcon className="w-4 h-4" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                                </div>
                                <div className="text-center">
                                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${step.done ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</p>
                                    {step.date && <p className={`text-[9px] font-bold mt-1.5 ${step.done ? 'text-[#24985b]' : 'text-gray-300'}`}>{step.date}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    {isRescheduling ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8 animate-in slide-in-from-top-4">
                            <h3 className="font-black text-blue-900 text-xl mb-6">Reschedule Lesson</h3>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="text-[10px] font-bold text-blue-400 uppercase mb-2 block">New Date</label>
                                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-4 rounded-2xl border-0 font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-blue-400 uppercase mb-2 block">New Time</label>
                                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-4 rounded-2xl border-0 font-bold" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleReschedule} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20">Confirm Move</button>
                                <button onClick={() => setIsRescheduling(false)} className="px-6 bg-white text-blue-600 py-4 rounded-2xl font-bold">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-gray-900">Lesson Progress</h2>
                                {report?.is_approved && <span className="bg-emerald-50 text-[#24985b] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#24985b]/20">Approved & Sent</span>}
                            </div>

                            {!report ? (
                                <Link href={`/upload-lesson?bookingId=${booking.id}`} className="block group">
                                    <div className="border-2 border-dashed border-gray-100 rounded-2xl p-10 text-center hover:border-[#24985b]/30 hover:bg-emerald-50/30 transition-all">
                                        <div className="w-12 h-12 bg-emerald-50 text-[#24985b] rounded-full flex items-center justify-center mx-auto mb-4"><PlusIcon /></div>
                                        <p className="font-bold text-gray-900">Upload Lesson Data</p>
                                        <p className="text-xs text-gray-400 mt-1">Start the AI analysis and update skills</p>
                                    </div>
                                </Link>
                            ) : isEditingReport ? (
                                /* 🚀 EDIT MODE UI */
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Lesson Summary</label>
                                        <textarea
                                            value={editedSummary}
                                            onChange={(e) => setEditedSummary(e.target.value)}
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-gray-700 min-h-[120px] focus:outline-none focus:border-[#24985b]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Skills Assessed</label>
                                        <div className="space-y-3">
                                            {editedSkills.map((skill, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        value={skill.skill_name}
                                                        onChange={(e) => handleSkillChange(idx, 'skill_name', e.target.value)}
                                                        className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:outline-none focus:border-[#24985b]"
                                                    />
                                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                                        <span className="text-xs font-bold text-gray-400">Level:</span>
                                                        <select
                                                            value={skill.mastery_level}
                                                            onChange={(e) => handleSkillChange(idx, 'mastery_level', parseInt(e.target.value))}
                                                            className="bg-white border border-gray-200 rounded-lg p-1 text-sm font-bold text-[#24985b] outline-none"
                                                        >
                                                            {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Next Lesson Focus</label>
                                        <input
                                            type="text"
                                            value={editedNextLesson}
                                            onChange={(e) => setEditedNextLesson(e.target.value)}
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-blue-900 focus:outline-none focus:border-blue-400"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                                        <button onClick={() => setIsEditingReport(false)} className="flex-1 bg-white border-2 border-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                                        <button onClick={handleSaveReport} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors">Save Edits</button>
                                    </div>
                                </div>
                            ) : (
                                /* 🚀 READ-ONLY REPORT UI */
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Lesson Summary</h4>
                                        <p className="text-gray-600 leading-relaxed italic p-6 bg-gray-50 rounded-2xl border border-gray-100">"{report.ai_summary}"</p>
                                    </div>

                                    {report.ai_skills_analysis?.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Skills Assessed</h4>
                                            <div className="space-y-4">
                                                {report.ai_skills_analysis.map((skill, idx) => (
                                                    <div key={idx} className="flex items-center gap-4">
                                                        <span className="text-sm font-bold text-gray-700 w-1/3 truncate" title={skill.skill_name}>{skill.skill_name}</span>
                                                        <div className="flex-1 flex gap-1.5">
                                                            {[1, 2, 3, 4, 5].map(level => (
                                                                <div key={level} className={`h-2.5 flex-1 rounded-full transition-all ${level <= skill.mastery_level ? 'bg-[#24985b] shadow-sm' : 'bg-gray-100'}`}></div>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs font-black text-[#24985b] w-8 text-right">{skill.mastery_level}/5</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {report.next_lesson_suggestions && (
                                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                                Next Lesson Focus
                                            </h4>
                                            <p className="text-sm font-bold text-blue-900">{report.next_lesson_suggestions}</p>
                                        </div>
                                    )}

                                    {/* 🚀 CONTROLS */}
                                    {!report.is_approved && (
                                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                                            <button onClick={handleStartEdit} className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-colors">Edit Report</button>
                                            <button onClick={handleApproveReport} className="flex-[2] bg-[#24985b] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#24985b]/20 hover:scale-[1.02] transition-transform">
                                                Approve & Notify Parent
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Quick Actions</h2>

                    {booking.status === 'requested' && (
                        <button onClick={() => handleStatusUpdate('accepted')} className="w-full bg-[#24985b] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#24985b]/20 hover:scale-[1.02] transition-all">Confirm Booking</button>
                    )}

                    <button onClick={() => setIsRescheduling(true)} className="w-full bg-blue-50 text-blue-600 py-4 rounded-2xl font-black border-2 border-blue-100 hover:bg-blue-100 transition-all">Reschedule</button>

                    {booking.payment_status !== 'paid' && (
                        <button onClick={() => handleStatusUpdate(booking.status, { payment_status: 'paid' })} className="w-full bg-orange-50 text-orange-600 py-4 rounded-2xl font-black border-2 border-orange-100 hover:bg-orange-100 transition-all">Mark as Paid</button>
                    )}

                    <button onClick={() => handleStatusUpdate('cancelled')} className="w-full bg-white text-red-400 py-4 rounded-2xl font-bold border-2 border-gray-50 hover:border-red-50 hover:text-red-500 transition-all">Cancel Lesson</button>
                </div>
            </div>
        </div>
    );
}

const CheckIcon = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const PlusIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>;