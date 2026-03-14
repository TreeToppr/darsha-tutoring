'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { format } from 'date-fns';

export default function ParentPaymentsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalSpent: 0, pendingAmount: 0 });
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [payingBookingId, setPayingBookingId] = useState(null);
    const [isPayingBulk, setIsPayingBulk] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    const handlePayNow = async (bookingId) => {
        setPayingBookingId(bookingId);
        try {
            const response = await fetch(`/api/poli/initiate?bookingId=${bookingId}`);
            const result = await response.json();

            if (result.url) {
                window.location.assign(result.url);
            } else {
                showToast(result.error || "Failed to get payment URL", "error");
                setPayingBookingId(null);
            }
        } catch (err) {
            console.error("Payment redirect failed:", err);
            showToast("An unexpected error occurred.", "error");
            setPayingBookingId(null);
        }
    };

    const handlePayAll = async () => {
        const unpaidBookings = bookings.filter(b => b.payment_status === 'unpaid');
        if (unpaidBookings.length === 0) return;

        setIsPayingBulk(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const response = await fetch('/api/poli/initiate-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingIds: unpaidBookings.map(b => b.id),
                    parentId: user.id
                })
            });

            const result = await response.json();

            if (result.url) {
                window.location.assign(result.url);
            } else {
                showToast(result.error || "Failed to start bulk payment", "error");
                setIsPayingBulk(false);
            }
        } catch (err) {
            console.error("Bulk payment redirect failed:", err);
            showToast("Connection error. Please try again.", "error");
            setIsPayingBulk(false);
        }
    };

    useEffect(() => {
        async function initializeData() {
            setLoading(true);
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            const paymentStatus = params.get('payment');

            if (token) {
                try {
                    const res = await fetch('/api/poli/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: token })
                    });
                    const result = await res.json();
                    window.history.replaceState(null, '', '/parent-payments');

                    if (result.success) {
                        showToast("Payment successful!");
                    } else if (result.status === "Cancelled" || paymentStatus === 'cancelled') {
                        showToast("Payment cancelled.", "error");
                    } else {
                        showToast(result.error || "Payment failed.", "error");
                    }
                } catch (e) {
                    console.error("Payment verification failed", e);
                    showToast("Error verifying payment.", "error");
                }
            } else if (paymentStatus === 'cancelled') {
                window.history.replaceState(null, '', '/parent-payments');
                showToast("Payment cancelled.", "error");
            } else if (paymentStatus === 'failed') {
                window.history.replaceState(null, '', '/parent-payments');
                showToast("Payment failed.", "error");
            }
            await fetchPaymentData();
        }
        initializeData();
    }, []);

    async function fetchPaymentData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, students(full_name)')
                .eq('parent_id', user.id)
                .order('session_date', { ascending: false });

            if (error) console.error("Database Fetch Error:", error.message);
            if (data) {
                setBookings(data);
                const spent = data.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (Number(b.amount_total) || 0), 0);
                const pending = data.filter(b => b.payment_status !== 'paid').reduce((sum, b) => sum + (Number(b.amount_total) || 0), 0);
                setStats({ totalSpent: spent, pendingAmount: pending });
            }
        }
        setLoading(false);
    }

    const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(val);

    if (loading) return <div className="p-20 text-center animate-pulse font-bold text-[#24985b]">Loading Financials...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-500 relative">
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Financials</h1>
                <p className="text-gray-500 mt-1 md:mt-2 text-sm md:text-base font-medium">Manage your lesson payments and receipts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-[#eaf6ef] p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-[#24985b]/10 flex flex-col justify-center">
                    <p className="text-[#24985b] font-bold uppercase tracking-widest text-[10px] mb-1">Total Paid</p>
                    <h3 className="text-3xl md:text-4xl font-black text-gray-900">{formatCurrency(stats.totalSpent)}</h3>
                </div>

                <div className="bg-orange-50 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-orange-200/50 flex justify-between items-center">
                    <div>
                        <p className="text-orange-500 font-bold uppercase tracking-widest text-[10px] mb-1">Outstanding</p>
                        <h3 className="text-3xl md:text-4xl font-black text-gray-900">{formatCurrency(stats.pendingAmount)}</h3>
                    </div>
                    {stats.pendingAmount > 0 && (
                        <button
                            onClick={handlePayAll}
                            disabled={isPayingBulk}
                            className="bg-[#24985b] text-white px-4 md:px-6 py-3 rounded-xl text-sm md:text-base font-bold shadow-sm hover:bg-[#1d824d] transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPayingBulk ? 'Redirecting...' : 'Pay All via POLi'}
                        </button>
                    )}
                </div>
            </div>

            {/* 🚀 FIXED: Mobile Card Layout vs Desktop Table Layout */}
            <div className="bg-white rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">

                {/* Desktop Table (Hidden on Mobile) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Student / Subject</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Amount</th>
                                <th className="px-8 py-5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {bookings.map((booking) => {
                                const sName = booking.students?.full_name || 'Student';
                                return (
                                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-gray-900">{format(new Date(booking.session_date), 'dd MMM yyyy')}</p>
                                            <p className="text-xs text-gray-400">{booking.start_time}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-gray-900">{sName}</p>
                                            <p className="text-xs text-gray-500">{booking.subject}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <StatusBadge status={booking.payment_status} />
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-gray-900">
                                            {formatCurrency(booking.amount_total)}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {booking.payment_status === 'paid' ? (
                                                <button onClick={() => setSelectedReceipt(booking)} className="text-[#24985b] hover:underline text-xs font-bold">Receipt</button>
                                            ) : (
                                                <button onClick={() => handlePayNow(booking.id)} disabled={payingBookingId === booking.id} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:opacity-50">
                                                    {payingBookingId === booking.id ? '...' : 'Pay Now'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards (Hidden on Desktop) */}
                <div className="md:hidden flex flex-col divide-y divide-gray-50">
                    {bookings.map((booking) => {
                        const sName = booking.students?.full_name || 'Student';
                        return (
                            <div key={booking.id} className="p-5 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-900">{sName}</p>
                                        <p className="text-xs text-gray-500">{booking.subject}</p>
                                        <p className="text-[11px] text-gray-400 mt-1">{format(new Date(booking.session_date), 'dd MMM yyyy')} • {booking.start_time.slice(0, 5)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-gray-900 text-lg leading-none mb-2">{formatCurrency(booking.amount_total)}</p>
                                        <StatusBadge status={booking.payment_status} />
                                    </div>
                                </div>

                                {booking.payment_status === 'paid' ? (
                                    <button
                                        onClick={() => setSelectedReceipt(booking)}
                                        className="w-full bg-gray-50 text-[#24985b] hover:bg-gray-100 py-3 rounded-xl text-xs font-bold transition-all border border-gray-100"
                                    >
                                        View Receipt
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handlePayNow(booking.id)}
                                        disabled={payingBookingId === booking.id}
                                        className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                                    >
                                        {payingBookingId === booking.id ? 'Redirecting to POLi...' : 'Pay Now'}
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Receipt Modal Logic Remains Exactly the Same */}
            {selectedReceipt && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl relative animate-in zoom-in-95">
                        <button onClick={() => setSelectedReceipt(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black">Receipt</h2>
                            <p className="text-xs text-gray-400 mt-1">Ref: {selectedReceipt.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <div className="space-y-4 border-t border-b border-gray-100 py-6 mb-6 text-sm">
                            <div className="flex justify-between"><span>Student</span><span className="font-bold">{selectedReceipt.students?.full_name || 'Student'}</span></div>
                            <div className="flex justify-between"><span>Subject</span><span className="font-bold">{selectedReceipt.subject}</span></div>
                            <div className="flex justify-between"><span>Date</span><span className="font-bold">{format(new Date(selectedReceipt.session_date), 'dd MMM yyyy')}</span></div>
                        </div>
                        <div className="flex justify-between items-center mb-8">
                            <span className="font-bold">Total Amount</span>
                            <span className="text-3xl font-black text-[#24985b]">{formatCurrency(selectedReceipt.amount_total)}</span>
                        </div>
                        <button onClick={() => window.print()} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">Print PDF</button>
                    </div>
                </div>
            )}

            {toast.show && (
                <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className={`px-6 py-3.5 rounded-full shadow-xl flex items-center gap-3 font-bold text-sm tracking-wide ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'}`}>
                        {toast.type === 'success' ? (
                            <div className="bg-[#24985b] rounded-full p-0.5">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        ) : (
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = { paid: "bg-[#eaf6ef] text-[#24985b]", unpaid: "bg-red-50 text-red-500", pay_in_person: "bg-orange-50 text-orange-500" };
    const labels = { paid: "PAID", unpaid: "UNPAID", pay_in_person: "CASH" };
    return (
        <span className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-widest ${styles[status] || styles.unpaid}`}>
            {labels[status] || "PENDING"}
        </span>
    );
}