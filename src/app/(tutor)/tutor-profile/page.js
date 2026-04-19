'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function TutorProfile() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [profile, setProfile] = useState({
        full_name: '',
        subjects: [],
        hourly_rates: [],
        home_address: '',
        avatar_url: '' // 🚀 ADDED: Avatar State
    });

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (data) {
                    setProfile({
                        full_name: data.full_name || '',
                        subjects: data.subjects || [],
                        hourly_rates: data.hourly_rates || [],
                        home_address: data.home_address || '',
                        avatar_url: data.avatar_url || '' // 🚀 ADDED: Map DB to State
                    });
                }
            }
            setLoading(false);
        }
        loadProfile();
    }, []);

    // 🚀 NEW: The Photo Upload Function
    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const { data: { user } } = await supabase.auth.getUser();

        // Note: If your bucket is named 'avatars', putting 'avatars/' in the fileName 
        // creates a subfolder. I'm removing it here to keep your bucket clean!
        const fileName = `${user.id}-${Date.now()}`;

        console.log("Attempting to upload file:", file.name, "Size:", file.size);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setProfile({ ...profile, avatar_url: publicUrl });
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            alert("Photo uploaded successfully!");
        } else {
            // 🚀 THE FIX: Print the exact database error to the screen!
            console.error("Supabase Storage Error Details:", uploadError);
            alert(`Supabase Error: ${uploadError.message}`);
        }
    };

    const handleUpdate = async () => {
        setSaving(true);
        setMessage('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { data, error } = await supabase
                .from('profiles')
                .update({
                    full_name: profile.full_name,
                    subjects: profile.subjects,
                    hourly_rates: profile.hourly_rates,
                    home_address: profile.home_address,
                    avatar_url: profile.avatar_url // 🚀 Ensure it saves with profile updates
                })
                .eq('id', user.id)
                .select();

            if (error) throw error;

            setMessage('Profile updated successfully!');
        } catch (error) {
            console.error("Update Error:", error.message);
            setMessage('Error: ' + error.message);
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const toggleSubject = (sub) => {
        const current = profile.subjects || [];
        if (current.includes(sub)) setProfile({ ...profile, subjects: current.filter(s => s !== sub) });
        else setProfile({ ...profile, subjects: [...current, sub] });
    };

    const addTier = () => {
        setProfile({ ...profile, hourly_rates: [...profile.hourly_rates, { min: 1, max: 13, rate: 0 }] });
    };

    const removeTier = (indexToRemove) => {
        setProfile({ ...profile, hourly_rates: profile.hourly_rates.filter((_, idx) => idx !== indexToRemove) });
    };

    const updateTier = (index, field, value) => {
        const newRates = [...profile.hourly_rates];
        newRates[index][field] = Number(value);
        setProfile({ ...profile, hourly_rates: newRates });
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) return <div className="p-10 text-[#24985b] font-black animate-pulse">Loading Profile...</div>;

    return (
        <div className="max-w-4xl p-4 md:p-8 animate-in fade-in duration-500 pb-32">

            {/* 🚀 UPDATED HEADER WITH AVATAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="flex items-center gap-6">
                    {/* Avatar Upload Circle */}
                    <div className="relative w-24 h-24 shrink-0">
                        <div className="w-full h-full bg-gray-50 rounded-full overflow-hidden flex items-center justify-center text-4xl border-4 border-white shadow-lg">
                            {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile" /> : "👤"}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-[#24985b] text-white p-2 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-all border-2 border-white">
                            <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                            <CameraIcon className="w-4 h-4" />
                        </label>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Profile Settings</h1>
                        <p className="text-gray-500 mt-2 font-medium">Manage your professional details and rates.</p>
                    </div>
                </div>

                <button onClick={handleSignOut} className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all active:scale-95 shrink-0">
                    Sign Out
                </button>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="space-y-10">
                    <section>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Full Name</label>
                        <input
                            type="text"
                            value={profile.full_name}
                            onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                            className="w-full max-w-md p-4 rounded-2xl bg-gray-50 border-none font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#24985b]/20 transition-all"
                            placeholder="Your display name"
                        />
                    </section>

                    <section>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Home Base (For Travel Calculation)</label>
                        <input
                            type="text"
                            value={profile.home_address || ''}
                            onChange={e => setProfile({ ...profile, home_address: e.target.value })}
                            className="w-full max-w-md p-4 rounded-2xl bg-gray-50 border-none font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#24985b]/20 transition-all"
                            placeholder="Enter your home or starting address"
                        />
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-3 max-w-2xl">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing Tiers</label>
                        </div>

                        <div className="space-y-3 max-w-2xl">
                            {profile.hourly_rates.map((tier, index) => (
                                <div key={index} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div className="flex-1 w-full">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">From Year</label>
                                        <input type="number" min="1" max="13" value={tier.min} onChange={(e) => updateTier(index, 'min', e.target.value)} className="w-full p-3 rounded-xl bg-white border-none font-black text-gray-900 shadow-sm text-center" />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">To Year</label>
                                        <input type="number" min="1" max="13" value={tier.max} onChange={(e) => updateTier(index, 'max', e.target.value)} className="w-full p-3 rounded-xl bg-white border-none font-black text-gray-900 shadow-sm text-center" />
                                    </div>
                                    <div className="flex-1 w-full relative">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">Hourly Rate</label>
                                        <span className="absolute left-3 bottom-3 text-gray-400 font-black">$</span>
                                        <input type="number" value={tier.rate} onChange={(e) => updateTier(index, 'rate', e.target.value)} className="w-full p-3 pl-7 rounded-xl bg-white border-none font-black text-[#24985b] shadow-sm" />
                                    </div>
                                    <button onClick={() => removeTier(index)} className="p-3 mb-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Remove Tier">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}

                            <button onClick={addTier} className="text-sm font-bold text-[#24985b] bg-[#eaf6ef] px-4 py-2.5 rounded-xl hover:bg-[#dcf2e6] transition-colors border border-[#24985b]/20 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                Add Pricing Tier
                            </button>
                        </div>
                    </section>

                    <section>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Subjects Taught</label>
                        <div className="flex flex-wrap gap-3">
                            {['Mathematics', 'English', 'Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography'].map(sub => {
                                const isSelected = (profile.subjects || []).includes(sub);
                                return (
                                    <button
                                        key={sub}
                                        onClick={() => toggleSubject(sub)}
                                        className={`px-5 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${isSelected
                                            ? 'bg-[#eaf6ef] text-[#24985b] border-[#24985b]/30 shadow-sm'
                                            : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                                            }`}
                                    >
                                        {sub}
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <span className="text-[#24985b] font-bold text-sm bg-[#eaf6ef] px-4 py-2 rounded-lg order-2 md:order-1" style={{ opacity: message ? 1 : 0, transition: 'opacity 0.3s' }}>
                            {message}
                        </span>
                        <button
                            onClick={handleUpdate}
                            disabled={saving}
                            className="w-full md:w-auto bg-[#24985b] text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-[#24985b]/20 hover:bg-[#1d824d] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 order-1 md:order-2"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 🚀 Missing Camera Icon Component
function CameraIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}