'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function PeoplePage() {
    const [activeTab, setActiveTab] = useState('students');

    // Data States
    const [students, setStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);

    // View State for Tutor Profile
    const [selectedTutor, setSelectedTutor] = useState(null);

    // Modal States
    const [modal, setModal] = useState({ show: false, student: null });
    const [formData, setFormData] = useState({
        full_name: '',
        year_level: '',
        can_student_book: false,
        custom_hourly_rate: ''
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: studentData } = await supabase
                .from('students')
                .select('*')
                .eq('parent_id', user.id);
            setStudents(studentData || []);

            // 🚀 UPDATED FETCH: Now grabbing phone_number too!
            const { data: tutorData } = await supabase
                .from('tutors')
                .select('*, profiles(email, phone_number, hourly_rates)')
                .eq('is_active', true);
            setTutors(tutorData || []);
        }
        setLoading(false);
    }

    async function handleSave(e) {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            full_name: formData.full_name,
            year_level: formData.year_level ? parseInt(formData.year_level) : null,
            can_student_book: formData.can_student_book,
            custom_hourly_rate: formData.custom_hourly_rate ? parseFloat(formData.custom_hourly_rate) : null
        };

        if (modal.student) {
            const { error } = await supabase.from('students').update(payload).eq('id', modal.student.id);
            if (!error) {
                closeModal();
                fetchAllData();
            } else {
                alert("Update error: " + error.message);
            }
        } else {
            try {
                const res = await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, parentId: user.id })
                });
                const result = await res.json();
                if (result.success) {
                    closeModal();
                    fetchAllData();
                }
            } catch (err) { alert("Error saving student."); }
        }
    }

    const closeModal = () => {
        setFormData({ full_name: '', year_level: '', can_student_book: false, custom_hourly_rate: '' });
        setModal({ show: false, student: null });
    };

    // Helper to calculate rate ranges 
    const getRateRange = (tutor) => {
        const ratesData = tutor.profiles?.hourly_rates;
        if (!ratesData || !Array.isArray(ratesData) || ratesData.length === 0) return "Rates vary";

        const rates = ratesData.map(r => r.rate);
        const min = Math.min(...rates);
        const max = Math.max(...rates);
        if (min === max) return `$${min}/hr`;
        return `$${min} - $${max}/hr`;
    };

    // Helper to format the phone number for SMS links
    const formatPhoneForLink = (phone) => {
        if (!phone) return '';
        // Strip spaces and ensure it has a country code, assuming NZ (+64) if it starts with 0
        let cleaned = phone.replace(/[^0-9+]/g, '');
        if (cleaned.startsWith('0')) cleaned = '+64' + cleaned.substring(1);
        return cleaned;
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-[#24985b] font-bold text-xl">Loading Directory...</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 pb-32">

            {/* Header Area (Hides if viewing a specific tutor) */}
            {!selectedTutor && (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">People</h1>
                            <p className="text-gray-500 mt-2 font-medium">Manage your children and browse our experts.</p>
                        </div>

                        {activeTab === 'students' && (
                            <button
                                onClick={() => setModal({ show: true, student: null })}
                                className="bg-[#24985b] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[#24985b]/20 hover:scale-105 transition-all w-full md:w-auto"
                            >
                                + Add Student
                            </button>
                        )}
                    </div>

                    <div className="flex gap-4 mb-8 border-b-2 border-gray-100 pb-px">
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`pb-4 text-lg font-black transition-all flex items-center gap-2 px-2 border-b-4 ${activeTab === 'students' ? 'border-[#24985b] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            My Children
                            <span className={`px-2 py-0.5 rounded-lg text-xs ${activeTab === 'students' ? 'bg-emerald-100 text-[#24985b]' : 'bg-gray-100 text-gray-500'}`}>{students.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('tutors')}
                            className={`pb-4 text-lg font-black transition-all flex items-center gap-2 px-2 border-b-4 ${activeTab === 'tutors' ? 'border-[#24985b] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Tutor Directory
                            <span className={`px-2 py-0.5 rounded-lg text-xs ${activeTab === 'tutors' ? 'bg-emerald-100 text-[#24985b]' : 'bg-gray-100 text-gray-500'}`}>{tutors.length}</span>
                        </button>
                    </div>
                </>
            )}

            {/* TAB CONTENT: STUDENTS */}
            {activeTab === 'students' && !selectedTutor && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-300">
                    {/* ... (Student mapping logic remains identical) ... */}
                    {students.length === 0 ? (
                        <div className="col-span-full p-12 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                            <p className="text-gray-500 font-bold mb-4">You haven't added any children yet.</p>
                            <button onClick={() => setModal({ show: true, student: null })} className="text-[#24985b] font-black hover:underline">Add your first student &rarr;</button>
                        </div>
                    ) : (
                        students.map(student => (
                            <div key={student.id} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col group hover:border-[#24985b] transition-all relative">
                                <div className="flex items-center gap-5 mb-4">
                                    <div className="w-16 h-16 bg-[#eaf6ef] text-[#24985b] rounded-2xl flex items-center justify-center font-black text-2xl uppercase">
                                        {student.full_name?.[0] || 'S'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{student.full_name}</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Year {student.year_level || 'N/A'}</p>
                                        {student.can_student_book && <span className="text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-black uppercase mt-2 inline-block">Portal Booking Active</span>}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Billing Code</span>
                                        <span className="font-mono font-black text-[#24985b] bg-[#eaf6ef] px-3 py-1.5 rounded-lg text-sm tracking-widest">
                                            {student.billing_code || 'PENDING'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setFormData({ full_name: student.full_name, year_level: student.year_level || '', can_student_book: student.can_student_book || false, custom_hourly_rate: student.custom_hourly_rate || '' });
                                            setModal({ show: true, student: student });
                                        }}
                                        className="text-gray-300 hover:text-[#24985b] font-bold text-xs uppercase"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB CONTENT: TUTORS (GRID VIEW) */}
            {activeTab === 'tutors' && !selectedTutor && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-300">
                    {tutors.length === 0 ? (
                        <div className="col-span-full p-12 text-center text-gray-400 font-bold">No active tutors found.</div>
                    ) : (
                        tutors.map(tutor => (
                            <div key={tutor.id} className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col hover:border-[#24985b]/30 transition-all group">
                                <div className="p-8 pb-6 bg-gradient-to-b from-gray-50 to-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-20 h-20 bg-[#24985b] text-white rounded-[1.5rem] flex items-center justify-center font-black text-3xl uppercase shadow-lg shadow-[#24985b]/20 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                                            {tutor.profiles?.avatar_url ? (
                                                <img src={tutor.profiles.avatar_url} className="w-full h-full object-cover" alt={tutor.display_name} />
                                            ) : (
                                                tutor.display_name?.[0] || 'T'
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-emerald-50 text-[#24985b] border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest block mb-1">Verified Tutor</span>
                                            <span className="text-xs font-bold text-gray-400">{tutor.experience_years ? `${tutor.experience_years} Yrs Exp.` : 'Experienced'}</span>
                                        </div>
                                    </div>
                                    <h3 className="font-black text-gray-900 text-2xl">{tutor.display_name}</h3>
                                    <p className="text-gray-500 text-sm mt-2 font-medium line-clamp-2">
                                        {tutor.bio || "Passionate about helping students achieve their academic goals and build confidence."}
                                    </p>
                                </div>

                                <div className="p-8 pt-0 mt-auto space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subjects</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(tutor.subjects || []).slice(0, 3).map(sub => (
                                                <span key={sub} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold">{sub}</span>
                                            ))}
                                            {(tutor.subjects || []).length > 3 && <span className="text-xs font-bold text-gray-400 py-1">+{tutor.subjects.length - 3} more</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Est. Rates</p>
                                            <p className="font-black text-[#24985b] text-lg">{getRateRange(tutor)}</p>
                                        </div>

                                        {/* 🚀 CHANGED TO VIEW PROFILE */}
                                        <button
                                            onClick={() => setSelectedTutor(tutor)}
                                            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* 🚀 NEW: DETAILED TUTOR PROFILE VIEW */}
            {selectedTutor && (
                <div className="animate-in slide-in-from-right-8 duration-300">
                    <button
                        onClick={() => setSelectedTutor(null)}
                        className="mb-8 text-sm font-bold text-gray-400 hover:text-[#24985b] flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                        Back to Directory
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT COLUMN: Main Info */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Hero Card */}
                            <div className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                                <div className="w-20 h-20 bg-[#24985b] text-white rounded-[1.5rem] flex items-center justify-center font-black text-3xl uppercase shadow-lg shadow-[#24985b]/20 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                                    {tutor.profiles?.avatar_url ? (
                                        <img src={tutor.profiles.avatar_url} className="w-full h-full object-cover" alt={tutor.display_name} />
                                    ) : (
                                        tutor.display_name?.[0] || 'T'
                                    )}
                                </div>
                                <div>
                                    <div className="inline-flex items-center gap-2 bg-emerald-50 text-[#24985b] border border-emerald-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        Verified Tutor
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-3">{selectedTutor.display_name}</h1>
                                    <p className="text-lg text-gray-500 font-medium leading-relaxed">
                                        {selectedTutor.bio || "Passionate about helping students achieve their academic goals and build unshakeable confidence in their abilities."}
                                    </p>
                                </div>
                            </div>

                            {/* Subjects */}
                            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
                                <h3 className="text-xl font-black text-gray-900 mb-6">Subjects Taught</h3>
                                <div className="flex flex-wrap gap-3">
                                    {(selectedTutor.subjects || []).map(sub => (
                                        <span key={sub} className="bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-100">{sub}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Experience (Hardcoded for now as requested, but can be dynamic later) */}
                            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
                                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                    <svg className="w-6 h-6 text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" /></svg>
                                    Experience & Qualifications
                                </h3>
                                <div className="space-y-4 text-gray-600 font-medium leading-relaxed">
                                    <p>I am currently studying towards a Bachelor of Science at University. I have been tutoring professionally for over 2 years, specializing in helping students excel in both the NCEA and Cambridge curriculums.</p>
                                    <p>My teaching philosophy revolves around breaking complex concepts down into bite-sized, understandable pieces. Beyond academia, I also spend my spare time teaching at a local Kindergarten, which has refined my patience and adaptability to different learning styles!</p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Rates & Contact */}
                        <div className="space-y-6">

                            {/* Pricing Tiers Card */}
                            <div className="bg-white border-4 border-gray-50 rounded-[2.5rem] p-8 shadow-sm">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Pricing Breakdown</h3>

                                {selectedTutor.profiles?.hourly_rates?.length > 0 ? (
                                    <div className="space-y-4">
                                        {selectedTutor.profiles.hourly_rates.sort((a, b) => a.min - b.min).map((tier, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div>
                                                    <p className="font-bold text-gray-900">
                                                        {tier.min === tier.max ? `Year ${tier.min}` : `Years ${tier.min} - ${tier.max}`}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">School Level</p>
                                                </div>
                                                <div className="text-xl font-black text-[#24985b]">
                                                    ${tier.rate}<span className="text-sm text-gray-400">/hr</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-6 bg-gray-50 rounded-2xl">
                                        <p className="font-bold text-gray-500">Contact tutor for pricing.</p>
                                    </div>
                                )}
                            </div>

                            {/* Contact Action Center */}
                            <div className="bg-[#24985b] rounded-[2.5rem] p-8 text-center text-white shadow-xl shadow-[#24985b]/20">
                                <h3 className="font-black text-2xl mb-2">Get in touch</h3>
                                <p className="text-emerald-100 font-medium text-sm mb-8">Have a question before booking? Reach out directly.</p>

                                <div className="space-y-3">
                                    {selectedTutor.profiles?.phone_number && (
                                        <a
                                            href={`sms:${formatPhoneForLink(selectedTutor.profiles.phone_number)}`}
                                            className="w-full bg-white text-[#24985b] py-4 rounded-2xl font-black shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                            Send a Message
                                        </a>
                                    )}

                                    {selectedTutor.profiles?.email && (
                                        <a
                                            href={`mailto:${selectedTutor.profiles.email}`}
                                            className="w-full bg-[#1d824d] text-white py-4 rounded-2xl font-black hover:bg-[#186b3f] transition-all flex items-center justify-center gap-3"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            Email Tutor
                                        </a>
                                    )}

                                    {!selectedTutor.profiles?.phone_number && !selectedTutor.profiles?.email && (
                                        <div className="p-4 bg-[#1d824d] rounded-xl text-emerald-100 font-bold text-sm">
                                            No contact methods provided.
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CODE (Remains exactly the same) */}
            {modal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    {/* ... Existing Modal Code ... */}
                    <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <h2 className="text-2xl font-black mb-6">{modal.student ? 'Edit Student' : 'New Student'}</h2>

                        <div className="space-y-6 mb-8">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-2">Full Name</label>
                                <input required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#24985b]" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-2">Year Level</label>
                                <input type="number" value={formData.year_level} onChange={(e) => setFormData({ ...formData, year_level: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#24985b]" />
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="pr-4">
                                    <p className="font-black text-gray-900 text-sm">Allow Student to Book</p>
                                    <p className="text-[10px] text-gray-400 font-medium leading-tight mt-1">Enable "Request Lesson" button in the student portal</p>
                                </div>
                                <input type="checkbox" checked={formData.can_student_book} onChange={(e) => setFormData({ ...formData, can_student_book: e.target.checked })} className="w-6 h-6 accent-[#24985b] cursor-pointer" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-2">Custom Hourly Rate ($)</label>
                                <input type="number" step="0.01" placeholder="Standard pricing applies if empty" value={formData.custom_hourly_rate} onChange={(e) => setFormData({ ...formData, custom_hourly_rate: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#24985b] font-bold text-[#24985b]" />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                            <button type="submit" className="flex-[2] bg-[#24985b] text-white py-4 rounded-2xl font-black shadow-lg shadow-[#24985b]/20">Save Profile</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}