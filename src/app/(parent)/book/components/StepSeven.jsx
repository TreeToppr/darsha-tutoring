'use client';
import { useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function StepSeven({ selection, tutors, students, prev }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Grab the full tutor and student objects
    const tutor = tutors.find(t => t.id === selection.tutorId);
    const student = students.find(s => s.id === selection.studentId);

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

    // Calculate Pricing Logic (using your original logic)
    const hourlyRate = (parseInt(student?.year_level?.replace(/\D/g, '')) <= 6)
        ? (tutor?.hourly_rates?.year_1_6 || 30)
        : (tutor?.hourly_rates?.year_7_12 || 40);

    const baseAmount = (hourlyRate * ((selection.duration || 60) / 60));
    const travelFee = selection.type === 'in-person' ? 15 : 0;
    const pricePerLesson = baseAmount + travelFee;

    // Assuming you have recurring logic, otherwise default to 1
    const recurringWeeks = selection.recurringWeeks || 1;
    const totalDueToday = pricePerLesson;

    const studentFirstName = student?.name?.split(' ')[0] || 'Student';
    // Handle split datetime from previous steps if necessary
    const lessonDate = selection.dateTime ? selection.dateTime.split('T')[0] : selection.date;
    const startTime = selection.dateTime ? selection.dateTime.split('T')[1] : selection.startTime;

    const handleConfirmBooking = async (paymentMethod = 'poli') => {
        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in to book.");

            const [startHours, startMins] = startTime.split(':').map(Number);
            const totalMins = (startHours * 60) + startMins + (selection.duration || 60);
            const endTime = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;

            let recurringGroupId = null;

            // 1. Create Recurring Group if needed
            if (recurringWeeks > 1) {
                const { data: groupData, error: groupErr } = await supabase
                    .from('recurring_groups')
                    .insert({
                        parent_id: user.id,
                        tutor_id: selection.tutorId,
                        student_id: selection.studentId
                    })
                    .select()
                    .single();

                if (groupErr) console.error("Recurring group creation failed", groupErr);
                else recurringGroupId = groupData.id;
            }

            // 2. Generate Bookings Array
            const bookingsToInsert = [];
            for (let i = 0; i < recurringWeeks; i++) {
                const [yyyy, mm, dd] = lessonDate.split('-');
                const sessionDateObj = new Date(yyyy, mm - 1, dd);
                sessionDateObj.setDate(sessionDateObj.getDate() + (i * 7));

                const pad = (n) => String(n).padStart(2, '0');
                const sessionDateStr = `${sessionDateObj.getFullYear()}-${pad(sessionDateObj.getMonth() + 1)}-${pad(sessionDateObj.getDate())}`;

                bookingsToInsert.push({
                    parent_id: user.id,
                    tutor_id: selection.tutorId,
                    student_id: selection.studentId,
                    subject: selection.subject,
                    session_date: sessionDateStr,
                    start_time: startTime,
                    end_time: endTime,
                    duration: selection.duration || 60,
                    amount_base: baseAmount, //   Fixed to match your DB schema
                    amount_travel: travelFee, //   Fixed to match your DB schema
                    amount_total: pricePerLesson, //   Fixed to match your DB schema
                    status: 'requested',
                    payment_status: 'unpaid', //   Added
                    payment_method: paymentMethod, //   Added
                    lesson_mode: selection.type.toLowerCase().replace('-', '_'),
                    is_recurring: recurringWeeks > 1,
                    recurring_group_id: recurringGroupId
                });
            }

            // 3. Insert into Supabase
            const { data: newBookings, error: insertError } = await supabase.from('bookings').insert(bookingsToInsert).select();
            if (insertError) throw insertError;

            // 4. Send Email Notification (Non-blocking)
            fetch('/api/email/booking-requested-tutor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tutorId: selection.tutorId,
                    studentName: studentFirstName,
                    subject: selection.subject,
                    date: lessonDate,
                    time: startTime,
                    endTime: endTime,
                    parentEmail: user.email
                })
            }).catch(err => console.error("Email notification failed:", err));

            // 5. Handle Payment Routing
            if (paymentMethod === 'poli') {
                const firstBooking = newBookings[0];
                const response = await fetch(`/api/poli/initiate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: firstBooking.id,
                        amount: pricePerLesson
                    })
                });

                const result = await response.json();

                if (result.navigateURL || result.url) {
                    window.location.assign(result.navigateURL || result.url);
                } else {
                    throw new Error(result.error || "Failed to get payment URL");
                }
            } else if (paymentMethod === 'bank_transfer') {
                // Route them to dashboard with a specific bank transfer success flag
                router.push('/parent-dashboard?booking=bank_transfer_pending');
            } else {
                router.push('/parent-dashboard?booking=success');
            }

        } catch (error) {
            console.error("Booking Error:", error);
            setErrorMsg(error.message || "An unexpected error occurred.");
            setIsSubmitting(false);
            setShowPaymentModal(false);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Review & Pay</h2>
                <p className="text-gray-500 font-medium mt-1">Please confirm your booking details.</p>
            </div>

            {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 shadow-sm">
                    {errorMsg}
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">

                {/* Details Section */}
                <div className="flex-1 p-8 bg-gray-50/30">
                    <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 text-[10px] uppercase tracking-widest">Booking Summary</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student</p>
                            <p className="font-black text-gray-900">{student?.name}</p>
                            <p className="text-sm font-bold text-gray-500">{selection.subject}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tutor</p>
                            <p className="font-black text-gray-900">{tutor?.full_name}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Format</p>
                            <p className="font-black text-gray-900 capitalize">
                                {selection.type === 'in-person' ? '📍 In Person' : '💻 Online'}
                            </p>
                            <p className="text-sm font-bold text-gray-500">{selection.duration || 60} minutes</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">When</p>
                            <p className="font-black text-[#24985b] leading-tight">
                                {new Date(lessonDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-sm font-bold text-[#24985b]/80">
                                {formatTime(startTime)} - {formatTime(startTime, selection.duration || 60)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total Section */}
                <div className="p-8 flex flex-col justify-center items-start md:items-end min-w-[320px] bg-white border-t md:border-t-0 md:border-l border-gray-100">
                    <div className="w-full space-y-3 mb-8">
                        <div className="flex justify-between md:justify-end gap-6 text-sm font-bold text-gray-500">
                            <span>Base Rate:</span>
                            <span className="text-gray-900">{formatCurrency(baseAmount)}</span>
                        </div>
                        {travelFee > 0 && (
                            <div className="flex justify-between md:justify-end gap-6 text-sm font-bold text-orange-500">
                                <span>Travel Fee:</span>
                                <span>+ {formatCurrency(travelFee)}</span>
                            </div>
                        )}
                        {recurringWeeks > 1 && (
                            <div className="flex justify-between md:justify-end gap-6 text-xs font-bold text-[#24985b] bg-[#eaf6ef] p-2 rounded-lg">
                                <span>Recurring:</span>
                                <span>{recurringWeeks} Lessons Total</span>
                            </div>
                        )}
                        <div className="flex justify-between md:justify-end items-end gap-6 pt-4 mt-2 border-t border-gray-100">
                            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Due Today</span>
                            <span className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(totalDueToday)}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full bg-[#24985b] text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-[#24985b]/20 hover:bg-[#1d824d] hover:scale-[1.02] transition-all"
                    >
                        Checkout
                    </button>
                    <button
                        onClick={prev}
                        disabled={isSubmitting}
                        className="w-full mt-3 py-3 font-bold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Back to Time Selection
                    </button>
                </div>
            </div>

            {/* Payment Selection Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-8 text-center">
                        <div className="w-16 h-16 bg-[#eaf6ef] text-[#24985b] rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Select Payment</h2>
                        <p className="text-gray-500 text-sm mb-8 font-medium">Choose how you'd like to pay for your lesson today.</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleConfirmBooking('poli')}
                                disabled={isSubmitting}
                                className="w-full group p-4 rounded-2xl border-2 border-gray-100 hover:border-[#24985b] hover:bg-[#eaf6ef] transition-all flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">POLi</div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900 group-hover:text-[#24985b]">Pay with POLi</p>
                                        <p className="text-xs font-bold text-gray-400">Instant bank transfer</p>
                                    </div>
                                </div>
                                <svg className="w-5 h-5 text-gray-300 group-hover:text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
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

                            {selection.type === 'in-person' && (
                                <button
                                    onClick={() => handleConfirmBooking('cash')}
                                    disabled={isSubmitting}
                                    className="w-full group p-4 rounded-2xl border-2 border-gray-100 hover:border-[#24985b] hover:bg-[#eaf6ef] transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900 group-hover:text-[#24985b]">Pay in Cash</p>
                                            <p className="text-xs font-bold text-gray-400">Pay at the lesson</p>
                                        </div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-300 group-hover:text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
                                </button>
                            )}
                        </div>

                        <button onClick={() => setShowPaymentModal(false)} className="mt-8 font-bold text-gray-400 hover:text-gray-600 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}