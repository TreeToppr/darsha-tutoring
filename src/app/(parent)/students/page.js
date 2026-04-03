'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ show: false, student: null });
    const [formData, setFormData] = useState({ full_name: '', year_level: '' });

    useEffect(() => { fetchStudents(); }, []);

    async function fetchStudents() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('students').select('*').eq('parent_id', user.id);
            setStudents(data || []);
        }
        setLoading(false);
    }

    async function handleSave(e) {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        if (modal.student) {
            // ✏️ EDIT MODE: Update directly via Supabase (We don't want to change their billing code!)
            const payload = {
                full_name: formData.full_name,
                year_level: formData.year_level ? parseInt(formData.year_level) : null
            };
            const { error } = await supabase.from('students').update(payload).eq('id', modal.student.id);

            if (!error) {
                setFormData({ full_name: '', year_level: '' });
                setModal({ show: false, student: null });
                fetchStudents();
            } else {
                console.error("Update error:", error);
                alert("Failed to update student.");
            }
        } else {
            // 🆕 CREATE MODE: Send to secure backend API to generate the unique code
            try {
                const res = await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName: formData.full_name,
                        yearLevel: formData.year_level ? parseInt(formData.year_level) : null,
                        parentId: user.id
                    })
                });

                const result = await res.json();

                if (result.success) {
                    setFormData({ full_name: '', year_level: '' });
                    setModal({ show: false, student: null });
                    fetchStudents();
                } else {
                    alert("Failed to add student: " + result.error);
                }
            } catch (err) {
                console.error("API error:", err);
                alert("Something went wrong saving the student.");
            }
        }
    }

    if (loading) return <div className="p-20 text-center animate-pulse text-[#24985b] font-bold">Loading Students...</div>;

    return (
        <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Students</h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage your children's profiles.</p>
                </div>
                <button
                    onClick={() => { setFormData({ full_name: '', year_level: '' }); setModal({ show: true, student: null }); }}
                    className="bg-[#24985b] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[#24985b]/20 hover:scale-105 transition-all"
                >
                    + Add Student
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {students.map(student => (
                    <div key={student.id} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col group hover:border-[#24985b] transition-all relative">

                        <div className="flex items-center gap-5 mb-4">
                            <div className="w-16 h-16 bg-[#eaf6ef] text-[#24985b] rounded-2xl flex items-center justify-center font-black text-2xl uppercase shrink-0">
                                {student.full_name?.[0] || 'S'}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg leading-tight">{student.full_name}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Year {student.year_level || 'N/A'}</p>
                            </div>
                        </div>

                        {/* 🚀 THE NEW BILLING CODE BADGE */}
                        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Billing / Username Code</span>
                                <span className="font-mono font-black text-[#24985b] bg-[#eaf6ef] px-3 py-1.5 rounded-lg text-sm tracking-widest select-all cursor-pointer">
                                    {student.billing_code || 'PENDING'}
                                </span>
                            </div>

                            <button
                                onClick={() => { setFormData({ full_name: student.full_name, year_level: student.year_level || '' }); setModal({ show: true, student: student }); }}
                                className="text-gray-300 hover:text-[#24985b] font-bold text-xs uppercase tracking-tighter transition-colors mt-2"
                            >
                                Edit
                            </button>
                        </div>

                    </div>
                ))}
            </div>

            {/* MODAL REMAINS EXACTLY THE SAME */}
            {modal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <h2 className="text-2xl font-black mb-6">{modal.student ? 'Edit Student' : 'New Student'}</h2>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Name</label>
                                <input
                                    required
                                    value={formData.full_name || ''}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#24985b]"
                                    placeholder="Student name..."
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Year Level</label>
                                <input
                                    type="number"
                                    value={formData.year_level || ''}
                                    onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#24985b]"
                                    placeholder="e.g. 10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setModal({ show: false, student: null })} className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                            <button type="submit" className="flex-[2] bg-[#24985b] text-white py-4 rounded-2xl font-bold shadow-sm hover:bg-[#1d824d] transition-colors">Save</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}