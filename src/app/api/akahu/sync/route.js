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
        // Fetch all transaction IDs we have already used to pay for lessons
        const { data: paidBookings, error: paidErr } = await supabase
            .from('bookings')
            .select('payment_reference')
            .not('payment_reference', 'is', null);

        if (paidErr) throw paidErr;

        // Create an array of used transaction IDs
        const usedTxIds = paidBookings.map(b => b.payment_reference);

        // 🚀 THE FIX: Filter for deposits > $0 AND ensure we haven't used this ID before!
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

        // 🚀 FIXED: Using * to prevent "column does not exist" crashes
        const { data: students, error: studentErr } = await supabase
            .from('students')
            .select('*');

        if (studentErr) throw studentErr;

        // ==========================================
        // 4. THE COLLISION-PROOF MATCHMAKER
        // ==========================================
        let matchedCount = 0;
        let matchedDetails = [];

        // Loop through each BRAND NEW incoming bank deposit
        for (const tx of newDeposits) {
            const desc = (tx.description || '').toLowerCase();
            const ref = (tx.meta?.reference || '').toLowerCase();
            const part = (tx.meta?.particulars || '').toLowerCase();

            const potentialMatches = unpaidBookings.filter(booking => {
                const student = students.find(s => s.id === booking.student_id);

                // Use whichever name column actually exists in your database
                const actualName = student?.full_name || student?.first_name || student?.name || '';
                const nameParts = actualName.split(' ');
                const fName = nameParts[0];
                const lInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '';
                const expectedRef = `${fName} ${lInitial}`.substring(0, 12).trim().toLowerCase();

                if (!expectedRef) return false;

                const hasName = desc.includes(expectedRef) || ref.includes(expectedRef) || part.includes(expectedRef);
                const isExactAmount = tx.amount === booking.amount_total;

                return hasName && isExactAmount;
            });

            // ==========================================
            // 5. UPDATE DATABASE WITH AUDIT TRAIL
            // ==========================================
            if (potentialMatches.length === 1) {
                const exactMatch = potentialMatches[0];
                const student = students.find(s => s.id === exactMatch.student_id);
                const actualName = student?.full_name || student?.first_name || 'Student';

                const { error: updateErr } = await supabase
                    .from('bookings')
                    .update({
                        payment_status: 'paid',
                        paid_at: new Date().toISOString(), // Timestamp of when we marked it
                        payment_reference: tx._id // 🚀 The Akahu ID so it is NEVER used again!
                    })
                    .eq('id', exactMatch.id);

                if (!updateErr) {
                    matchedCount++;
                    matchedDetails.push(`Deposit of $${tx.amount} safely matched to ${actualName}.`);

                    const indexToRemove = unpaidBookings.findIndex(b => b.id === exactMatch.id);
                    if (indexToRemove !== -1) unpaidBookings.splice(indexToRemove, 1);
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