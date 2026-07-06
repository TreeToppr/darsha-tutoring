'use client';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

function UploadContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const autoBookingId = searchParams.get('bookingId');

    // Selection States
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('All');
    const [bookings, setBookings] = useState([]);
    const [selectedBookingId, setSelectedBookingId] = useState(autoBookingId || '');

    // File States
    const [audioFiles, setAudioFiles] = useState([]);
    const [screenshots, setScreenshots] = useState([]);
    // 🚀 NEW: State for Transcription Videos
    const [videoFiles, setVideoFiles] = useState([]); 
    const [notes, setNotes] = useState("");

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [message, setMessage] = useState({ text: '', type: '' });

    // 2026 Term Dates (NZ)
    const termDates = {
        'Term 1': { start: '2026-02-02', end: '2026-04-02' },
        'Term 2': { start: '2026-04-20', end: '2026-07-03' },
        'Term 3': { start: '2026-07-20', end: '2026-09-25' },
        'Term 4': { start: '2026-10-12', end: '2026-12-16' },
    };

    // 1. Fetch Students & Auto-load if bookingId exists
    useEffect(() => {
        async function init() {
            const { data: stus } = await supabase.from('students').select('id, full_name');
            setStudents(stus || []);

            if (autoBookingId) {
                const { data: b } = await supabase.from('bookings').select('student_id').eq('id', autoBookingId).single();
                if (b) setSelectedStudentId(b.student_id);
            }
        }
        init();
    }, [autoBookingId]);

    // 2. Fetch Bookings based on Student + Term
    useEffect(() => {
        if (!selectedStudentId) return;

        async function fetchFilteredBookings() {
            let query = supabase.from('bookings').select('id, session_date, subject').eq('student_id', selectedStudentId);

            if (selectedTerm !== 'All') {
                const range = termDates[selectedTerm];
                if (range) {
                    query = query.gte('session_date', range.start).lte('session_date', range.end);
                }
            }

            const { data } = await query.order('session_date', { ascending: false });
            setBookings(data || []);
        }
        fetchFilteredBookings();
    }, [selectedStudentId, selectedTerm]);

    // 🚀 FIXED: Added 'video' support to handlers
    const handleFileChange = (e, type) => {
        const selectedFiles = Array.from(e.target.files);
        if (type === 'audio') setAudioFiles(prev => [...prev, ...selectedFiles]);
        if (type === 'image') setScreenshots(prev => [...prev, ...selectedFiles]);
        if (type === 'video') setVideoFiles(prev => [...prev, ...selectedFiles]); 
    };

    const removeFile = (index, type) => {
        if (type === 'audio') setAudioFiles(prev => prev.filter((_, i) => i !== index));
        if (type === 'image') setScreenshots(prev => prev.filter((_, i) => i !== index));
        if (type === 'video') setVideoFiles(prev => prev.filter((_, i) => i !== index)); 
    };

    const handleUploadAndSave = async () => {
        if (!selectedBookingId) return alert("Please select a lesson first!");
        setIsUploading(true);

        try {
            // 1. Upload Screenshots
            const screenshotUrls = [];
            for (const [i, file] of screenshots.entries()) {
                setUploadProgress(`Uploading photo ${i + 1}...`);
                const path = `${selectedBookingId}/img_${Date.now()}_${i}.${file.name.split('.').pop()}`;
                const { error } = await supabase.storage.from('lesson-media').upload(path, file);
                if (error) throw error;
                screenshotUrls.push(supabase.storage.from('lesson-media').getPublicUrl(path).data.publicUrl);
            }

            // 2. Upload Audio (Standard)
            const audioUrls = [];
            for (const [i, file] of audioFiles.entries()) {
                setUploadProgress(`Uploading audio ${i + 1}...`);
                const path = `${selectedBookingId}/audio_${Date.now()}_${i}.${file.name.split('.').pop()}`;
                const { error } = await supabase.storage.from('lesson-media').upload(path, file);
                if (error) throw error;
                audioUrls.push(supabase.storage.from('lesson-media').getPublicUrl(path).data.publicUrl);
            }

            // 🚀 NEW: 3. Upload Videos and Create Transcription Job
            for (const [i, file] of videoFiles.entries()) {
                setUploadProgress(`Uploading video ${i + 1} to transcription queue...`);
                // Use the private bucket
                const path = `${selectedBookingId}/video_${Date.now()}_${i}.${file.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage.from('lesson-recordings').upload(path, file);
                if (uploadError) throw uploadError;

                // Create the pending transcription job for the local worker
                const { error: dbError } = await supabase.from('transcriptions').insert({
                    booking_id: selectedBookingId,
                    file_path: path,
                    status: 'pending'
                });
                if (dbError) throw dbError;
            }

            // 4. Save Record
            setUploadProgress("Saving report...");
            const { data: newReport, error: insertError } = await supabase.from('lesson_reports').insert({
                booking_id: selectedBookingId,
                student_id: selectedStudentId,
                screenshot_urls: screenshotUrls,
                recording_urls: audioUrls,
                tutor_notes: notes,
                ai_summary: "Drafting...",
                is_approved: false
            }).select().single();

            if (insertError) throw insertError;

            setUploadProgress("AI Brain is analyzing recordings...");
            await fetch('/api/ai/analyze-lesson', {
                method: 'POST',
                body: JSON.stringify({ reportId: newReport.id })
            });

            setMessage({ text: "Success! Report & Transcriptions Queued.", type: 'success' });
            setTimeout(() => {
                if (autoBookingId) {
                    router.push(`/bookings/${autoBookingId}`);
                } else {
                    router.push(`/tutor-dashboard`);
                }
            }, 2000);

        } catch (err) {
            setMessage({ text: "Error: " + err.message, type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8 pb-32">
            <div>
                <h1 className="text-3xl font-black text-gray-900">Lesson Wrap-up</h1>
                <p className="text-gray-500">Document progress and queue videos for transcription.</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-8">
                {/* 📋 Step 1 & 2: Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Select Student</label>
                        <select
                            className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-700 outline-none border-2 border-transparent focus:border-[#24985b]/20"
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            disabled={!!autoBookingId}
                        >
                            <option value="">Choose Student...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">2. Select Term</label>
                        <select
                            className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-700 outline-none border-2 border-transparent focus:border-[#24985b]/20"
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                        >
                            <option value="All">All Lessons</option>
                            {Object.keys(termDates).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">3. Pick the Lesson</label>
                    <select
                        className={`w-full p-4 rounded-2xl font-bold outline-none border-2 transition-all ${selectedBookingId ? 'bg-emerald-50 border-[#24985b] text-[#24985b]' : 'bg-gray-50 border-transparent text-gray-700'}`}
                        value={selectedBookingId}
                        onChange={(e) => setSelectedBookingId(e.target.value)}
                        disabled={!!autoBookingId}
                    >
                        <option value="">Select specific lesson...</option>
                        {bookings.map(b => (
                            <option key={b.id} value={b.id}>
                                {new Date(b.session_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} — {b.subject}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 📸 Photos */}
                <div className="pt-6 border-t border-gray-100 space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">4. Lesson Screenshots / Worksheets</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {screenshots.map((f, i) => (
                            <div key={i} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group">
                                <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="preview" />
                                <button onClick={() => removeFile(i, 'image')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                        <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#24985b] hover:bg-emerald-50 transition-all text-gray-400 hover:text-[#24985b]">
                            <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span className="text-[10px] font-bold uppercase">Add Photo</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                        </label>
                    </div>
                </div>

                {/* 🎙️ Audio */}
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">5. Short Voice Recordings</label>
                    <div className="space-y-2">
                        {audioFiles.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                                    </div>
                                    <span className="text-sm font-bold text-blue-700 truncate max-w-[200px]">{f.name}</span>
                                </div>
                                <button onClick={() => removeFile(i, 'audio')} className="text-blue-400 hover:text-red-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                        <label className="w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 cursor-pointer hover:border-[#24985b] hover:bg-emerald-50 transition-all text-gray-400 hover:text-[#24985b]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span className="text-sm font-bold">Add Audio Clip</span>
                            <input type="file" multiple accept="audio/*" className="hidden" onChange={(e) => handleFileChange(e, 'audio')} />
                        </label>
                    </div>
                </div>

                {/* 🎥 🚀 NEW: Video Transcription Block */}
                <div className="pt-6 border-t border-gray-100 space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">6. Lesson Video (For AI Transcription)</label>
                    <p className="text-xs text-gray-500 font-medium">Recordings added here are sent to your local worker. They are hidden from the public.</p>
                    <div className="space-y-2">
                        {videoFiles.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                                    </div>
                                    <span className="text-sm font-bold text-purple-700 truncate max-w-[200px]">{f.name}</span>
                                </div>
                                <button onClick={() => removeFile(i, 'video')} className="text-purple-400 hover:text-red-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                        <label className="w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 cursor-pointer hover:border-[#24985b] hover:bg-emerald-50 transition-all text-gray-400 hover:text-[#24985b]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <span className="text-sm font-bold">Add Google Meet Video</span>
                            <input type="file" multiple accept="video/*,audio/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                        </label>
                    </div>
                </div>

                {/* 📝 Tutor Notes / Zoom Summary */}
                <div className="pt-6 border-t border-gray-100 space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">7. Lesson Notes / Zoom Summary</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Paste Zoom AI summary or type your manual notes here..."
                        className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-medium text-gray-900 outline-none focus:border-[#24985b] focus:bg-white transition-all min-h-[120px] resize-y"
                    />
                </div>

                <button
                    onClick={handleUploadAndSave}
                    disabled={isUploading || !selectedBookingId}
                    className="w-full py-5 bg-[#24985b] text-white rounded-2xl font-black text-xl shadow-lg shadow-[#24985b]/20 hover:bg-[#1d824d] transition-all disabled:opacity-30"
                >
                    {isUploading ? uploadProgress : "Save & Generate Report"}
                </button>

                {message.text && (
                    <div className={`p-4 rounded-2xl text-center font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function UploadLessonPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <UploadContent />
        </Suspense>
    );
}