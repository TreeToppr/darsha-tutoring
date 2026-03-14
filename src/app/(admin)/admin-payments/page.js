'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminPaymentsPage() {
    // ==========================================
    // AKAHU STATES
    // ==========================================
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, loading, success, error
    const [syncMessage, setSyncMessage] = useState('');
    const [syncLogs, setSyncLogs] = useState([]);

    const [bankStatus, setBankStatus] = useState('idle'); // idle, loading, success, error
    const [bankTransactions, setBankTransactions] = useState([]);

    // ==========================================
    // GLOBAL TRANSACTIONS (TABLE) STATE
    // ==========================================
    const [globalPayments, setGlobalPayments] = useState([]);

    useEffect(() => {
        fetchGlobalPayments();
    }, []);

    const fetchGlobalPayments = async () => {
        const { data } = await supabase
            .from('bookings')
            .select('*, profiles!tutor_id(full_name), parent:profiles!parent_id(full_name)')
            .order('created_at', { ascending: false });
        setGlobalPayments(data || []);
    };

    // ==========================================
    // AKAHU ACTIONS
    // ==========================================
    const runAutoSync = async () => {
        setSyncStatus('loading');
        setSyncMessage('Connecting to Akahu and checking unpaid invoices...');
        setSyncLogs([]);

        try {
            const res = await fetch('/api/akahu/sync');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to sync");

            setSyncStatus('success');
            setSyncMessage(data.message);
            setSyncLogs(data.details || []);

            // Refresh the table below so we can see the updated 'paid' statuses!
            fetchGlobalPayments();
        } catch (error) {
            setSyncStatus('error');
            setSyncMessage(error.message);
        }
    };

    const checkBankFeed = async () => {
        setBankStatus('loading');
        try {
            const res = await fetch('/api/akahu/check');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to connect to bank");

            setBankStatus('success');
            setBankTransactions(data.recent_transactions || []);
        } catch (error) {
            setBankStatus('error');
            console.error("Bank fetch error:", error);
            alert("Error fetching bank feed: " + error.message);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(val);

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 p-4 md:p-8">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Payments & Sync</h1>
                <p className="text-gray-500 mt-1 font-medium">Manage your Akahu bank connection and view global transactions</p>
            </div>

            {/* AKAHU COMMAND CENTER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* LEFT COLUMN: Bank Connection */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-full text-blue-600">
                            <BankIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Live Bank Feed</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Akahu Integration</p>
                        </div>
                    </div>

                    <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed flex-grow">
                        Check your secure connection to Akahu. This will pull the 5 most recent transactions directly from your connected bank account to ensure data is flowing.
                    </p>

                    <button
                        onClick={checkBankFeed}
                        disabled={bankStatus === 'loading'}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {bankStatus === 'loading' ? 'Connecting to Bank...' : 'Fetch Recent Transactions'}
                    </button>

                    {/* Raw Transactions Output */}
                    {bankTransactions.length > 0 && (
                        <div className="mt-8 space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Latest 5 Transactions</h3>
                            {bankTransactions.map((tx, i) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <div className="overflow-hidden pr-4">
                                        <p className="font-bold text-gray-900 text-sm truncate">{tx.description || 'Unknown'}</p>
                                        <p className="text-xs font-bold text-gray-400 mt-1 truncate">Ref: {tx.reference}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(tx.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className={`font-black ${tx.amount > 0 ? 'text-[#24985b]' : 'text-gray-900'}`}>
                                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Auto-Sync Robot */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden flex flex-col">
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="bg-[#eaf6ef] p-4 rounded-full text-[#24985b]">
                            <RobotIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Auto-Match Robot</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Invoice Reconciler</p>
                        </div>
                    </div>

                    <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed relative z-10 flex-grow">
                        Trigger the matchmaker. The robot will fetch new deposits, look for matching unpaid invoices based on the exact amount and student name, and mark them as paid automatically.
                    </p>

                    <button
                        onClick={runAutoSync}
                        disabled={syncStatus === 'loading'}
                        className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-black/10 disabled:opacity-50 relative z-10 flex items-center justify-center gap-2"
                    >
                        {syncStatus === 'loading' ? (
                            <span className="flex items-center gap-2">
                                <SpinnerIcon className="animate-spin w-5 h-5" /> Processing...
                            </span>
                        ) : 'Run Auto-Match Sync'}
                    </button>

                    {/* Sync Output Logs */}
                    {syncStatus !== 'idle' && syncStatus !== 'loading' && (
                        <div className={`mt-8 p-6 rounded-2xl border ${syncStatus === 'success' ? 'bg-[#eaf6ef] border-[#24985b]/20' : 'bg-red-50 border-red-100'} animate-in slide-in-from-bottom-2`}>
                            <p className={`font-black mb-4 ${syncStatus === 'success' ? 'text-[#1d824d]' : 'text-red-600'}`}>
                                {syncMessage}
                            </p>

                            {syncStatus === 'success' && (
                                <div className="space-y-3">
                                    {syncLogs.length === 0 ? (
                                        <p className="text-sm font-medium text-[#24985b]/70">No new matches found. All caught up!</p>
                                    ) : (
                                        syncLogs.map((log, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm font-bold text-[#1d824d] bg-white/60 p-3 rounded-lg">
                                                <CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>{log}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* GLOBAL TRANSACTIONS TABLE */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="font-black text-gray-900">Global Transactions</h2>
                    <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-all">Export Report (CSV)</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-black border-b border-gray-100">
                            <tr>
                                <th className="p-4">Payment ID</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Tutor</th>
                                <th className="p-4">Parent</th>
                                <th className="p-4">Method</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {globalPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400 font-medium">No transactions found.</td>
                                </tr>
                            ) : (
                                globalPayments.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-mono text-gray-400">{t.id.slice(0, 8)}...</td>
                                        <td className="p-4 font-medium text-gray-600">{t.session_date || t.lesson_date}</td>
                                        <td className="p-4 font-bold text-gray-900">{t.profiles?.full_name || 'Unknown'}</td>
                                        <td className="p-4 text-gray-600">{t.parent?.full_name || 'Unknown'}</td>
                                        <td className="p-4 uppercase font-bold text-gray-500 text-[10px] tracking-widest">{t.payment_method?.replace('_', ' ')}</td>
                                        <td className="p-4 font-black text-gray-900">{formatCurrency(t.amount_total)}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.payment_status === 'paid' ? 'bg-[#eaf6ef] text-[#24985b]' : 'bg-orange-50 text-orange-500'}`}>
                                                {t.payment_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Icons
function BankIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>; }
function RobotIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>; }
function CheckCircleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function SpinnerIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>; }