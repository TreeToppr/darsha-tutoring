import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
    try {
        console.log("=== STARTING AKAHU AUTO-MATCH SYNC ===");

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

        const { data: paidBookings, error: paidErr } = await supabase
            .from('bookings')
            .select('payment_reference')
            .not('payment_reference', 'is', null);

        if (paidErr) throw paidErr;

        const usedTxIds = paidBookings.map(b => b.payment_reference);
        const newDeposits = akahuData.items.filter(tx => tx.amount > 0 && !usedTxIds.includes(tx._id));

        console.log(`Found ${newDeposits.length} fresh bank deposits to check.`);

        // 🚀 THE FIX: Removed the .eq('payment_method', 'bank_transfer') filter!
        const { data: unpaidBookings, error: bookingErr } = await supabase
            .from('bookings')
            .select('*')
            .eq('payment_status', 'unpaid');

        if (bookingErr) throw bookingErr;
        console.log(`Found ${unpaidBookings.length} total unpaid bookings in Supabase.`);

        const { data: students, error: studentErr } = await supabase
            .from('students')
            .select('*');

        if (studentErr) throw studentErr;

        let matchedCount = 0;
        let matchedDetails = [];

        for (const tx of newDeposits) {
            const desc = (tx.description || '').toLowerCase();
            const ref = (tx.meta?.reference || '').toLowerCase();
            const part = (tx.meta?.particulars || '').toLowerCase();
            const combinedBankText = `${desc} ${ref} ${part}`;
            const txAmount = Number(tx.amount);

            console.log(`\n🔍 CHECKING DEPOSIT: $${txAmount} | Text: "${combinedBankText}"`);

            let matchedBooking = null;
            let matchedStudentName = "Unknown Student";

            const codeMatch = combinedBankText.match(/[a-z]{3}\d{3}/);
            const extractedCode = codeMatch ? codeMatch[0] : null;

            if (extractedCode) {
                console.log(`   ➔ 🎯 X-Ray spotted billing code: ${extractedCode.toUpperCase()}`);

                const student = students.find(s => (s.billing_code || '').toLowerCase() === extractedCode);

                if (student) {
                    console.log(`   ➔ 👤 Matched to Student: ${student.full_name}`);
                    const studentUnpaidBookings = unpaidBookings.filter(b => b.student_id === student.id);
                    console.log(`   ➔ 📖 Student has ${studentUnpaidBookings.length} unpaid bookings.`);

                    if (studentUnpaidBookings.length > 0) {
                        studentUnpaidBookings.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                        const oldestMatchingBooking = studentUnpaidBookings.find(b => Number(b.amount_total) === txAmount);

                        if (oldestMatchingBooking) {
                            console.log(`   ➔ ✅ EXACT MATCH FOUND! Lesson ID: ${oldestMatchingBooking.id}`);
                            matchedBooking = oldestMatchingBooking;
                            matchedStudentName = student.full_name || 'Student';
                        } else {
                            console.log(`   ➔ ❌ FAIL: Found unpaid bookings, but none matched the exact amount of $${txAmount}`);
                            // Print out what amounts we DID find to help debug
                            const amountsFound = studentUnpaidBookings.map(b => b.amount_total).join(', ');
                            console.log(`      (Bookings found for this student were for: $${amountsFound})`);
                        }
                    }
                } else {
                    console.log(`   ➔ ❌ FAIL: Code ${extractedCode.toUpperCase()} not found in students table!`);
                }
            } else {
                console.log(`   ➔ No billing code found in text. Attempting name fallback...`);
                // Fallback Name Match logic remains the same...
                for (const student of students) {
                    const actualName = student.full_name || '';
                    const nameParts = actualName.split(' ');
                    const fName = nameParts[0]?.toLowerCase() || '';
                    const lInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toLowerCase() : '';
                    const expectedNameRef = `${fName} ${lInitial}`.trim();

                    if (expectedNameRef && combinedBankText.includes(expectedNameRef)) {
                        const studentUnpaidBookings = unpaidBookings.filter(b => b.student_id === student.id);
                        studentUnpaidBookings.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                        const oldestMatchingBooking = studentUnpaidBookings.find(b => Number(b.amount_total) === txAmount);

                        if (oldestMatchingBooking) {
                            console.log(`   ➔ ✅ FALLBACK NAME MATCH FOUND for ${actualName}!`);
                            matchedBooking = oldestMatchingBooking;
                            matchedStudentName = actualName;
                            break;
                        }
                    }
                }
            }

            if (matchedBooking) {
                const { error: updateErr } = await supabase
                    .from('bookings')
                    .update({
                        payment_status: 'paid',
                        paid_at: new Date().toISOString(),
                        payment_reference: tx._id
                    })
                    .eq('id', matchedBooking.id);

                if (!updateErr) {
                    matchedCount++;
                    matchedDetails.push(`Safely matched $${txAmount} to ${matchedStudentName}'s unpaid lesson.`);
                    const indexToRemove = unpaidBookings.findIndex(b => b.id === matchedBooking.id);
                    if (indexToRemove !== -1) unpaidBookings.splice(indexToRemove, 1);
                }
            }
        }

        console.log("=== AKAHU SYNC FINISHED ===");

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