'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function StepThree({ formData, updateFormData, nextStep, prevStep }) {
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMatchingTutors() {
            try {
                // 1. Fetch the selected student to get their exact Year Level
                let targetYear = null;
                // Assuming you store the student ID in formData.studentId from Step 1
                if (formData.studentId) {
                    const { data: student } = await supabase.from('students').select('year_level').eq('id', formData.studentId).single();
                    if (student && student.year_level) {
                        // Extracts the number (e.g. "Year 12" -> 12)
                        const match = String(student.year_level).match(/\d+/);
                        if (match) targetYear = parseInt(match[0]);
                    }
                }

                // 2. Fetch live profiles for all tutors
                const { data: tutorProfiles, error } = await supabase.from('profiles').select('*').eq('role', 'tutor');
                if (error) throw error;

                // 3. Filter and Calculate Exact Rates
                const matchedTutors = (tutorProfiles || []).filter(tutor => {
                    // Check Subject Match
                    const safeSubjects = Array.isArray(tutor.subjects) ? tutor.subjects : [];
                    if (!safeSubjects.includes(formData.subject)) return false;

                    // Standardize the rates into the new array format
                    let rates = [];
                    if (Array.isArray(tutor.hourly_rates)) {
                        rates = tutor.hourly_rates;
                    } else if (tutor.hourly_rates?.year_1_6) {
                        // Fallback for old object style
                        rates = [
                            { min: 1, max: 6, rate: tutor.hourly_rates.year_1_6 },
                            { min: 7, max: 13, rate: tutor.hourly_rates.year_7_12 }
                        ];
                    }

                    // Check Year Level Match & Set Exact Rate
                    if (targetYear !== null) {
                        // Find the tier where the student's year falls between min and max
                        const applicableTier = rates.find(r => targetYear >= r.min && targetYear <= r.max);

                        //   If the tutor doesn't have a tier for this year, filter them out!
                        if (!applicableTier) return false;

                        tutor.exactRate = applicableTier.rate;
                    } else {
                        // Fallback: If we couldn't find the student's year, just show their lowest possible rate
                        const lowest = Math.min(...rates.map(r => r.rate));
                        tutor.exactRate = lowest === Infinity ? 'TBD' : lowest;
                    }

                    tutor.displaySubjects = [formData.subject];
                    return true;
                });

                setTutors(matchedTutors);
            } catch (error) {
                console.error("Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        }

        if (formData.subject) fetchMatchingTutors();
    }, [formData.subject, formData.studentId]);

    if (loading) return <div className="py-12 text-center text-[#24985b] font-black animate-pulse">Finding the perfect match for {formData.subject}...</div>;

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Choose a Tutor</h2>
                <p className="text-gray-500 font-medium text-sm mt-1">Select an expert for {formData.subject}.</p>
            </div>

            {tutors.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <p className="text-gray-500 font-medium">We couldn't find a {formData.subject} tutor for this specific year level right now.</p>
                    <button onClick={prevStep} className="mt-4 text-[#24985b] font-black hover:underline">
                        &larr; Go back and select a different subject
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tutors.map((tutor) => {
                        const isSelected = formData.tutorId === tutor.id;
                        const displayRate = tutor.exactRate;

                        return (
                            <button
                                key={tutor.id}
                                onClick={() => updateFormData({ tutorId: tutor.id, tutorName: tutor.full_name || 'Tutor', rate: displayRate })}
                                className={`text-left p-5 rounded-[1.5rem] border-2 transition-all duration-200 flex items-center justify-between active:scale-[0.98] ${isSelected ? 'border-[#24985b] bg-[#eaf6ef] shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black ${isSelected ? 'bg-[#24985b] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        {(tutor.full_name || 'T').charAt(0).toUpperCase()}
                                    </div>

                                    <div>
                                        <p className={`font-black text-lg ${isSelected ? 'text-[#24985b]' : 'text-gray-900'}`}>
                                            {tutor.full_name || 'Unnamed Tutor'}
                                        </p>
                                        <div className="flex gap-2 mt-1">
                                            {tutor.displaySubjects?.map(sub => (
                                                <span key={sub} className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${isSelected ? 'bg-white text-[#24985b]' : 'bg-gray-100 text-gray-500'}`}>
                                                    {sub}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rate</p>
                                        <p className="font-black text-xl text-gray-900">
                                            ${displayRate}
                                            {displayRate !== 'TBD' && <span className="text-sm font-bold text-gray-400">/hr</span>}
                                        </p>
                                    </div>
                                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-[#24985b] bg-[#24985b]' : 'border-gray-200 bg-white'
                                        }`}>
                                        {isSelected && (
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
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

            <div className="flex justify-between items-center pt-8 border-t border-gray-100 mt-8">
                <button onClick={prevStep} className="px-6 py-4 rounded-2xl font-bold text-gray-500 bg-white border-2 border-gray-100 hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95">
                    Back
                </button>
                <button onClick={nextStep} disabled={!formData.tutorId} className="bg-[#24985b] text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-[#24985b]/20 hover:bg-[#1d824d] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2">
                    Continue
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
}