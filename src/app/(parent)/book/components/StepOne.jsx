'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import Link from 'next/link';

export default function StepOne({ formData, updateFormData, nextStep }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStudents() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('parent_id', user.id);

            if (!error && data) {
                setStudents(data);
            }
            setLoading(false);
        }
        fetchStudents();
    }, []);

    const handleSelect = (student) => {
        // 🚀 FIX: Pass the correct full_name directly from your schema
        updateFormData({ studentId: student.id, studentName: student.full_name || 'Student' });
    };

    if (loading) return <div className="py-12 text-center text-gray-500 font-medium animate-pulse">Loading your students...</div>;

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Who is this lesson for?</h2>
                <p className="text-gray-500 text-sm mt-1">Select a student from your profile to continue.</p>
            </div>

            {students.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-500 mb-4">You haven't added any students yet.</p>
                    <Link href="/students" className="bg-[#24985b] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#1d824d] transition-colors inline-block">
                        + Add a Student
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {students.map((student) => {
                        const isSelected = formData.studentId === student.id;
                        return (
                            <button
                                key={student.id}
                                onClick={() => handleSelect(student)}
                                className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 ${isSelected
                                    ? 'border-[#24985b] bg-[#eaf6ef] shadow-sm'
                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        {/* 🚀 FIX: Displaying full_name */}
                                        <p className={`font-bold text-lg ${isSelected ? 'text-[#24985b]' : 'text-gray-900'}`}>
                                            {student.full_name || 'Unnamed Student'}
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1">
                                            {student.year_level
                                                ? (String(student.year_level).toLowerCase().includes('year') ? student.year_level : `Year ${student.year_level}`)
                                                : 'Student'}
                                        </p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#24985b] bg-[#24985b]' : 'border-gray-300'
                                        }`}>
                                        {isSelected && (
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                    onClick={nextStep}
                    disabled={!formData.studentId}
                    className="bg-[#24985b] text-white px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-[#1d824d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    Continue
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}