'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function StepTwo({ formData, updateFormData, nextStep, prevStep }) {
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAvailableSubjects() {
            // Fetch directly from your dedicated 'subjects' table
            const { data, error } = await supabase
                .from('subjects')
                .select('name');

            if (!error && data) {
                // Extract just the string names from the returned rows
                const subjectNames = data.map(sub => sub.name);
                setAvailableSubjects(subjectNames);
            } else if (error) {
                console.error("Error fetching subjects:", error);
            }

            setLoading(false);
        }

        fetchAvailableSubjects();
    }, []);

    if (loading) return <div className="py-12 text-center text-gray-500 font-medium animate-pulse">Loading available subjects...</div>;

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Select Subject</h2>
                <p className="text-gray-500 text-sm mt-1">What subject does {formData.studentName?.split(' ')[0] || 'the student'} need help with?</p>
            </div>

            {availableSubjects.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-500">No subjects are currently available.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableSubjects.map((subject) => {
                        const isSelected = formData.subject === subject;
                        return (
                            <button
                                key={subject}
                                onClick={() => updateFormData({ subject })}
                                className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 ${isSelected
                                        ? 'border-[#24985b] bg-[#eaf6ef] shadow-sm'
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <p className={`font-bold text-lg ${isSelected ? 'text-[#24985b]' : 'text-gray-900'}`}>
                                    {subject}
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Navigation Footer */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                <button
                    onClick={prevStep}
                    className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={nextStep}
                    disabled={!formData.subject}
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