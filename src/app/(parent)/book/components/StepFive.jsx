'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function StepFive({ formData, updateFormData, nextStep, prevStep }) {
    const [address, setAddress] = useState(formData.parentAddress || '');
    const [travelTime, setTravelTime] = useState(formData.travelTime || 0);
    const [travelFee, setTravelFee] = useState(formData.travelFee || 0);
    const [isCalculating, setIsCalculating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        async function fetchSavedAddress() {
            // Only fetch if the local address state is empty
            if (!address) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('address')
                        .eq('id', user.id)
                        .single();

                    if (profile?.address) {
                        setAddress(profile.address); // Updates the local input box
                        updateFormData({ parentAddress: profile.address }); // Updates the global booking data
                    }
                }
            }
        }
        fetchSavedAddress();
    }, []);

    useEffect(() => {
        if (!formData.lessonMode) {
            updateFormData({ lessonMode: 'online', travelFee: 0, travelTime: 0 });
        }
        const getParentAddress = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('address').eq('id', user.id).single();

            if (profile?.address) {
                // Automatically populate the address field if the parent has one saved
                updateFormData({ location: profile.address });
            }
        };
    }, [formData.lessonMode, updateFormData]);

    const handleSelect = (mode) => {
        updateFormData({ lessonMode: mode });
        if (mode === 'online') {
            setTravelFee(0);
            setTravelTime(0);
            setErrorMsg('');
            updateFormData({ travelFee: 0, travelTime: 0, parentAddress: '' });
        }
    };

    const calculateDistanceFee = async (e) => {
        e.preventDefault();
        if (!address.trim()) return;

        setIsCalculating(true);
        setErrorMsg('');

        try {
            // 1. Fetch the Tutor's Home Base from their profile
            const { data: tutorProfile } = await supabase
                .from('profiles')
                .select('home_address')
                .eq('id', formData.tutorId)
                .single();

            //   THE FIX: If the tutor hasn't set an address, we can't do the math correctly
            const tutorHomeBase = tutorProfile?.home_address;

            if (!tutorHomeBase) {
                setErrorMsg("This tutor hasn't set a home base for travel calculations yet.");
                setIsCalculating(false);
                return;
            }

            // 2. Calculate the fee via Google Maps API using the REAL origin
            const response = await fetch('/api/distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin: tutorHomeBase, //   Now uses your real address!
                    destination: address
                })
            });

            const data = await response.json();

            if (response.ok && data.minutes) {
                // ... rest of your existing logic to set states and updateFormData
                setTravelTime(data.minutes);
                setTravelFee(data.minutes * 1.00);

                updateFormData({
                    parentAddress: address,
                    travelTime: data.minutes,
                    travelFee: data.minutes * 1.00,
                    booking_address_text: address
                });
            } else {
                setErrorMsg(data.error || "Address not found.");
            }
        } catch (error) {
            setErrorMsg("Calculation failed.");
        }
        setIsCalculating(false);
    };

    const currentMode = formData.lessonMode || 'online';
    const basePrice = formData.price || 70;

    const isTravelFeeApplied = currentMode === 'in-person' && travelFee > 0;
    const totalPrice = Number((basePrice + (isTravelFeeApplied ? travelFee : 0)).toFixed(2));

    const canContinue = currentMode === 'online' || (currentMode === 'in-person' && travelFee > 0);

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Select Lesson Type</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => handleSelect('online')}
                    className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-start ${currentMode === 'online' ? 'border-[#24985b] bg-[#eaf6ef] shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white'
                        }`}
                >
                    <VideoIcon className={`w-7 h-7 mb-3 ${currentMode === 'online' ? 'text-[#24985b]' : 'text-gray-400'}`} />
                    <p className="font-bold text-gray-900 text-lg">Online</p>
                    <p className="text-gray-500 text-sm mt-1">Video call lesson</p>
                </button>

                <button
                    onClick={() => handleSelect('in-person')}
                    className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-start ${currentMode === 'in-person' ? 'border-[#24985b] bg-[#eaf6ef] shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white'
                        }`}
                >
                    <LocationIcon className={`w-7 h-7 mb-3 ${currentMode === 'in-person' ? 'text-[#24985b]' : 'text-gray-400'}`} />
                    <p className="font-bold text-gray-900 text-lg">In-Person</p>
                    <p className="text-gray-500 text-sm mt-1">Travel fee based on distance</p>
                </button>
            </div>

            {currentMode === 'in-person' && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="font-bold text-gray-900 mb-1">Where will the lesson be?</h3>
                    <p className="text-sm text-gray-500 mb-4">Enter your address to calculate the tutor's travel fee.</p>

                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="e.g. 123 Main St, Auckland"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#24985b]/50 focus:border-[#24985b] transition-all"
                        />
                        <button
                            onClick={calculateDistanceFee}
                            disabled={!address.trim() || isCalculating}
                            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                            {isCalculating ? 'Calculating...' : 'Calculate Fee'}
                        </button>
                    </div>

                    {errorMsg && (
                        <p className="mt-3 text-red-500 text-sm font-medium">{errorMsg}</p>
                    )}

                    {travelTime > 0 && !isCalculating && !errorMsg && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-[#24985b] font-medium bg-[#eaf6ef] p-3 rounded-lg border border-[#24985b]/20">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            This is a {travelTime} minute drive for {formData.tutorName || 'the tutor'}. A travel fee of ${travelFee.toFixed(2)} has been applied.
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8 border border-gray-200 rounded-2xl p-6 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900">Booking Summary</h3>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5"><ClockIcon />{formData.duration || 60} mins</div>
                        <div className="flex items-center gap-1.5"><DollarIcon />Base: ${basePrice.toFixed(2)}</div>
                        {isTravelFeeApplied && (
                            <div className="flex items-center gap-1.5 text-orange-500">
                                <LocationIcon className="w-4 h-4 opacity-70" />Travel: ${travelFee.toFixed(2)}
                            </div>
                        )}
                    </div>

                    <div className="text-[#24985b] font-bold text-lg pt-1">Total: ${totalPrice.toFixed(2)}</div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors w-full md:w-auto">Back</button>
                    <button onClick={nextStep} disabled={!canContinue} className="bg-[#24985b] text-white px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-[#1d824d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full md:w-auto gap-2">
                        Continue
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Inline SVGs 
function VideoIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
}
function LocationIcon({ className }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function ClockIcon() {
    return <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function DollarIcon() {
    return <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}