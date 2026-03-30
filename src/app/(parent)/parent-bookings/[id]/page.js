'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ParentBookingDetailPage() {
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data: b } = await supabase
                .from('bookings')
                .select('*, students(*), tutors(profiles(full_name))')
                .eq('id', id)
                .single();

            const { data: r } = await supabase
                .from('lesson_reports')
                .select('*')
                .eq('booking_id', id)
                .eq('is_approved', true)
                .maybeSingle();

            setBooking(b);
            setReport(r);
            setLoading(false);
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 animate-pulse text-gray-400 font-bold text-center">Loading Lesson...</div>;
    if (!booking) return <div className="p-10 text-red-500 text-center">Lesson not found.</div>;

    // Timeline Logic
    const requestedDate = new Date(booking.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
    const sessionDateStr = new Date(booking.session_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });

    const isPast = new Date(`${booking.session_date}T${booking.start_time}`) < new Date();
    const isConfirmed = booking.status === 'accepted' || booking.status === 'completed';
    const isPaid = booking.payment_status === 'paid';

    const steps = [
        { label: 'Requested', date: requestedDate, done: true },
        { label: 'Confirmed', date: isConfirmed ? 'Done' : null, done: isConfirmed },
        { label: 'Lesson Held', date: sessionDateStr, done: isPast },
        { label: 'Paid', date: isPaid ? 'Received' : null, done: isPaid }
    ];

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 pb-32">
            <Link href="/parent-dashboard" className="text-sm font-bold text-gray-400 hover:text-[#24985b] flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                Back to Dashboard
            </Link>

            {/* HERO SECTION (Matches Tutor Style) */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#24985b] opacity-[0.02] rounded-full -translate-y-1/2 translate-x-1/4"></div>
                <div className="relative z-10 space-y-10">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                            {booking.subject} <span className="text-gray-300 font-medium text-3xl md:text-3xl">with</span> {booking.tutors?.profiles?.full_name?.split(' ')[0]}
                        </h1>
                        <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-s">For {booking.students?.full_name}</p>
                    </div>

                    {/* TIMELINE */}
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
                {/* MAIN CONTENT: Lesson Progress / Report */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm min-h-[300px] flex flex-col justify-center">
                        <h2 className="text-xl font-black text-gray-900 mb-8 self-start">Lesson Progress</h2>

                        {report ? (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl">
                                    <h4 className="text-[10px] font-black text-[#24985b] uppercase tracking-widest mb-3">AI Lesson Summary</h4>
                                    <p className="text-gray-600 leading-relaxed italic">"{report.ai_summary}"</p>
                                </div>

                                {report.ai_skills_analysis?.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skills Analysis</h4>
                                        {report.ai_skills_analysis.map((skill, idx) => (
                                            <div key={idx} className="flex items-center gap-4">
                                                <span className="text-xs font-bold text-gray-700 w-1/3 truncate">{skill.skill_name}</span>
                                                <div className="flex-1 flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(level => (
                                                        <div key={level} className={`h-2 flex-1 rounded-full ${level <= skill.mastery_level ? 'bg-[#24985b]' : 'bg-gray-100'}`}></div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* THE "WAITING" PLACEHOLDER */
                            <div className="text-center space-y-2 py-10">
                                <p className="text-xl md:text-2xl font-bold text-gray-300">Waiting for the lesson to be held...</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">A report will appear here after the session.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* SIDEBAR: Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-[12.5px] font-black text-gray-400 uppercase tracking-widest ml-2">Lesson Details</h2>
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4 shadow-sm">
                        <DetailRow label="Date" value={new Date(booking.session_date).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })} />
                        <DetailRow label="Time" value={`${booking.start_time} (${booking.duration}m)`} />
                        <DetailRow label="Tutor" value={booking.tutors?.profiles?.full_name} />
                        <DetailRow label="Amount" value={`$${booking.amount_total}`} />
                        <DetailRow label="Status" value={booking.status} isStatus />
                    </div>

                    <button className="w-full bg-white text-gray-600 py-4 rounded-2xl font-bold border-2 border-gray-50 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Message Tutor
                    </button>

                    {booking.status === 'requested' && (
                        <button className="w-full bg-white text-red-400 py-4 rounded-2xl font-bold border-2 border-gray-50 hover:border-red-50 hover:text-red-500 transition-all">
                            Cancel Request
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailRow({ label, value, isStatus }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            <span className={`text-[15px] text-sm font-bold capitalize ${isStatus ? 'text-[#24985b]' : 'text-gray-900'}`}>{value}</span>
        </div>
    );
}

const CheckIcon = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;