'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function StepSix({ formData, updateFormData, prevStep }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [busySlots, setBusySlots] = useState([]);
    const [workingHours, setWorkingHours] = useState([]);
    const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);

    const [weekOffset, setWeekOffset] = useState(0);
    const [recurringWeeks, setRecurringWeeks] = useState(1);
    const [fetchedStudentName, setFetchedStudentName] = useState('');

    const [expandedGroups, setExpandedGroups] = useState({
        Morning: false,
        Afternoon: false,
        Evening: false
    });

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    useEffect(() => {
        async function getStudent() {
            if (formData.studentId && !formData.studentName) {
                const { data } = await supabase.from('students').select('first_name, name, display_name').eq('id', formData.studentId).single();
                if (data) {
                    setFetchedStudentName(data.first_name || data.display_name || data.name);
                }
            }
        }
        getStudent();
    }, [formData.studentId, formData.studentName]);

    const getLocalYYYYMMDD = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const now = new Date();
    const realTodayYYYYMMDD = getLocalYYYYMMDD(now);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + (weekOffset * 7) + i);
        return d;
    });

    const [selectedDateStr, setSelectedDateStr] = useState(formData.date || realTodayYYYYMMDD);

    const getWeeksLeftInTerm = (dateStr) => {
        if (!dateStr) return 1;
        const [yyyy, mm, dd] = dateStr.split('-');
        const selectedDate = new Date(yyyy, mm - 1, dd);

        const terms = [
            { start: new Date(2026, 1, 2), end: new Date(2026, 3, 2) },
            { start: new Date(2026, 3, 20), end: new Date(2026, 6, 3) },
            { start: new Date(2026, 6, 20), end: new Date(2026, 8, 25) },
            { start: new Date(2026, 9, 12), end: new Date(2026, 11, 16) }
        ];

        const currentTerm = terms.find(t => selectedDate >= t.start && selectedDate <= t.end);
        if (!currentTerm) return 1;

        const diffTime = currentTerm.end.getTime() - selectedDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        const weeksLeft = Math.floor(diffDays / 7) + 1;

        return Math.max(1, weeksLeft);
    };

    const weeksLeftInTerm = getWeeksLeftInTerm(selectedDateStr);

    useEffect(() => {
        if (recurringWeeks !== 1 && recurringWeeks !== 4 && recurringWeeks !== weeksLeftInTerm) {
            setRecurringWeeks(weeksLeftInTerm);
        }
        if (recurringWeeks === 4 && weeksLeftInTerm <= 4) {
            setRecurringWeeks(weeksLeftInTerm);
        }
    }, [selectedDateStr, weeksLeftInTerm, recurringWeeks]);

    useEffect(() => {
        setSelectedDateStr(getLocalYYYYMMDD(weekDays[0]));
        updateFormData({ time: null, date: null });
    }, [weekOffset]);

    const generateTimeSlots = (startHour, endHour) => {
        const slots = [];
        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += 15) {
                const hour = h.toString().padStart(2, '0');
                const minute = m.toString().padStart(2, '0');
                slots.push(`${hour}:${minute}`);
            }
        }
        return slots;
    };

    const timeGroups = {
        Morning: generateTimeSlots(7, 12),
        Afternoon: generateTimeSlots(12, 17),
        Evening: [...generateTimeSlots(17, 22), "22:00"]
    };

    useEffect(() => {
        async function fetchAvailability() {
            setIsLoadingCalendar(true);
            try {
                const timeMinDate = new Date(weekDays[0]);
                timeMinDate.setHours(0, 0, 0);
                const timeMin = timeMinDate.toISOString();

                const timeMaxDate = new Date(weekDays[6]);
                timeMaxDate.setHours(23, 59, 59);
                const timeMax = timeMaxDate.toISOString();

                const { data: { session } } = await supabase.auth.getSession();

                // 🚀 FIXED: Safely sending formData.tutorId. The backend handles the rest!
                const response = await fetch('/api/tutors/google-freebusy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-google-token': session?.provider_token || ''
                    },
                    body: JSON.stringify({ tutorId: formData.tutorId, timeMin, timeMax })
                });

                const data = await response.json();
                if (data.busy) setBusySlots(data.busy);
                if (data.workingHours) setWorkingHours(data.workingHours);
            } catch (err) {
                console.error("Failed to load tutor calendar", err);
            }
            setIsLoadingCalendar(false);
        }

        if (formData.tutorId) fetchAvailability();
    }, [formData.tutorId, weekOffset]);

    const isSlotWithinWorkingHours = (dateStr, timeStr) => {
        if (!workingHours || workingHours.length === 0) return false;

        const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
        const dayRules = workingHours.find(w => w.day_of_week === dayName);

        if (!dayRules || !dayRules.is_active) return false;

        const [slotH, slotM] = timeStr.split(':').map(Number);
        const slotStartMins = (slotH * 60) + slotM;

        const [workStartH, workStartM] = dayRules.start_time.split(':').map(Number);
        const workStartMins = (workStartH * 60) + workStartM;

        const [workEndH, workEndM] = dayRules.end_time.split(':').map(Number);
        const workEndMins = (workEndH * 60) + workEndM;

        return slotStartMins >= workStartMins && slotStartMins < workEndMins;
    };

    const isSlotBusy = (dateStr, timeStr) => {
        const [hours, minutes] = timeStr.split(':');
        const [yyyy, mm, dd] = dateStr.split('-');

        const slotStart = new Date(yyyy, mm - 1, dd, parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        if (slotStart < new Date()) return true;

        const slotEnd = new Date(slotStart.getTime() + (formData.duration || 60) * 60000);

        return busySlots.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return (slotStart < busyEnd && slotEnd > busyStart);
        });
    };

    const handleSelectTime = (time) => {
        updateFormData({ date: selectedDateStr, time: time });
    };

    const handleConfirmBooking = async (paymentMethod = 'poli') => {
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in to book.");

            const { data: realTutor } = await supabase
                .from('tutors')
                .select('id')
                .eq('profile_id', formData.tutorId)
                .single();

            const actualTutorId = realTutor?.id || formData.tutorId;

            const basePrice = formData.price || 70;
            const travelFee = formData.lessonMode === 'in_person' ? (formData.travelFee || 0) : 0;
            const finalTotal = basePrice + travelFee;

            const [startHours, startMins] = formData.time.split(':').map(Number);
            const totalMins = (startHours * 60) + startMins + (formData.duration || 60);
            const endTime = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;

            let recurringGroupId = null;
            if (recurringWeeks > 1) {
                const { data: groupData, error: groupErr } = await supabase
                    .from('recurring_groups')
                    .insert({
                        parent_id: user.id,
                        tutor_id: actualTutorId,
                        student_id: formData.studentId
                    })
                    .select()
                    .single();

                if (groupErr) {
                    console.error("Recurring group creation failed. Falling back to null", groupErr);
                } else {
                    recurringGroupId = groupData.id;
                }
            }

            const bookingsToInsert = [];
            for (let i = 0; i < recurringWeeks; i++) {
                const [yyyy, mm, dd] = formData.date.split('-');
                const sessionDate = new Date(yyyy, mm - 1, dd);
                sessionDate.setDate(sessionDate.getDate() + (i * 7));

                bookingsToInsert.push({
                    parent_id: user.id,
                    tutor_id: actualTutorId,
                    student_id: formData.studentId,
                    subject: formData.subject,
                    session_date: getLocalYYYYMMDD(sessionDate),
                    start_time: formData.time,
                    end_time: endTime,
                    duration: formData.duration || 60,
                    amount_total: finalTotal,
                    status: 'requested',
                    payment_status: 'unpaid',
                    lesson_mode: formData.lessonMode.toLowerCase().replace('-', '_'),
                    is_recurring: recurringWeeks > 1,
                    recurring_group_id: recurringGroupId
                });
            }

            const { data: newBookings, error: insertError } = await supabase.from('bookings').insert(bookingsToInsert).select();
            if (insertError) throw insertError;

            // 🚀 FIXED: Email API successfully uses actualTutorId!
            fetch('/api/email/booking-requested-tutor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tutorId: actualTutorId,
                    studentName: studentFirstName,
                    subject: formData.subject,
                    date: formData.date,
                    time: formData.time,
                    endTime: endTime,
                    parentEmail: user.email
                })
            }).catch(err => console.error("Email notification failed:", err));

            if (paymentMethod === 'poli') {
                const firstBooking = newBookings[0];
                const response = await fetch(`/api/poli/initiate?bookingId=${firstBooking.id}`);
                const result = await response.json();

                if (result.url) {
                    window.location.assign(result.url);
                } else {
                    throw new Error(result.error || "Failed to get payment URL");
                }
            } else if (paymentMethod === 'bank_transfer') {
                const nameString = formData.studentName || fetchedStudentName || 'Student';
                const nameParts = nameString.trim().split(' ');
                const fName = nameParts[0];
                const lInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '';
                const bankRef = `${fName} ${lInitial}`.substring(0, 12).trim();

                router.push(`/parent-dashboard?booking=bank_transfer_pending&ref=${encodeURIComponent(bankRef)}`);
            } else {
                router.push('/parent-dashboard?booking=success');
            }

        } catch (error) {
            console.error("Booking/Payment Error:", error);
            setErrorMsg(error.message || "An unexpected error occurred.");
            setIsSubmitting(false);
        }
    };

    const formatTime = (timeStr, addMins = 0) => {
        if (!timeStr) return '';
        let [hours, minutes] = timeStr.split(':').map(Number);
        let totalMins = hours * 60 + minutes + addMins;
        const ampm = Math.floor(totalMins / 60) >= 12 ? 'PM' : 'AM';
        const displayHour = Math.floor(totalMins / 60) % 12 || 12;
        const displayMin = (totalMins % 60).toString().padStart(2, '0');
        return `${displayHour}:${displayMin} ${ampm}`;
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(val);

    const basePrice = formData.price || 70;
    const travelFee = formData.lessonMode === 'in-person' ? (formData.travelFee || 0) : 0;
    const pricePerLesson = basePrice + travelFee;

    const studentFirstName = formData.studentName?.split(' ')[0] || fetchedStudentName?.split(' ')[0] || 'Student';

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Select Date & Time</h2>
                <p className="text-gray-500 text-sm mt-1">When would you like to schedule with {formData.tutorName?.split(' ')[0] || 'the tutor'}?</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 space-y-3">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Choose a Day</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setWeekOffset(p => Math.max(p - 1, 0))}
                                disabled={weekOffset === 0}
                                className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-[#24985b] disabled:opacity-30 disabled:hover:text-gray-400 transition-all"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setWeekOffset(p => Math.min(p + 1, 4))}
                                disabled={weekOffset === 4}
                                className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-[#24985b] disabled:opacity-30 disabled:hover:text-gray-400 transition-all"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-3 overflow-x-auto pb-4 md:pb-0 hide-scrollbar">
                        {weekDays.map((date) => {
                            const dateStr = getLocalYYYYMMDD(date);
                            const isSelectedDay = selectedDateStr === dateStr;
                            const isActuallyToday = dateStr === realTodayYYYYMMDD;

                            return (
                                <button
                                    key={dateStr}
                                    onClick={() => {
                                        setSelectedDateStr(dateStr);
                                        updateFormData({ time: null, date: dateStr });
                                    }}
                                    className={`flex-shrink-0 md:flex-shrink w-24 md:w-full py-4 md:py-3 px-4 rounded-xl border-2 transition-all flex flex-col md:flex-row items-center justify-center md:justify-between gap-1 md:gap-4 
                ${isSelectedDay
                                            ? 'border-[#24985b] bg-[#eaf6ef] text-[#24985b]'
                                            : isActuallyToday
                                                ? 'border-blue-200 bg-blue-50 text-blue-600 shadow-sm'
                                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-600'
                                        }`}
                                >
                                    <span className={`text-xs md:text-sm font-bold uppercase ${isSelectedDay ? 'text-[#24985b]' : isActuallyToday ? 'text-blue-600' : 'text-gray-400'}`}>
                                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </span>
                                    <span className={`text-xl md:text-lg font-black ${isSelectedDay ? 'text-[#24985b]' : isActuallyToday ? 'text-blue-600' : 'text-gray-900'}`}>
                                        {date.toLocaleDateString('en-US', { month: 'short' })} {date.getDate()}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8 relative min-h-[300px] flex flex-col">
                    {isLoadingCalendar && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                            <div className="animate-pulse font-bold text-[#24985b] flex items-center gap-2">
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Syncing availability...
                            </div>
                        </div>
                    )}

                    {!isLoadingCalendar && (
                        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {Object.entries(timeGroups).map(([groupName, slots]) => {
                                const validSlots = slots.filter(time =>
                                    isSlotWithinWorkingHours(selectedDateStr, time) && !isSlotBusy(selectedDateStr, time)
                                );

                                if (validSlots.length === 0) return null;

                                const isExpanded = expandedGroups[groupName];

                                return (
                                    <div key={groupName} className="border-b border-gray-100 pb-4 last:border-0">
                                        <button
                                            onClick={() => toggleGroup(groupName)}
                                            className="w-full flex items-center justify-between text-sm font-bold text-gray-500 hover:text-gray-800 uppercase tracking-wider mb-4 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2">
                                                {groupName === 'Morning' && <SunRiseIcon className="w-4 h-4 group-hover:text-[#24985b]" />}
                                                {groupName === 'Afternoon' && <SunIcon className="w-4 h-4 group-hover:text-[#24985b]" />}
                                                {groupName === 'Evening' && <MoonIcon className="w-4 h-4 group-hover:text-[#24985b]" />}
                                                <span>{groupName}</span>
                                            </div>
                                            <ChevronIcon isOpen={isExpanded} className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                        </button>

                                        <div className={`grid grid-cols-3 sm:grid-cols-4 gap-3 transition-all duration-300 origin-top ${isExpanded ? 'scale-y-100 opacity-100 h-auto' : 'scale-y-0 opacity-0 h-0 overflow-hidden'}`}>
                                            {validSlots.map(time => {
                                                const isSelectedTime = formData.date === selectedDateStr && formData.time === time;
                                                return (
                                                    <button
                                                        key={time}
                                                        onClick={() => handleSelectTime(time)}
                                                        className={`py-3 rounded-lg border-2 transition-all flex items-center justify-center ${isSelectedTime ? 'border-[#24985b] bg-[#24985b] text-white shadow-md' : 'border-gray-200 text-gray-700 hover:border-[#24985b] bg-white'}`}
                                                    >
                                                        <span className="font-bold">{formatTime(time)}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-8 border-t border-gray-100 pt-6">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Repeat this lesson?</label>
                        <select
                            value={recurringWeeks}
                            onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#24985b]/20 cursor-pointer"
                        >
                            <option value={1}>No, just a one-off lesson</option>
                            {weeksLeftInTerm > 4 && (
                                <option value={4}>Yes, weekly for a month (4 lessons total)</option>
                            )}
                            {weeksLeftInTerm > 1 && (
                                <option value={weeksLeftInTerm}>
                                    Yes, weekly for the rest of the term ({weeksLeftInTerm} lessons total)
                                </option>
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">{errorMsg}</div>}

            <div className="mt-8 border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 p-6 md:p-8 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-3 mb-4 text-xs uppercase tracking-widest">Booking Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student & Subject</p>
                            <p className="font-medium text-gray-900 flex items-center gap-2"><UserIcon className="w-4 h-4 text-gray-400" />{studentFirstName} • {formData.subject}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tutor</p>
                            <p className="font-medium text-gray-900 flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-gray-400" />{formData.tutorName}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Format</p>
                            <p className="font-medium text-gray-900 flex items-center gap-2">
                                {formData.lessonMode === 'in-person' ? <LocationIcon className="w-4 h-4 text-gray-400" /> : <VideoIcon className="w-4 h-4 text-gray-400" />}
                                <span className="capitalize">{formData.lessonMode}</span> • {formData.duration} mins
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">When</p>
                            {formData.date && formData.time ? (
                                <p className="font-bold text-[#24985b] flex items-center gap-2 leading-tight">
                                    <CalendarIcon className="w-4 h-4" />
                                    {new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, <br></br>{formatTime(formData.time)} - {formatTime(formData.time, formData.duration)}
                                </p>
                            ) : (<p className="text-gray-400 italic">Select a time slot...</p>)}
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col justify-between items-start md:items-end min-w-[280px] border-t md:border-t-0 md:border-l border-gray-200">
                    <div className="w-full text-left md:text-right mb-6 md:mb-0 space-y-1">
                        <div className="flex justify-between md:justify-end gap-4 text-xs font-medium text-gray-500">
                            <span>{recurringWeeks > 1 ? `Rate (${recurringWeeks} lessons):` : 'Base Rate:'}</span><span>{formatCurrency(basePrice * recurringWeeks)}</span>
                        </div>
                        {travelFee > 0 && (
                            <div className="flex justify-between md:justify-end gap-4 text-xs font-medium text-orange-500">
                                <span>Travel Fee:</span><span>+ {formatCurrency(travelFee * recurringWeeks)}</span>
                            </div>
                        )}
                        <div className="flex justify-between md:justify-end items-end gap-4 pt-2 mt-2 border-t border-gray-100">
                            <span className="text-sm font-bold text-gray-900">Total Due Today</span>
                            <span className="text-2xl font-black text-[#24985b]">{formatCurrency(pricePerLesson)}</span>
                        </div>
                        {recurringWeeks > 1 && (
                            <p className="text-[10px] text-gray-400 mt-1 text-right">
                                Pay for the first lesson today. The remaining {recurringWeeks - 1} lessons will be billed weekly.
                            </p>
                        )}
                    </div>

                    <div className="flex w-full gap-3 mt-auto pt-4">
                        <button onClick={prevStep} disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Back</button>
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={!formData.date || !formData.time || isSubmitting}
                            className="flex-[2] bg-[#24985b] text-white px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-[#1d824d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Booking
                        </button>
                    </div>
                </div>
            </div>

            {showPaymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-[#eaf6ef] text-[#24985b] rounded-full flex items-center justify-center mx-auto mb-6">
                                <DollarIcon className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Select Payment</h2>
                            <p className="text-gray-500 text-sm mb-8 px-4">Choose how you'd like to pay for your first lesson today.</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleConfirmBooking('poli')}
                                    disabled={isSubmitting}
                                    className="w-full group p-4 rounded-2xl border-2 border-gray-100 hover:border-[#24985b] hover:bg-[#eaf6ef] transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">POLi</div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 group-hover:text-[#24985b]">Pay with POLi</p>
                                            <p className="text-xs text-gray-500">Instant bank transfer</p>
                                        </div>
                                    </div>
                                    <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-[#24985b]" />
                                </button>

                                <button
                                    onClick={() => handleConfirmBooking('bank_transfer')}
                                    disabled={isSubmitting}
                                    className="w-full group p-4 rounded-2xl border-2 border-gray-100 hover:border-[#24985b] hover:bg-[#eaf6ef] transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 group-hover:text-[#24985b]">Manual Bank Transfer</p>
                                            <p className="text-xs font-bold text-gray-400">Pay via your banking app</p>
                                        </div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-300 group-hover:text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
                                </button>

                                {formData.lessonMode === 'in-person' && (
                                    <button
                                        onClick={() => handleConfirmBooking('cash')}
                                        disabled={isSubmitting}
                                        className="w-full group p-4 rounded-2xl border-2 border-gray-100 hover:border-[#24985b] hover:bg-[#eaf6ef] transition-all flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><CashIcon className="w-6 h-6" /></div>
                                            <div className="text-left"><p className="font-bold text-gray-900 group-hover:text-[#24985b]">Pay in Cash</p><p className="text-xs text-gray-500">Pay at the lesson</p></div>
                                        </div>
                                        <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-[#24985b]" />
                                    </button>
                                )}
                            </div>

                            <button onClick={() => setShowPaymentModal(false)} className="mt-8 text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Icons
function SunRiseIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>; }
function SunIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>; }
function MoonIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>; }
function ChevronIcon({ isOpen, className }) { return <svg className={`${className} transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>; }
function CalendarIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>; }
function UserIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>; }
function SparklesIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>; }
function VideoIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>; }
function LocationIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function DollarIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function CashIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; }
function ChevronRightIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>; }
function ChevronLeftIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>; }