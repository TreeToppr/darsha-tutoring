'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${min}`;
});

export default function AvailabilityPage() {
    const [availability, setAvailability] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchAvailability(); }, []);

    async function fetchAvailability() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('tutor_availability').select('*').eq('tutor_id', user.id);

            // Convert array to object for easier mapping: { 'Monday': { ... } }
            const initialMap = {};
            DAYS.forEach(day => {
                const existing = data?.find(d => d.day_of_week === day);
                initialMap[day] = existing || {
                    day_of_week: day, start_time: '09:00', end_time: '17:00',
                    is_online: true, is_in_person: false, is_active: false
                };
            });
            setAvailability(initialMap);
        }
        setLoading(false);
    }

    const updateDay = (day, updates) => {
        setAvailability(prev => ({ ...prev, [day]: { ...prev[day], ...updates } }));
    };

    const handleSave = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        const payload = Object.values(availability).map(item => ({
            ...item,
            tutor_id: user.id
        }));

        const { error } = await supabase.from('tutor_availability').upsert(payload, { onConflict: 'tutor_id, day_of_week' });

        setSaving(false);
        if (!error) alert("Availability Saved!");
    };

    if (loading) return <div className="p-20 text-center font-bold text-[#24985b] animate-pulse">Loading Schedule...</div>;

    return (
        <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Availability</h1>
                    <p className="text-gray-500 mt-2 font-medium">Set your weekly teaching hours and modes.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Schedule'}
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                    {DAYS.map((day) => {
                        const data = availability[day];
                        return (
                            <div key={day} className={`p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all ${!data.is_active ? 'opacity-40 grayscale' : 'hover:bg-gray-50/30'}`}>
                                <div className="flex items-center gap-4 w-40">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => updateDay(day, { is_active: e.target.checked })}
                                        className="w-6 h-6 rounded-lg border-gray-200 text-[#24985b] focus:ring-[#24985b]/20"
                                    />
                                    <h3 className="font-black text-gray-900 text-lg">{day}</h3>
                                </div>

                                <div className="flex flex-1 items-center gap-4">
                                    <select
                                        value={data.start_time.slice(0, 5)}
                                        onChange={(e) => updateDay(day, { start_time: e.target.value })}
                                        className="bg-gray-50 border-none rounded-xl p-3 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#24985b]/20"
                                    >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <span className="text-gray-300 font-bold">to</span>
                                    <select
                                        value={data.end_time.slice(0, 5)}
                                        onChange={(e) => updateDay(day, { end_time: e.target.value })}
                                        className="bg-gray-50 border-none rounded-xl p-3 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[#24985b]/20"
                                    >
                                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <ModeButton
                                        active={data.is_online}
                                        onClick={() => updateDay(day, { is_online: !data.is_online })}
                                        label="Online"
                                    />
                                    <ModeButton
                                        active={data.is_in_person}
                                        onClick={() => updateDay(day, { is_in_person: !data.is_in_person })}
                                        label="In-Person"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ModeButton({ active, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${active
                    ? 'bg-[#eaf6ef] text-[#24985b] border-[#24985b]/10'
                    : 'bg-white text-gray-300 border-gray-100'
                }`}
        >
            {label}
        </button>
    );
}