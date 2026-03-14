'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation'; // 🚀 NEW: Need this to redirect after signing out

export default function ProfilePage() {
    const router = useRouter(); // 🚀 NEW
    const [profile, setProfile] = useState({ full_name: '', phone: '', address: '', avatar_url: '', email: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function getProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile({
                    full_name: data?.full_name || '',
                    phone: data?.phone || '',
                    address: data?.address || '',
                    avatar_url: data?.avatar_url || '',
                    email: user.email || ''
                });
            }
            setLoading(false);
        }
        getProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('profiles').update({
            full_name: profile.full_name,
            phone: profile.phone,
            address: profile.address,
            avatar_url: profile.avatar_url
        }).eq('id', user.id);

        setSaving(false);
        if (!error) alert("Profile & Address Synced!");
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const { data: { user } } = await supabase.auth.getUser();
        const fileName = `avatars/${user.id}-${Date.now()}`;

        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setProfile({ ...profile, avatar_url: publicUrl });
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        }
    };

    // 🚀 NEW: Sign out function
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/auth/sign-in'); // Redirects them to your login page
    };

    if (loading) return <div className="p-20 text-center font-bold text-[#24985b] animate-pulse">Syncing...</div>;

    return (
        <div className="max-w-2xl mx-auto p-8 animate-in slide-in-from-bottom-4">
            <div className="mb-10 text-center">
                <div className="relative w-28 h-28 mx-auto mb-6">
                    <div className="w-full h-full bg-gray-50 rounded-full overflow-hidden flex items-center justify-center text-3xl border-4 border-white shadow-xl">
                        {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile" /> : "👤"}
                    </div>
                    <label className="absolute bottom-1 right-1 bg-gray-900 text-white p-2.5 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-all">
                        <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                        <CameraIcon className="w-4 h-4" />
                    </label>
                </div>
                <h1 className="text-3xl font-black text-gray-900 leading-tight">Your Profile</h1>
                <p className="text-gray-400 font-medium text-sm mt-1">Manage your account and tutor contact details.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 space-y-6 shadow-sm">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Full Name</label>
                    <input value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#24985b]/20" />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Email Address (Read Only)</label>
                    <input value={profile.email || ''} disabled className="w-full p-4 rounded-2xl bg-gray-100 border-none font-medium text-gray-400 outline-none cursor-not-allowed" />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Home Address</label>
                    <input value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#24985b]/20" placeholder="e.g. 123 Main St, Auckland" />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Phone Number</label>
                    {/* 🚀 FIX: Swapped .address for .phone */}
                    <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#24985b]/20" />
                </div>

                <div className="pt-4">
                    <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black shadow-xl hover:bg-black transition-all active:scale-95 mb-3">
                        {saving ? 'Updating...' : 'Save All Changes'}
                    </button>

                    {/* 🚀 NEW: Sign Out Button */}
                    <button onClick={handleSignOut} className="w-full text-red-500 font-bold py-3 hover:bg-red-50 rounded-[1.5rem] transition-all">
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

function CameraIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }