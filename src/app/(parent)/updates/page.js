'use client';
import Link from 'next/link';

// 📝 Simply add new objects to the top of this array when you push updates!
const updatesData = [
    {
        id: 1,
        version: "v1.1.0",
        date: "April 4, 2026",
        title: "Bulletproof Bank Transfers & Smart Sync ⚡",
        description: "We completely overhauled how manual bank transfers work to make sure your payments are instantly tracked, verified, and never lost.",
        added: [
            "Unique 'Billing Codes' (e.g., SAM436) permanently assigned to every student.",
            "Automated payment syncing engine that matches your bank deposits to your lessons."
        ],
        updated: [
            "Checkout screen now displays your exact, unique bank reference code.",
            "Parent dashboard now immediately updates the lesson status as soon as the bank clears the payment."
        ],
        fixed: [
            "Resolved an issue where bank payments had to be manually verified by the tutor."
        ]
    }
];

export default function UpdatesPage() {
    return (
        <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">What's New</h1>
                <p className="text-gray-500 mt-2 font-medium">The latest updates, improvements, and fixes to DarshaTutor.</p>
            </div>

            <div className="space-y-10">
                {updatesData.map((update) => (
                    <div key={update.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#eaf6ef] rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mb-6">
                                <span className="inline-block bg-[#24985b] text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-widest w-max">
                                    {update.version}
                                </span>
                                <span className="text-gray-400 font-bold text-sm tracking-wider uppercase">
                                    {update.date}
                                </span>
                            </div>

                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">{update.title}</h2>
                            <p className="text-gray-600 font-medium text-lg mb-8 leading-relaxed">
                                {update.description}
                            </p>

                            <div className="space-y-6">
                                {/* ADDED SECTION */}
                                {update.added && update.added.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-[#24985b] uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                            Added
                                        </h3>
                                        <ul className="space-y-2">
                                            {update.added.map((item, index) => (
                                                <li key={index} className="flex items-start gap-3 text-gray-700 font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#24985b] mt-2 shrink-0"></span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* UPDATED SECTION */}
                                {update.updated && update.updated.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            Updated
                                        </h3>
                                        <ul className="space-y-2">
                                            {update.updated.map((item, index) => (
                                                <li key={index} className="flex items-start gap-3 text-gray-700 font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* FIXED SECTION */}
                                {update.fixed && update.fixed.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                                            Fixed
                                        </h3>
                                        <ul className="space-y-2">
                                            {update.fixed.map((item, index) => (
                                                <li key={index} className="flex items-start gap-3 text-gray-700 font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0"></span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center">
                <Link href="/parent-dashboard" className="text-sm font-bold text-gray-400 hover:text-[#24985b] transition-colors">
                    &larr; Back to Dashboard
                </Link>
            </div>
        </div>
    );
}