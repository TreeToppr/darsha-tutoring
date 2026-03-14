'use client';
import { useState, useEffect } from 'react';
import { fetchAdminDashboardData, createManualBookingAsAdmin, updateBookingAsAdmin, deleteBookingAsAdmin } from './actions';

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [students, setStudents] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Tracks if we are editing an existing booking
    const [editingId, setEditingId] = useState(null);

    const [selectedTutor, setSelectedTutor] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [subject, setSubject] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState(60);
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('online');
    const [paymentStatus, setPaymentStatus] = useState('paid');
    const [bookingStatus, setBookingStatus] = useState('accepted');

    // 🚀 TAB STATE
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'all'

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        setLoading(true);
        try {
            const data = await fetchAdminDashboardData();
            if (data.errors?.bErr) console.error("❌ Bookings Fetch Error:", data.errors.bErr);
            if (data.errors?.tErr) console.error("❌ Tutors Fetch Error:", data.errors.tErr);
            if (data.errors?.sErr) console.error("❌ Students Fetch Error:", data.errors.sErr);

            setBookings(data.bookings);
            setTutors(data.tutors);
            setStudents(data.students);
            setSubjectsList(data.subjects);
        } catch (err) {
            console.error("Critical error loading admin data:", err);
        }
        setLoading(false);
    }

    const openCreateModal = () => {
        setEditingId(null);
        setSelectedTutor('');
        setSelectedStudent('');
        setSubject('');
        setDate('');
        setTime('');
        setDuration(60);
        setAmount('');
        setMode('online');
        setPaymentStatus('paid');
        setBookingStatus('accepted');
        setIsModalOpen(true);
    };

    const openEditModal = (b) => {
        setEditingId(b.id);
        setSelectedTutor(b.tutor_id || '');
        setSelectedStudent(b.student_id || '');
        setSubject(b.subject || '');
        setDate(b.session_date || '');
        setTime(b.start_time ? b.start_time.slice(0, 5) : '');
        setDuration(b.duration || 60);
        setAmount(b.amount_total || '');
        setMode(b.lesson_mode || 'online');
        setPaymentStatus(b.payment_status || 'unpaid');
        setBookingStatus(b.status || 'accepted');
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this booking?")) return;
        const result = await deleteBookingAsAdmin(id);
        if (!result.success) {
            alert("Failed to delete: " + result.error);
        } else {
            loadDashboard();
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const studentObj = students.find(s => s.id === selectedStudent);
        if (!studentObj) {
            alert("Please select a valid student.");
            setSubmitting(false);
            return;
        }

        let [hours, minutes] = time.split(':').map(Number);
        let totalMins = (hours * 60) + minutes + Number(duration);
        let endHours = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
        let endMins = String(totalMins % 60).padStart(2, '0');
        let endTime = `${endHours}:${endMins}`;

        const selectedSubjObj = subjectsList.find(sub => (sub.name || sub.subject_name || sub.title) === subject);

        const payload = {
            tutor_id: selectedTutor,
            student_id: selectedStudent,
            parent_id: studentObj.parent_id,
            subject: subject,
            subject_id: selectedSubjObj?.id || null,
            session_date: date,
            start_time: time,
            end_time: endTime,
            duration: Number(duration),
            amount_total: parseFloat(amount || 0),
            lesson_mode: mode,
            status: bookingStatus,
            payment_status: paymentStatus,
        };

        let result;
        if (editingId) {
            result = await updateBookingAsAdmin(editingId, payload);
        } else {
            result = await createManualBookingAsAdmin(payload);
        }

        setSubmitting(false);

        if (!result.success) {
            alert(`Failed to ${editingId ? 'update' : 'create'} booking: ` + result.error);
        } else {
            setIsModalOpen(false);
            loadDashboard();
        }
    };

    const formatBeautifulDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTimeOnly = (timeStr) => {
        if (!timeStr) return '';
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(val);

    // 🚀 FILTERING LOGIC
    const today = new Date().toISOString().split('T')[0];
    const filteredBookings = bookings.filter(b => {
        if (activeTab === 'upcoming') return b.session_date >= today;
        if (activeTab === 'past') return b.session_date < today;
        return true; // 'all'
    });

    if (loading) return <div className="p-20 text-center font-bold text-gray-400 animate-pulse">Loading Secure Database...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 p-4 md:p-8 pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Master Bookings</h1>
                    <p className="text-gray-500 mt-1 font-medium">Manage and track all platform lessons</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-black/10 transition-all flex items-center gap-2"
                >
                    <PlusIcon /> Create Manual Booking
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                {/* 🚀 TAB SWITCHER HEADER */}
                <div className="px-8 pt-8 border-b border-gray-50 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-black text-gray-900 text-xl">Platform Records</h2>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                            {filteredBookings.length} {activeTab}
                        </span>
                    </div>

                    <div className="flex gap-8">
                        {['upcoming', 'past', 'all'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-4 text-sm font-bold capitalize transition-all relative ${activeTab === tab ? 'text-[#24985b]' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#24985b] rounded-t-full animate-in fade-in slide-in-from-bottom-1" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {filteredBookings.length === 0 ? (
                        <div className="p-20 text-center text-gray-400 font-medium italic">No {activeTab} bookings found.</div>
                    ) : (
                        filteredBookings.map(b => (
                            <div key={b.id} className="p-6 md:p-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:bg-gray-50/50 transition-colors group">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-2">
                                        {b.subject}
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${b.status === 'accepted' || b.status === 'completed' ? 'bg-[#eaf6ef] text-[#24985b]' : b.status === 'cancelled' || b.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                                            {b.status}
                                        </span>
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-gray-500">
                                        <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-lg text-gray-700">
                                            <UserIcon className="w-3 h-3" /> {b.students?.full_name || b.students?.first_name || 'Unknown Student'}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                                            <TutorIcon className="w-3 h-3" /> {b.tutors?.profiles?.full_name || b.tutors?.profiles?.first_name || 'Unknown Tutor'}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[#24985b]">
                                            📅 {formatBeautifulDate(b.session_date)} at {formatTimeOnly(b.start_time)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8 text-right mt-4 md:mt-0">
                                    <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(b)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Booking">
                                            <EditIcon />
                                        </button>
                                        <button onClick={() => handleDelete(b.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Booking">
                                            <TrashIcon />
                                        </button>
                                    </div>

                                    <div>
                                        <p className="text-xl font-black text-gray-900">{formatCurrency(b.amount_total)}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${b.payment_status === 'paid' ? 'text-[#24985b]' : 'text-orange-500'}`}>{b.payment_status}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in overflow-y-auto" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 my-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-8 md:p-10 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">{editingId ? 'Edit Booking' : 'Manual Booking'}</h2>
                                <p className="text-gray-500 text-sm font-medium mt-1">{editingId ? 'Update lesson details.' : 'Record a lesson manually.'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                                <CloseIcon />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-8 md:p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Tutor</label>
                                    <select required value={selectedTutor} onChange={e => setSelectedTutor(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all">
                                        <option value="">Select Tutor...</option>
                                        {tutors.map(t => <option key={t.id} value={t.id}>{t.profiles?.full_name || t.profiles?.first_name || 'Unnamed Tutor'}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Student</label>
                                    <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all">
                                        <option value="">Select Student...</option>
                                        {students.map(s => {
                                            const studentName = s.full_name || s.first_name || s.name || 'Unnamed Student';
                                            const parentName = s.parent?.full_name || s.parent?.first_name || 'No Parent Info';
                                            return <option key={s.id} value={s.id}>{studentName} (Parent: {parentName})</option>
                                        })}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Subject / Topic</label>
                                    {subjectsList.length > 0 ? (
                                        <select required value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all">
                                            <option value="">Select a Subject...</option>
                                            {subjectsList.map(sub => {
                                                const subName = sub.name || sub.subject_name || sub.title;
                                                return <option key={sub.id} value={subName}>{subName}</option>
                                            })}
                                        </select>
                                    ) : (
                                        <input required type="text" placeholder="e.g. Math" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all" />
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Booking Status</label>
                                    <select value={bookingStatus} onChange={e => setBookingStatus(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all">
                                        <option value="requested">Requested</option>
                                        <option value="accepted">Accepted</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Date</label>
                                    <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Start Time</label>
                                    <input required type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Duration</label>
                                    <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all">
                                        <option value={30}>30 mins</option>
                                        <option value={45}>45 mins</option>
                                        <option value={60}>60 mins</option>
                                        <option value={90}>90 mins</option>
                                        <option value={120}>120 mins</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Price ($)</label>
                                    <input required type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Mode</label>
                                    <select value={mode} onChange={e => setMode(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all">
                                        <option value="online">Online</option>
                                        <option value="in_person">In Person</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Payment Status</label>
                                    <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:border-black transition-all">
                                        <option value="paid">Paid</option>
                                        <option value="unpaid">Unpaid</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button type="submit" disabled={submitting} className="w-full bg-black hover:bg-gray-800 text-white py-5 rounded-2xl font-black transition-all shadow-xl shadow-black/10 disabled:opacity-50">
                                    {submitting ? 'Saving Record...' : (editingId ? 'Update Booking' : 'Create Booking Record')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Icon components remain the same
function PlusIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>; }
function CloseIcon() { return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>; }
function UserIcon({ className = "w-4 h-4" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>; }
function TutorIcon({ className = "w-4 h-4" }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>; }
function EditIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>; }
function TrashIcon() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>; }