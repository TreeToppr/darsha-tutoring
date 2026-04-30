'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function StudentBookingWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Core Data
    const [student, setStudent] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [busySlots, setBusySlots] = useState([]);
    const [workingHours, setWorkingHours] = useState([]);

    // Booking State
    const [formData, setFormData] = useState({
        subject: '',
        tutorTableId: null,   // For DB Insert
        tutorProfileId: null, // For Calendar Fetch
        tutorName: '',
        tutorAvatar: '',
        tutorHomeAddress: '',
        rate: 0,
        lessonMode: 'online',
        parentAddress: '',
        booking_address_text: '',
        travelTime: 0,
        travelFee: 0,
        duration: 60,
        date: '',
        time: '',
        price: 0
    });

    const [isCalculating, setIsCalculating] = useState(false);

    // Calendar State
    const [weekOffset, setWeekOffset] = useState(0);
    const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

    useEffect(() => {
        const studentId = localStorage.getItem('student_id');
        if (!studentId) return router.push('/auth/sign-in');
        fetchInitialData(studentId);
    }, []);

    async function fetchInitialData(studentId) {
        try {
            // 1. Get Student
            const { data: studentData, error: studentError } = await supabase.from('students').select('*').eq('id', studentId).single();
            if (studentError || !studentData) throw new Error("Could not load student profile.");
            setStudent(studentData);

            // Fetch Parent Address to pre-fill In-Person location
            const { data: parentProfile } = await supabase.from('profiles').select('address').eq('id', studentData.parent_id).maybeSingle();
            const parentSavedAddress = parentProfile?.address || '';

            // 2. Get Tutors & Calculate Rates based on Student's Year
            const targetYear = studentData.year_level ? parseInt(String(studentData.year_level).replace(/\D/g, '')) : null;

            // 🚀 FIXED FETCH: Now grabbing home_address and hourly_rates from profile!
            const { data: tutorData, error: tutorErr } = await supabase
                .from('tutors')
                .select('*, profiles(hourly_rates, home_address, avatar_url)')
                .eq('is_active', true);

            if (tutorErr) throw new Error("Could not load tutors.");

            // 3. Extract Subjects and Set Exact Rates
            const allSubjects = new Set();
            const processedTutors = (tutorData || []).map(tutor => {
                let exactRate = 40; // Fallback
                const rates = tutor.profiles?.hourly_rates;

                if (rates && Array.isArray(rates) && targetYear !== null) {
                    const tier = rates.find(r => targetYear >= r.min && targetYear <= r.max);
                    if (tier) exactRate = tier.rate;
                }

                (tutor.subjects || []).forEach(sub => allSubjects.add(sub));

                return { ...tutor, exactRate };
            });

            const availableSubjects = Array.from(allSubjects);
            setSubjects(availableSubjects);
            setTutors(processedTutors);

            // 🚀 AUTO-SKIP LOGIC
            let initialStep = 1;
            let prefilledData = { ...formData, parentAddress: parentSavedAddress };

            if (availableSubjects.length === 1) {
                prefilledData.subject = availableSubjects[0];
                initialStep = 2; // Skip to Tutor

                const matchingTutors = processedTutors.filter(t => (t.subjects || []).includes(availableSubjects[0]));

                if (matchingTutors.length === 1) {
                    // Skip to Format
                    prefilledData.tutorTableId = matchingTutors[0].id;
                    prefilledData.tutorProfileId = matchingTutors[0].profile_id;
                    prefilledData.tutorName = matchingTutors[0].display_name;
                    prefilledData.tutorAvatar = matchingTutors[0].profiles?.avatar_url || '';
                    prefilledData.tutorHomeAddress = matchingTutors[0].profiles?.home_address || '';
                    prefilledData.rate = matchingTutors[0].exactRate;
                    prefilledData.price = matchingTutors[0].exactRate;
                    initialStep = 3;
                }
            }

            setFormData(prefilledData);
            setStep(initialStep);

        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    }

    const calculateDistanceFee = async () => {
        if (!formData.parentAddress.trim()) return;
        setIsCalculating(true);
        setErrorMsg('');

        try {
            // 🚀 THE FIX: If the database address is ever missing, gracefully fall back to your HQ!
            const originBase = formData.tutorHomeAddress || "9 Benbow Street, St Heliers, Auckland";

            const response = await fetch('/api/distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: originBase, destination: formData.parentAddress })
            });

            const data = await response.json();
            if (response.ok && data.minutes) {
                setFormData(prev => ({
                    ...prev,
                    travelTime: data.minutes,
                    travelFee: data.minutes * 1.00,
                    booking_address_text: prev.parentAddress
                }));
            } else {
                setErrorMsg(data.error || "Address not found.");
            }
        } catch (error) {
            setErrorMsg(error.message || "Calculation failed.");
        }
        setIsCalculating(false);
    };

    // --- CALENDAR LOGIC ---
    const getLocalYYYYMMDD = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const today = new Date();
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        d.setDate(d.getDate() + (weekOffset * 7) + i);
        return d;
    });

    useEffect(() => {
        if (!formData.date) setFormData(prev => ({ ...prev, date: getLocalYYYYMMDD(weekDays[0]) }));
    }, [weekOffset]);

    useEffect(() => {
        async function fetchAvailability() {
            if (!formData.tutorProfileId) return; // 🚀 MUST USE PROFILE ID HERE
            setIsLoadingCalendar(true);
            try {
                const timeMin = new Date(weekDays[0]); timeMin.setHours(0, 0, 0);
                const timeMax = new Date(weekDays[6]); timeMax.setHours(23, 59, 59);

                const { data: { session } } = await supabase.auth.getSession();

                const response = await fetch('/api/tutors/google-freebusy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-google-token': session?.provider_token || ''
                    },
                    // 🚀 THE FIX: Sending the correct profile ID to Google!
                    body: JSON.stringify({ tutorId: formData.tutorProfileId, timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() })
                });

                const data = await response.json();
                if (data.busy) setBusySlots(data.busy);
                if (data.workingHours) setWorkingHours(data.workingHours);
            } catch (err) { console.error(err); }
            setIsLoadingCalendar(false);
        }
        if (step === 5) fetchAvailability();
    }, [formData.tutorProfileId, weekOffset, step]);

    const isSlotAvailable = (dateStr, timeStr) => {
        if (!workingHours || workingHours.length === 0) return false;
        const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
        const dayRules = workingHours.find(w => w.day_of_week === dayName);
        if (!dayRules || !dayRules.is_active) return false;

        const [slotH, slotM] = timeStr.split(':').map(Number);
        const slotStartMins = (slotH * 60) + slotM;
        const [workStartH, workStartM] = dayRules.start_time.split(':').map(Number);
        const [workEndH, workEndM] = dayRules.end_time.split(':').map(Number);

        if (slotStartMins < ((workStartH * 60) + workStartM) || slotStartMins >= ((workEndH * 60) + workEndM)) return false;

        const slotStart = new Date(`${dateStr}T${timeStr}:00`);
        if (slotStart < new Date()) return false;
        const slotEnd = new Date(slotStart.getTime() + formData.duration * 60000);

        return !busySlots.some(busy => {
            return (slotStart < new Date(busy.end) && slotEnd > new Date(busy.start));
        });
    };

    // 🚀 SMART FEATURE: Auto-select next available day for students
    useEffect(() => {
        if (isLoadingCalendar || workingHours.length === 0) return;

        const checkHasSlots = (dateStr) => {
            const allSlots = [...timeGroups.Morning, ...timeGroups.Afternoon, ...timeGroups.Evening];
            return allSlots.some(t => isSlotAvailable(dateStr, t));
        };

        if (!checkHasSlots(formData.date)) { // Students use formData.date
            const nextAvailableStr = weekDays.map(d => getLocalYYYYMMDD(d)).find(dStr => checkHasSlots(dStr));

            if (nextAvailableStr) {
                setFormData(prev => ({ ...prev, date: nextAvailableStr, time: '' }));
            } else if (weekOffset < 4) {
                setWeekOffset(prev => prev + 1);
            }
        }
    }, [isLoadingCalendar]);

    const timeGroups = {
        Morning: ["08:00", "09:00", "10:00", "11:00", "12:00"],
        Afternoon: ["13:00", "14:00", "15:00", "16:00"],
        Evening: ["17:00", "18:00", "19:00", "20:00", "21:00"]
    };

    // --- SUBMISSION ---
    const handleSubmit = async () => {
        setLoading(true);
        const [startHours, startMins] = formData.time.split(':').map(Number);
        const totalMins = (startHours * 60) + startMins + formData.duration;
        const endTime = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;

        const travelFee = formData.lessonMode === 'in-person' ? formData.travelFee : 0;
        const totalPrice = formData.price + travelFee;

        // 1. We added .select('id').single() to retrieve the generated bookingId
        const { data: newBooking, error } = await supabase.from('bookings').insert([{
            student_id: student.id,
            parent_id: student.parent_id,
            tutor_id: formData.tutorTableId,
            subject: formData.subject,
            session_date: formData.date,
            start_time: formData.time,
            end_time: endTime,
            duration: formData.duration,
            amount_base: formData.price,
            amount_travel: travelFee,
            amount_total: totalPrice,
            status: 'requested',
            payment_status: 'unpaid',
            lesson_mode: formData.lessonMode.replace('-', '_'),
            booking_address_text: formData.lessonMode === 'in-person' ? formData.booking_address_text : null
        }]).select('id').single();

        if (!error && newBooking) {
            // 2. Trigger the Google Calendar generation API immediately!
            try {
                fetch('/api/bookings/add-to-google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: newBooking.id,
                        studentId: student.id // 🚀 Send the student ID to prove who is making the request
                    })
                }).catch(err => console.error("Calendar Sync Error:", err));
            } catch (err) {
                console.error("Failed to trigger calendar API:", err);
            }

            // Move to success screen
            setStep(6);
        } else {
            alert("Error requesting lesson: " + error?.message);
        }
        setLoading(false);
    };

    const canContinueFormat = formData.lessonMode === 'online' || (formData.lessonMode === 'in-person' && formData.booking_address_text !== '');
    const currentTravelFee = formData.lessonMode === 'in-person' ? formData.travelFee : 0;
    const displayTotal = formData.price + currentTravelFee;

    if (loading && step === 1) return <div className="min-h-screen flex items-center justify-center font-black text-[#24985b] animate-pulse text-xl">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#f8faff] p-4 md:p-12 font-sans pb-32">
            <div className="max-w-2xl mx-auto space-y-6">

                {step < 6 && (
                    <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="text-sm font-bold text-gray-400 hover:text-[#24985b] flex items-center gap-2">
                        &larr; Back
                    </button>
                )}

                <div className="bg-white border-4 border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-sm space-y-6">

                    {errorMsg && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-100 shadow-sm">{errorMsg}</div>
                    )}

                    {/* DYNAMIC SUMMARY BREADCRUMBS */}
                    {step > 1 && step < 6 && (
                        <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-gray-50">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Your Selection:</span>

                            {formData.subject && (
                                <div className="flex items-center gap-2 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-100">
                                    <span className="text-[#24985b]">📚</span> {formData.subject}
                                </div>
                            )}

                            {step > 2 && formData.tutorName && (
                                <>
                                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                    <div className="flex items-center gap-2 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-100">
                                        <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                                            {formData.tutorAvatar ? <img src={formData.tutorAvatar} className="w-full h-full object-cover" /> : <span className="bg-[#24985b] text-white w-full h-full flex items-center justify-center text-[8px]">{formData.tutorName[0]}</span>}
                                        </div>
                                        {formData.tutorName}
                                    </div>
                                </>
                            )}

                            {step > 4 && (
                                <>
                                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                    <div className="flex items-center gap-2 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-100">
                                        <span className="text-[#24985b]">⏱️</span> {formData.duration} mins
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* STEP 1: SUBJECT */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <h1 className="text-3xl font-black text-gray-900 mb-6">What do you want to study?</h1>
                            {subjects.length === 0 ? (
                                <div className="text-center p-8 bg-gray-50 rounded-2xl font-bold text-gray-400">No subjects currently available.</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {subjects.map(sub => (
                                        <button key={sub} onClick={() => { setFormData({ ...formData, subject: sub }); setStep(2); }}
                                            className={`p-6 rounded-2xl font-bold text-lg border-2 transition-all ${formData.subject === sub ? 'border-[#24985b] bg-[#eaf6ef] text-[#24985b]' : 'border-gray-100 hover:border-[#24985b]/30'}`}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: TUTOR */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <h1 className="text-3xl font-black text-gray-900 mb-6">Choose your Tutor</h1>
                            <div className="space-y-3">
                                {tutors.filter(t => (t.subjects || []).includes(formData.subject)).map(t => (
                                    <button key={t.id} onClick={() => {
                                        setFormData({
                                            ...formData,
                                            tutorTableId: t.id,
                                            tutorProfileId: t.profile_id,
                                            tutorName: t.display_name,
                                            tutorAvatar: t.profiles?.avatar_url || '',
                                            tutorHomeAddress: t.profiles?.home_address || '',
                                            rate: t.exactRate,
                                            price: t.exactRate
                                        });
                                        setStep(3);
                                    }}
                                        className="w-full p-6 rounded-2xl border-2 border-gray-100 hover:border-[#24985b] transition-all flex items-center justify-between text-left group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center font-black text-xl overflow-hidden border-2 border-transparent group-hover:border-[#24985b] transition-colors shrink-0">
                                                {t.profiles?.avatar_url ? (
                                                    <img src={t.profiles.avatar_url} className="w-full h-full object-cover" alt={t.display_name} />
                                                ) : (
                                                    <span className="group-hover:text-[#24985b]">{t.display_name[0]}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-xl text-gray-900">{t.display_name}</p>
                                                <p className="text-sm font-bold text-gray-400">Teaches {formData.subject}</p>
                                            </div>
                                        </div>
                                        <svg className="w-6 h-6 text-gray-300 group-hover:text-[#24985b] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: FORMAT & LOCATION */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 mb-2">Lesson Format</h1>
                                <p className="text-gray-500 font-medium">How would you like to meet?</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => { setFormData({ ...formData, lessonMode: 'online', travelFee: 0, travelTime: 0, booking_address_text: '' }); setErrorMsg(''); }}
                                    className={`text-left p-6 rounded-2xl border-2 transition-all flex flex-col items-start ${formData.lessonMode === 'online' ? 'border-[#24985b] bg-[#eaf6ef] shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                                >
                                    <VideoIcon className={`w-7 h-7 mb-3 ${formData.lessonMode === 'online' ? 'text-[#24985b]' : 'text-gray-400'}`} />
                                    <p className="font-bold text-gray-900 text-lg">Online</p>
                                    <p className="text-gray-500 text-sm mt-1">Google Meet Call</p>
                                </button>

                                <button onClick={() => setFormData({ ...formData, lessonMode: 'in-person' })}
                                    className={`text-left p-6 rounded-2xl border-2 transition-all flex flex-col items-start ${formData.lessonMode === 'in-person' ? 'border-[#24985b] bg-[#eaf6ef] shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                                >
                                    <LocationIcon className={`w-7 h-7 mb-3 ${formData.lessonMode === 'in-person' ? 'text-[#24985b]' : 'text-gray-400'}`} />
                                    <p className="font-bold text-gray-900 text-lg">In-Person</p>
                                    <p className="text-gray-500 text-sm mt-1">Tutor travels to you</p>
                                </button>
                            </div>

                            {formData.lessonMode === 'in-person' && (
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 animate-in slide-in-from-top-4">
                                    <h3 className="font-bold text-gray-900 mb-1">Where will the lesson be?</h3>
                                    <p className="text-sm text-gray-500 mb-4">Confirm your address to calculate travel.</p>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <input type="text" placeholder="Your home address" value={formData.parentAddress} onChange={(e) => setFormData({ ...formData, parentAddress: e.target.value })} className="flex-1 p-4 rounded-xl border border-gray-300 font-bold focus:outline-none focus:border-[#24985b] transition-all" />
                                        <button onClick={calculateDistanceFee} disabled={!formData.parentAddress.trim() || isCalculating} className="bg-gray-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50">
                                            {isCalculating ? 'Calculating...' : 'Calculate Fee'}
                                        </button>
                                    </div>
                                    {formData.travelTime > 0 && !errorMsg && !isCalculating && (
                                        <p className="mt-4 text-sm font-bold text-[#24985b] bg-white p-3 rounded-lg border border-[#24985b]/20">
                                            ✅ Travel fee calculated: ${formData.travelFee.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="pt-4 flex justify-end border-t border-gray-50">
                                <button onClick={() => setStep(4)} disabled={!canContinueFormat} className="bg-[#24985b] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 flex items-center gap-2">
                                    Continue <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: DURATION */}
                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <h1 className="text-3xl font-black text-gray-900 mb-2">How long?</h1>
                            <p className="text-gray-500 font-bold mb-6">Your rate is <span className="text-[#24985b]">${formData.rate}/hr</span></p>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                                {[60, 90, 120].map(mins => {
                                    const basePrice = (mins / 60) * formData.rate;
                                    return (
                                        <button key={mins} onClick={() => { setFormData({ ...formData, duration: mins, price: basePrice }); setStep(5); }}
                                            className="p-6 rounded-2xl border-2 border-gray-100 hover:border-[#24985b] transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
                                        >
                                            <span className="font-black text-2xl text-gray-900">{mins} mins ({mins / 60} hours)</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: DATE & TIME */}
                    {step === 5 && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <h1 className="text-3xl font-black text-gray-900 mb-6">Pick a Time</h1>

                            {/* Days Picker */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar">
                                <button onClick={() => setWeekOffset(p => Math.max(0, p - 1))} className="p-2 bg-gray-50 rounded-xl font-bold text-gray-400 hover:text-[#24985b]">&larr;</button>
                                {weekDays.map(date => {
                                    const dateStr = getLocalYYYYMMDD(date);
                                    return (
                                        <button key={dateStr} onClick={() => setFormData({ ...formData, date: dateStr, time: '' })}
                                            className={`min-w-[80px] p-3 rounded-xl border-2 flex flex-col items-center transition-all shrink-0 ${formData.date === dateStr ? 'border-[#24985b] bg-[#eaf6ef] text-[#24985b]' : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-xs font-bold uppercase tracking-widest">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                            <span className="text-2xl font-black">{date.getDate()}</span>
                                        </button>
                                    );
                                })}
                                <button onClick={() => setWeekOffset(p => p + 1)} className="p-2 bg-gray-50 rounded-xl font-bold text-gray-400 hover:text-[#24985b]">&rarr;</button>
                            </div>

                            {/* Time Slots */}
                            <div className="mt-6 min-h-[200px] relative">
                                {isLoadingCalendar ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center font-bold text-[#24985b] animate-pulse bg-white/80 z-10 rounded-xl">
                                        <svg className="w-8 h-8 animate-spin mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Syncing Calendar...
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {Object.entries(timeGroups).map(([group, slots]) => {
                                            const validSlots = slots.filter(time => isSlotAvailable(formData.date, time));
                                            if (validSlots.length === 0) return null;
                                            return (
                                                <div key={group} className="border-b border-gray-50 pb-4 last:border-0">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        {group === 'Morning' ? '🌅' : group === 'Afternoon' ? '☀️' : '🌙'} {group}
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {validSlots.map(time => (
                                                            <button key={time} onClick={() => setFormData({ ...formData, time })}
                                                                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${formData.time === time ? 'bg-[#24985b] border-[#24985b] text-white shadow-md shadow-[#24985b]/20' : 'border-gray-100 text-gray-600 hover:border-[#24985b]/50 hover:bg-emerald-50/50'}`}
                                                            >
                                                                {parseInt(time) > 12 ? `${parseInt(time) - 12}:00 PM` : parseInt(time) === 12 ? '12:00 PM' : `${time} AM`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Rate</div>
                                    <div className="font-black text-3xl text-gray-900">${displayTotal.toFixed(2)}</div>
                                    {currentTravelFee > 0 && <div className="text-xs font-bold text-orange-500 mt-1">Includes ${currentTravelFee} Travel Fee</div>}
                                </div>
                                <button onClick={handleSubmit} disabled={!formData.time || loading} className="bg-[#24985b] text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-[#24985b]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center gap-2">
                                    {loading ? 'Sending...' : 'Request Lesson'}
                                    {!loading && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: SUCCESS */}
                    {step === 6 && (
                        <div className="text-center py-8 animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-[#eaf6ef] text-[#24985b] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#24985b]/20">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">Lesson Requested!</h1>
                            <p className="text-gray-500 font-medium mb-8 text-sm">We've sent a notification to your parent to approve and pay for this lesson.</p>

                            <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 mb-8 text-left">
                                <p className="font-black text-lg text-gray-900">{formData.subject} <span className="text-gray-400 font-medium">with</span> {formData.tutorName}</p>
                                <p className="text-sm font-bold text-[#24985b] mt-1">
                                    {new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} @ {parseInt(formData.time) > 12 ? `${parseInt(formData.time) - 12}:00 PM` : parseInt(formData.time) === 12 ? '12:00 PM' : `${formData.time} AM`}
                                </p>
                            </div>

                            <button onClick={() => router.push('/student-dashboard')} className="bg-gray-900 text-white w-full py-5 rounded-[1.5rem] font-black hover:bg-black active:scale-95 transition-all shadow-xl">
                                Back to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Icons
function VideoIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>; }
function LocationIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }