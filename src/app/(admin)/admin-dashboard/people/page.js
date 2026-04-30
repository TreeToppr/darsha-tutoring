'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminPeopleDirectory() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('parents'); // 'parents' or 'students'
    const [parents, setParents] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // For the expanding Parent cards
    const [expandedParentId, setExpandedParentId] = useState(null);
    const [savingDiscountId, setSavingDiscountId] = useState(null);
    const [savingNoteId, setSavingNoteId] = useState(null);

    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const [savingStudentNameId, setSavingStudentNameId] = useState(null);

    useEffect(() => {
        fetchDirectoryData();
    }, []);

    async function fetchDirectoryData() {
        setLoading(true);

        // 1. Fetch Parents (Users with role='parent')
        // Note: In a real production app, you might need an Edge Function to query the auth.users table,
        // but assuming you store parent profiles in 'profiles', we query that.
        const { data: parentProfiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'parent')
            .order('full_name', { ascending: true });

        // 2. Fetch Students (with their parent info attached)
        const { data: studentList } = await supabase
            .from('students')
            .select(`
                *,
                parent:parent_id ( full_name, email )
            `)
            .order('full_name', { ascending: true });

        // 3. Fetch Bookings to calculate Financial Snapshots for Parents
        const { data: bookings } = await supabase
            .from('bookings')
            .select('parent_id, amount_total, payment_status, status');

        // 4. Assemble the massive "God Mode" Parent object
        const enrichedParents = (parentProfiles || []).map(parent => {
            const children = studentList?.filter(s => s.parent_id === parent.id) || [];
            const parentBookings = bookings?.filter(b => b.parent_id === parent.id && b.status !== 'cancelled') || [];

            const totalSpent = parentBookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.amount_total, 0);
            const unpaidBalance = parentBookings.filter(b => b.payment_status === 'unpaid').reduce((sum, b) => sum + b.amount_total, 0);

            return {
                ...parent,
                children,
                totalSpent,
                unpaidBalance,
                activeBookingsCount: parentBookings.length,
                discount_percentage: parent.discount_percentage || 0, // Assuming you add this column!
                admin_notes: parent.admin_notes || "" // Assuming you add this column!
            };
        });

        setParents(enrichedParents);
        setStudents(studentList || []);
        setLoading(false);
    }

    // --- MAGIC LOGIN (IMPERSONATE) ---
    const handleImpersonate = async (parentId) => {
        if (!window.confirm("WARNING: You are about to log in as this parent. You will be logged out of your Admin account. Continue?")) return;

        // Supabase has a built in 'admin' auth method to generate magic links, 
        // but for now, we simulate the jump (you would need an edge function to force the session switch securely)
        alert(`In production, this will swap your session token to Parent ID: ${parentId} and redirect to /parent-dashboard`);
        // Example Edge Function call: await fetch('/api/admin/impersonate', { method: 'POST', body: JSON.stringify({ userId: parentId }) })
        // window.location.href = '/parent-dashboard';
    };

    // --- SAVE DISCOUNT ---
    const handleUpdateDiscount = async (parentId, newDiscount) => {
        setSavingDiscountId(parentId);
        // Note: You must add a 'discount_percentage' integer column to your 'profiles' table for this to save!
        const { error } = await supabase.from('profiles').update({ discount_percentage: newDiscount }).eq('id', parentId);
        if (!error) {
            setParents(parents.map(p => p.id === parentId ? { ...p, discount_percentage: newDiscount } : p));
        }
        setSavingDiscountId(null);
    };

    // --- EDIT PARENT NAME ---
    const handleEditParentName = async (e, parentId, currentName) => {
        e.stopPropagation(); // Prevents the card from expanding when clicking the edit button
        const newName = window.prompt("Edit Parent's Name:", currentName);

        if (newName && newName.trim() !== "" && newName !== currentName) {
            const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', parentId);
            if (!error) {
                setParents(parents.map(p => p.id === parentId ? { ...p, full_name: newName } : p));
            } else {
                alert("Error updating name: " + error.message);
            }
        }
    };

    // --- EDIT STUDENT NAME ---
    const handleEditStudentName = async (e, studentId, currentName) => {
        e.stopPropagation();
        const newName = window.prompt("Edit Student's Name:", currentName);

        if (newName && newName.trim() !== "" && newName !== currentName) {
            setSavingStudentNameId(studentId);
            const { error } = await supabase.from('students').update({ full_name: newName }).eq('id', studentId);
            if (!error) {
                setStudents(students.map(s => s.id === studentId ? { ...s, full_name: newName } : s));
            } else {
                alert("Error updating name: " + error.message);
            }
            setSavingStudentNameId(null);
        }
    };

    // --- SAVE ADMIN NOTES ---
    const handleSaveNote = async (parentId, noteText) => {
        setSavingNoteId(parentId);
        // Note: You must add an 'admin_notes' text column to your 'profiles' table for this to save!
        const { error } = await supabase.from('profiles').update({ admin_notes: noteText }).eq('id', parentId);
        if (!error) {
            setParents(parents.map(p => p.id === parentId ? { ...p, admin_notes: noteText } : p));
        }
        setSavingNoteId(null);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(val);

    if (loading) return <div className="p-12 text-center text-[#24985b] font-black animate-pulse">Loading Directory...</div>;

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8 animate-in fade-in duration-500 pb-32">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">People Directory</h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage families, set discounts, and view financial snapshots.</p>
                </div>

                {/* Custom Tab Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('parents')}
                        className={`flex-1 md:w-32 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'parents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Parents
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`flex-1 md:w-32 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'students' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Students
                    </button>
                </div>
            </div>

            {/* --- PARENTS TAB --- */}
            {activeTab === 'parents' && (
                <div className="space-y-4">
                    {parents.map(parent => {
                        const isExpanded = expandedParentId === parent.id;

                        return (
                            <div key={parent.id} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-[#24985b] shadow-lg ring-4 ring-[#24985b]/10' : 'border-gray-200 hover:border-gray-300 shadow-sm'}`}>

                                {/* Header Row (Always Visible) */}
                                <div
                                    onClick={() => setExpandedParentId(isExpanded ? null : parent.id)}
                                    className="p-6 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#24985b]/10 text-[#24985b] flex items-center justify-center font-black text-xl uppercase shrink-0">
                                            {parent.full_name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-black text-gray-900">{parent.full_name}</h3>
                                                <button
                                                    onClick={(e) => handleEditParentName(e, parent.id, parent.full_name)}
                                                    className="text-gray-400 hover:text-[#24985b] transition-colors p-1"
                                                    title="Edit Parent Name"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                            <p className="text-sm font-medium text-gray-500">{parent.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className="hidden sm:block text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unpaid Balance</p>
                                            <p className={`font-black ${parent.unpaidBalance > 0 ? 'text-red-500' : 'text-gray-900'}`}>{formatCurrency(parent.unpaidBalance)}</p>
                                        </div>
                                        <div className="hidden sm:block text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Spent</p>
                                            <p className="font-bold text-gray-600">{formatCurrency(parent.totalSpent)}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-auto">
                                            <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded "God Mode" Area */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/30 p-6 md:p-8 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                            {/* Column 1: Financials & Discount Engine */}
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-[#24985b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Financial Control
                                                    </h4>

                                                    {/* Discount Slider */}
                                                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-bold text-gray-700 text-sm">Family Discount</span>
                                                            <span className="font-black text-[#24985b] bg-[#eaf6ef] px-3 py-1 rounded-full text-sm">{parent.discount_percentage}%</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="0" max="100" step="5"
                                                            value={parent.discount_percentage}
                                                            onChange={(e) => handleUpdateDiscount(parent.id, parseInt(e.target.value))}
                                                            className="w-full accent-[#24985b] cursor-pointer"
                                                        />
                                                        <p className="text-[10px] font-medium text-gray-400 mt-3 text-center">
                                                            Saves them <strong className="text-gray-700">{formatCurrency(60 * (parent.discount_percentage / 100))}</strong> on a standard $60 lesson.
                                                        </p>
                                                        {savingDiscountId === parent.id && <p className="text-xs text-[#24985b] font-bold text-center mt-2 animate-pulse">Saving...</p>}
                                                    </div>
                                                </div>

                                                {/* Magic Login Button */}
                                                <button
                                                    onClick={() => handleImpersonate(parent.id)}
                                                    className="w-full group bg-black text-white px-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors shadow-lg"
                                                >
                                                    <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    Login as Parent
                                                </button>
                                            </div>

                                            {/* Column 2: Children/Students */}
                                            <div className="lg:col-span-2 space-y-6">
                                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                    Associated Students ({parent.children.length})
                                                </h4>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {parent.children.map(child => (
                                                        <div key={child.id} className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-3 shadow-sm">
                                                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full font-black flex items-center justify-center shrink-0 uppercase">
                                                                {child.full_name?.[0] || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 leading-tight">{child.full_name}</p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                    Year {child.year_level || 'Not Set'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {parent.children.length === 0 && (
                                                        <p className="text-sm italic text-gray-400 bg-white p-4 rounded-xl border border-dashed border-gray-200">No students added yet.</p>
                                                    )}
                                                </div>

                                                {/* Admin Notes */}
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        Private Admin Notes
                                                    </h4>
                                                    <div className="relative">
                                                        <textarea
                                                            defaultValue={parent.admin_notes}
                                                            onBlur={(e) => handleSaveNote(parent.id, e.target.value)}
                                                            placeholder="Private notes about this family (only you can see this)..."
                                                            className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[120px] resize-none"
                                                        />
                                                        {savingNoteId === parent.id && (
                                                            <div className="absolute bottom-4 right-4 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md animate-pulse">Saving...</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- STUDENTS TAB --- */}
            {/* --- STUDENTS TAB (UPGRADED) --- */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    {students.map(student => {
                        const isExpanded = expandedStudentId === student.id;
                        
                        // Find this student's specific bookings from the ones we already fetched
                        // (You might need to adjust this if you want full booking history shown, 
                        // but this links them to their parent's discount easily)
                        const parentInfo = parents.find(p => p.id === student.parent_id);

                        return (
                            <div key={student.id} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-blue-500 shadow-lg ring-4 ring-blue-500/10' : 'border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                                
                                {/* Header Row */}
                                <div 
                                    onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                                    className="p-6 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl uppercase shrink-0">
                                            {student.full_name?.[0] || '?'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-black text-gray-900">
                                                    {student.full_name} 
                                                    {savingStudentNameId === student.id && <span className="text-xs text-blue-500 ml-2 animate-pulse">Saving...</span>}
                                                </h3>
                                                <button 
                                                    onClick={(e) => handleEditStudentName(e, student.id, student.full_name)}
                                                    className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                                                    title="Edit Student Name"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                            <p className="text-sm font-medium text-gray-500">Year {student.year_level || 'N/A'} • Billing Code: <span className="font-mono bg-gray-100 px-1 rounded">{student.billing_code || 'PENDING'}</span></p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className="hidden sm:block text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parent</p>
                                            <p className="font-bold text-gray-700">{student.parent?.full_name || 'Unknown'}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ml-auto">
                                            <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Area */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/30 p-6 md:p-8 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            
                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Active Discounts</h4>
                                                <p className="text-sm font-medium text-gray-600 mb-2">This student inherits discounts applied to their parent's profile.</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-[#24985b] bg-[#eaf6ef] px-4 py-2 rounded-xl text-lg">{parentInfo?.discount_percentage || 0}% OFF</span>
                                                    <span className="text-xs font-bold text-gray-400">Via Parent: {student.parent?.full_name}</span>
                                                </div>
                                            </div>

                                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Student Portal Status</h4>
                                                    <p className="text-sm font-medium text-gray-600">Can this student log in and book?</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${student.can_student_book ? 'bg-[#eaf6ef] text-[#24985b]' : 'bg-gray-100 text-gray-500'}`}>
                                                    {student.can_student_book ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}