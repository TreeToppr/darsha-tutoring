'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function BookingRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRequests() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase
                .from('bookings')
                // Join profiles as 'parent' to get the synced address
                .select('*, students(*), parent:profiles!parent_id(address, full_name)')
                .eq('tutor_id', user.id)
                .eq('status', 'requested')
                .order('session_date', { ascending: true });

            setRequests(data || []);
            setLoading(false);
        }
        fetchRequests();
    }, []);

    const handleAction = async (id, action) => {
        const status = action === 'accept' ? 'confirmed' : 'declined';
        const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
        if (!error) setRequests(prev => prev.filter(r => r.id !== id));
    };

    if (loading) return <div className="p-8 text-center text-gray-400 font-bold">Checking for requests...</div>;

    return (
        <div className="space-y-4 mb-12">
            <h2 className="text-xl font-black text-gray-900 px-2">New Requests</h2>
            {requests.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] p-12 text-center text-gray-400">
                    No new requests.
                </div>
            ) : (
                requests.map(req => {
                    const sName = req.students?.name || req.students?.display_name || 'Student';
                    return (
                        <div key={req.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-[#eaf6ef] text-[#24985b] rounded-2xl flex items-center justify-center font-black text-2xl uppercase">{sName[0]}</div>
                                <div>
                                    <p className="font-bold text-gray-900 text-lg">{sName} • {req.subject}</p>
                                    <p className="text-xs font-black text-[#24985b] uppercase tracking-widest">
                                        {new Date(req.session_date).toLocaleDateString()} at {req.start_time}
                                    </p>
                                    {req.lesson_mode === 'in_person' && (
                                        <p className="text-xs text-gray-400 mt-1 font-medium">📍 {req.parent?.address || 'Address on file'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button onClick={() => handleAction(req.id, 'decline')} className="flex-1 md:flex-none px-6 py-4 rounded-xl font-bold text-gray-400">Decline</button>
                                <button onClick={() => handleAction(req.id, 'accept')} className="flex-1 md:flex-none bg-[#24985b] text-white px-8 py-4 rounded-xl font-bold">Accept</button>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    );
}