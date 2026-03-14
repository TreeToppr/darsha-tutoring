'use client';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminSettings() {
    const router = useRouter();

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error signing out:", error);
            alert("Failed to sign out. Please try again.");
        } else {
            // Redirect to the login page after successful logout
            router.push('/auth/sign-in');
        }
    };

    return (
        <div className="max-w-3xl space-y-8">
            <section className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="font-bold mb-4">POLi Payment Integration</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400">Merchant Code</label>
                        <input className="w-full border rounded-lg p-2 mt-1 bg-gray-50" value="MERCH_123456" readOnly />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400">API Key</label>
                        <input className="w-full border rounded-lg p-2 mt-1" type="password" value="********" readOnly />
                    </div>
                </div>
            </section>

            <section className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="font-bold mb-4">Fee Rules & Policies</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span>Platform Commission (%)</span>
                        <input className="border rounded p-2 w-20 text-center" defaultValue="15" />
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Travel Fee (In-Person)</span>
                        <input className="border rounded p-2 w-20 text-center" defaultValue="15" />
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Cancellation Window (Hours)</span>
                        <input className="border rounded p-2 w-20 text-center" defaultValue="24" />
                    </div>
                </div>
            </section>

            <div className="space-y-4 pt-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
                    Save All Settings
                </button>

                {/* 🚀 NEW: Sign Out Button */}
                <button
                    onClick={handleSignOut}
                    className="w-full bg-white border-2 border-red-50 text-red-500 hover:bg-red-50 hover:border-red-100 py-4 rounded-xl font-bold transition-all"
                >
                    Sign Out of Admin Portal
                </button>
            </div>
        </div>
    );
}