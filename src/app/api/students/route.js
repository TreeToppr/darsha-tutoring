import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generates SAM436 style codes based on full_name
async function generateUniqueStudentCode(fullName) {
    const firstWord = fullName.split(' ')[0] || 'STU';
    const prefix = firstWord.substring(0, 3).toUpperCase().padEnd(3, 'X');
    let isUnique = false;
    let newCode = '';

    while (!isUnique) {
        const randomDigits = Math.floor(100 + Math.random() * 900);
        newCode = `${prefix}${randomDigits}`;

        const { data } = await supabaseAdmin
            .from('students')
            .select('id')
            .eq('billing_code', newCode)
            .single();

        if (!data) isUnique = true;
    }
    return newCode;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { fullName, yearLevel, parentId } = body;

        if (!fullName || !parentId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Generate the code using the new fullName logic
        const studentCode = await generateUniqueStudentCode(fullName);

        // Insert matching your exact database columns
        const { data, error } = await supabaseAdmin
            .from('students')
            .insert([{
                parent_id: parentId,
                full_name: fullName,
                year_level: yearLevel,
                billing_code: studentCode
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, student: data });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}