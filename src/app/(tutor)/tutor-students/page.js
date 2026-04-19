'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient'; // Adjust path if needed
import Link from 'next/link';

export default function TutorStudentsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRoster();
    }, []);

    async function fetchRoster() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get the Tutor's ID
        const { data: tutorRecord } = await supabase
            .from('tutors')
            .select('id')
            .eq('profile_id', user.id)
            .single();

        if (!tutorRecord) return;

        // 2. Fetch all bookings for this tutor, and pull the student data with it!
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('id, status, students(*)')
            .eq('tutor_id', tutorRecord.id)
            .not('status', 'eq', 'cancelled'); // Ignore cancelled lessons

        if (error) {
            console.error("Error fetching roster:", error);
            setLoading(false);
            return;
        }

        // 3. The Filter Magic: Extract unique students and count their lessons
        const studentMap = new Map();

        bookings.forEach(booking => {
            const student = booking.students;
            if (!student) return;

            if (!studentMap.has(student.id)) {
                // First time seeing this student, add them to the map
                studentMap.set(student.id, {
                    ...student,
                    lessonCount: 1,
                    lastLesson: booking.session_date
                });
            } else {
                // We already have them, just increment their lesson count
                const existing = studentMap.get(student.id);
                existing.lessonCount += 1;
                // Keep the most recent date
                if (new Date(booking.session_date) > new Date(existing.lastLesson)) {
                    existing.lastLesson = booking.session_date;
                }
            }
        });

        // Convert the Map back into a standard array for React to map over
        const uniqueStudents = Array.from(studentMap.values());

        // Sort alphabetically
        uniqueStudents.sort((a, b) => a.full_name.localeCompare(b.full_name));

        setStudents(uniqueStudents);
        setLoading(false);
    }

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-10 font-bold text-gray-400 animate-pulse max-w-6xl mx-auto">Loading Roster...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">My Students</h1>
                    <p className="text-gray-500 mt-2 font-medium">You have <span className="font-bold text-[#24985b]">{students.length} active students</span> right now.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#24985b]/20 focus:border-[#24985b] shadow-sm transition-all"
                    />
                </div>
            </div>

            {filteredStudents.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 text-center shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">No students found</h3>
                    <p className="text-gray-500 font-medium">As soon as parents book lessons with you, the students will appear here automatically.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredStudents.map(student => (
                        <Link href={`/tutor-students/${student.id}`} key={student.id} className="block group">
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:border-[#24985b]/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col justify-between">

                                <div>
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-14 h-14 rounded-2xl bg-[#eaf6ef] text-[#24985b] flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">
                                            {student.first_name?.[0] || student.full_name?.[0] || 'S'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-gray-900 leading-tight group-hover:text-[#24985b] transition-colors">{student.full_name}</h3>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {student.billing_code || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-5 border-t border-gray-50">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Lessons</p>
                                        <p className="font-black text-gray-900">{student.lessonCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                        <p className="font-black text-[#24985b]">Active</p>
                                    </div>
                                </div>

                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}