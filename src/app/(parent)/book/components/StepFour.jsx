'use client';
import { useEffect, useRef } from 'react';

export default function StepFour({ formData, updateFormData, nextStep, prevStep }) {
    //   Pull the live rate from Step Three ($30 or $40)
    const hourlyRate = formData.rate || 60;

    const durations = [
        { mins: 30, note: "First lesson free" },
        { mins: 60 }, { mins: 90 }, { mins: 120 },
        { mins: 150 }, { mins: 180 }, { mins: 210 }, { mins: 240 },
    ];

    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && !formData.duration) {
            // Force the initial default to use the correct live rate
            updateFormData({ duration: 60, price: hourlyRate });
            hasInitialized.current = true;
        }
    }, [formData.duration, hourlyRate, updateFormData]);

    const handleSelect = (mins) => {
        const price = mins === 30 ? 0 : (mins / 60) * hourlyRate;
        updateFormData({ duration: mins, price: Number(price.toFixed(2)) });
    };

    //   THE FIX: We ensure the display constants strictly follow the formData
    const currentDuration = formData.duration || 60;
    const currentPrice = formData.price !== undefined ? formData.price : (currentDuration === 30 ? 0 : (currentDuration / 60) * hourlyRate);

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Select Lesson Length</h2>
                <p className="text-gray-500 font-medium mt-1">
                    Rate: <span className="text-[#24985b] font-bold">${hourlyRate}/hr</span> based on student year level.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {durations.map((item) => {
                    const isSelected = currentDuration === item.mins;
                    const calculatedPrice = item.mins === 30 ? 0 : (item.mins / 60) * hourlyRate;

                    return (
                        <button
                            key={item.mins}
                            onClick={() => handleSelect(item.mins)}
                            className={`flex flex-col items-center justify-center p-6 rounded-[1.5rem] border-2 transition-all duration-200 active:scale-95 ${isSelected
                                ? 'border-[#24985b] bg-[#eaf6ef] shadow-sm'
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                                }`}
                        >
                            <p className={`font-black text-lg ${isSelected ? 'text-[#24985b]' : 'text-gray-900'}`}>{item.mins} mins</p>
                            <p className="text-gray-500 font-bold">${calculatedPrice.toFixed(2)}</p>

                            {item.note && (
                                <p className="text-[#24985b] text-[10px] font-black uppercase tracking-widest mt-3 text-center leading-tight bg-white px-2 py-1 rounded-lg border border-[#24985b]/20">
                                    {item.note}
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 border-2 border-gray-50 rounded-[2rem] p-8 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Booking Summary</h3>
                    <div className="flex items-center gap-6 text-sm text-gray-500 font-bold py-2">
                        <div className="flex items-center gap-1.5">
                            <ClockIcon /> {currentDuration} mins
                        </div>
                        <div className="flex items-center gap-1.5">
                            <DollarIcon /> ${hourlyRate}/hr
                        </div>
                    </div>
                    {/*   THE FIX: This now points to the dynamically updated currentPrice */}
                    <div className="text-[#24985b] font-black text-3xl pt-1">
                        Total: ${Number(currentPrice).toFixed(2)}
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={prevStep}
                        className="px-8 py-4 rounded-2xl font-bold text-gray-500 bg-white border-2 border-gray-100 hover:bg-gray-50 transition-all active:scale-95 w-full md:w-auto"
                    >
                        Back
                    </button>
                    <button
                        onClick={nextStep}
                        className="bg-[#24985b] text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-[#24985b]/20 hover:bg-[#1d824d] hover:-translate-y-0.5 transition-all flex items-center justify-center w-full md:w-auto active:scale-95"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}

function ClockIcon() {
    return <svg className="w-4 h-4 text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function DollarIcon() {
    return <svg className="w-4 h-4 text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}