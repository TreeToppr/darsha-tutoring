import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase securely for the backend
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
    try {
        // ==========================================
        // 1. FETCH AKAHU TRANSACTIONS
        // ==========================================
        const appToken = process.env.AKAHU_APP_TOKEN;
        const userToken = process.env.AKAHU_USER_TOKEN;

        const akahuRes = await fetch('https://api.akahu.io/v1/transactions', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'X-Akahu-Id': appToken,
                'Accept': 'application/json'
            }
        });

        if (!akahuRes.ok) throw new Error("Failed to fetch from Akahu");
        const akahuData = await akahuRes.json();

        // ==========================================
        // 2. PREVENT THE "DOUBLE DIP"
        // ==========================================
        const { data: paidBookings, error: paidErr } = await supabase
            .from('bookings')
            .select('payment_reference')
            .not('payment_reference', 'is', null);

        if (paidErr) throw paidErr;

        const usedTxIds = paidBookings.map(b => b.payment_reference);
        const newDeposits = akahuData.items.filter(tx => tx.amount > 0 && !usedTxIds.includes(tx._id));

        // ==========================================
        // 3. FETCH UNPAID BOOKINGS & STUDENTS
        // ==========================================
        const { data: unpaidBookings, error: bookingErr } = await supabase
            .from('bookings')
            .select('*')
            .eq('payment_status', 'unpaid')
            .eq('payment_method', 'bank_transfer');

        if (bookingErr) throw bookingErr;

        const { data: students, error: studentErr } = await supabase
            .from('students')
            .select('*');

        if (studentErr) throw studentErr;

        // ==========================================
        // 4. THE FIFO MATCHMAKER (USING NEW BILLING CODES)
        // ==========================================
        let matchedCount = 0;
        let matchedDetails = [];

        for (const tx of newDeposits) {
            const desc = (tx.description || '').toLowerCase();
            const ref = (tx.meta?.reference || '').toLowerCase();
            const part = (tx.meta?.particulars || '').toLowerCase();
            const combinedBankText = `${desc} ${ref} ${part}`;

            let matchedBooking = null;
            let matchedStudentName = "Unknown Student";

            // Loop through students to see if their static billing code is in the bank text
            for (const student of students) {
                if (!student.billing_code) continue;

                const expectedCode = student.billing_code.toLowerCase();

                // 🎯 1. THE BULLETPROOF MATCH: Did they use the student's billing code (e.g., SAM436)?
                if (combinedBankText.includes(expectedCode)) {

                    // Find ALL unpaid bookings for this specific student
                    const studentUnpaidBookings = unpaidBookings.filter(b => b.student_id === student.id);

                    if (studentUnpaidBookings.length > 0) {
                        // Sort them chronologically (Oldest first)
                        studentUnpaidBookings.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                        // Find the oldest booking that matches the deposit amount exactly
                        const oldestMatchingBooking = studentUnpaidBookings.find(b => b.amount_total === tx.amount);

                        if (oldestMatchingBooking) {
                            matchedBooking = oldestMatchingBooking;
                            matchedStudentName = student.full_name || 'Student';
                            break; // Match found, stop looking through other students
                        }
                    }
                }

                // 🛟 2. THE FALLBACK MATCH: They forgot the code, but used the Name + Exact Amount
                const actualName = student.full_name || '';
                const nameParts = actualName.split(' ');
                const fName = nameParts[0]?.toLowerCase() || '';
                const lInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toLowerCase() : '';
                const expectedNameRef = `${fName} ${lInitial}`.trim();

                if (expectedNameRef && combinedBankText.includes(expectedNameRef)) {
                    const studentUnpaidBookings = unpaidBookings.filter(b => b.student_id === student.id);
                    studentUnpaidBookings.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                    const oldestMatchingBooking = studentUnpaidBookings.find(b => b.amount_total === tx.amount);

                    if (oldestMatchingBooking) {
                        matchedBooking = oldestMatchingBooking;
                        matchedStudentName = actualName;
                        break;
                    }
                }
            }

            // ==========================================
            // 5. UPDATE DATABASE WITH AUDIT TRAIL
            // ==========================================
            if (matchedBooking) {
                const { error: updateErr } = await supabase
                    .from('bookings')
                    .update({
                        payment_status: 'paid',
                        paid_at: new Date().toISOString(),
                        payment_reference: tx._id // 🚀 The Akahu ID so it is NEVER used again!
                    })
                    .eq('id', matchedBooking.id);

                if (!updateErr) {
                    matchedCount++;
                    matchedDetails.push(`Deposit of $${tx.amount} safely matched to ${matchedStudentName}'s oldest unpaid lesson.`);

                    // Remove this booking from the array so we don't accidentally pay it twice in the same loop
                    const indexToRemove = unpaidBookings.findIndex(b => b.id === matchedBooking.id);
                    if (indexToRemove !== -1) unpaidBookings.splice(indexToRemove, 1);
                } else {
                    console.error("Failed to update booking in Supabase:", updateErr);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sync complete! Safely matched ${matchedCount} new payments.`,
            details: matchedDetails
        });

    } catch (error) {
        console.error("Akahu Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}