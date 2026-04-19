'use server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function fetchAdminDashboardData() {
    const { data: bookings, error: bErr } = await supabaseAdmin
        .from('bookings')
        .select('*, students(*), tutors(*, profiles(*))')
        .order('session_date', { ascending: false });

    const { data: tutors, error: tErr } = await supabaseAdmin
        .from('tutors')
        .select('id, profiles(*)');

    const { data: students, error: sErr } = await supabaseAdmin
        .from('students')
        .select('*, parent:profiles!parent_id(*)');

    const { data: subjects, error: subjErr } = await supabaseAdmin
        .from('subjects')
        .select('*');

    return {
        bookings: bookings || [],
        tutors: tutors || [],
        students: students || [],
        subjects: subjects || [],
        errors: { bErr, tErr, sErr, subjErr }
    };
}

export async function createManualBookingAsAdmin(newBooking) {
    const { data, error } = await supabaseAdmin
        .from('bookings')
        .insert([newBooking])
        .select();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

//   NEW: Edit an existing booking
export async function updateBookingAsAdmin(id, updateData) {
    const { data, error } = await supabaseAdmin
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

//   NEW: Delete a booking completely
export async function deleteBookingAsAdmin(id) {
    const { error } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
}