'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function TutorPayments() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ earned: 0, pending: 0 });

    useEffect(() => {
        async function fetchTutorPayments() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase
                .from('bookings')
                .select('*, students(name), profiles!parent_id(full_name)')
                .eq('tutor_id', user.id);

            const earned = data?.filter(b => b.payment_status === 'paid').reduce((s, b) => s + Number(b.amount_total), 0) || 0;
            const pending = data?.filter(b => b.payment_status === 'unpaid').reduce((s, b) => s + Number(b.amount_total), 0) || 0;

            setHistory(data || []);
            setStats({ earned, pending });
        }
        fetchTutorPayments();
    }, []);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl border-l-4 border-green-500 shadow-sm">
                    <p className="text-xs font-bold text-gray-400">TOTAL EARNED</p>
                    <p className="text-3xl font-black text-green-600">${stats.earned.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border-l-4 border-yellow-500 shadow-sm">
                    <p className="text-xs font-bold text-gray-400">PENDING PAYOUTS</p>
                    <p className="text-3xl font-black text-yellow-600">${stats.pending.toFixed(2)}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-bold">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Student (Parent)</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {history.map(h => (
                            <tr key={h.id}>
                                <td className="p-4">{h.lesson_date}</td>
                                <td className="p-4">
                                    <span className="font-bold">{h.students?.name}</span>
                                    <span className="text-gray-400 text-xs ml-2">({h.profiles?.full_name})</span>
                                </td>
                                <td className="p-4">${h.amount_total}</td>
                                <td className="p-4 italic text-gray-500">{h.payment_status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}