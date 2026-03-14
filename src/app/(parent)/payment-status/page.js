'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';

function PaymentStatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const status = searchParams.get('payment'); // 'success', 'failed', or 'cancelled'

    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFeedback = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Here you could save the reason to Supabase if you want to track churn/issues
        setTimeout(() => {
            router.push('/parent-dashboard');
        }, 1500);
    };

    const config = {
        success: {
            icon: <SuccessIcon />,
            title: "Payment Successful!",
            desc: "Your booking is now confirmed. We've notified your tutor and sent a receipt to your email.",
            color: "text-[#24985b]",
            bgColor: "bg-[#eaf6ef]",
            button: "Go to Dashboard"
        },
        cancelled: {
            icon: <CancelIcon />,
            title: "Transaction Cancelled",
            desc: "The payment process was stopped. Your booking request is still 'Pending', but it will not be confirmed until payment is received.",
            color: "text-orange-500",
            bgColor: "bg-orange-50",
            button: "Try Again"
        },
        failed: {
            icon: <FailedIcon />,
            title: "Payment Failed",
            desc: "Something went wrong with the bank transfer. Please check your balance or contact your bank.",
            color: "text-red-500",
            bgColor: "bg-red-50",
            button: "Try Again"
        }
    };

    const current = config[status] || config.failed;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-10 text-center">
                    <div className={`w-20 h-20 ${current.bgColor} ${current.color} rounded-full flex items-center justify-center mx-auto mb-8`}>
                        {current.icon}
                    </div>

                    <h1 className={`text-3xl font-black mb-4 ${current.color}`}>
                        {current.title}
                    </h1>

                    <p className="text-gray-500 leading-relaxed mb-8">
                        {current.desc}
                    </p>

                    {/* Cancellation Feedback Form */}
                    {status === 'cancelled' && (
                        <form onSubmit={handleFeedback} className="text-left bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100 animate-in slide-in-from-bottom-4">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                Help us improve: Why did you cancel?
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Changed my mind, technical issue..."
                                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm h-24 mb-4"
                            />
                            <button
                                disabled={isSubmitting}
                                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                            >
                                {isSubmitting ? 'Saving...' : 'Submit Feedback'}
                            </button>
                        </form>
                    )}

                    <div className="flex flex-col gap-3">
                        <Link
                            href={status === 'success' ? "/parent-dashboard" : "/book"}
                            className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${status === 'success' ? 'bg-[#24985b] shadow-[#24985b]/20' : 'bg-gray-900 shadow-gray-900/20'
                                }`}
                        >
                            {current.button}
                        </Link>

                        {(status === 'cancelled' || status === 'failed') && (
                            <Link href="/messages" className="text-sm font-bold text-gray-400 hover:text-gray-600 py-2">
                                Contact Tutor for Help
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Icons
function SuccessIcon() { return <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>; }
function CancelIcon() { return <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>; }
function FailedIcon() { return <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>; }

export default function PaymentStatusPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PaymentStatusContent />
        </Suspense>
    );
}