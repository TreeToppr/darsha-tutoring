import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🚀 HELPER: Converts a public URL into a file format Gemini can read
async function fetchAsGenerativePart(url) {
    console.log(`Fetching media for AI: ${url}`);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Automatically detect if it's an image (image/png, image/jpeg) or audio (audio/mp3, audio/webm)
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';

    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType: mimeType
        }
    };
}

export async function POST(req) {
    try {
        const { reportId } = await req.json();
        console.log(`Starting AI Analysis for Report: ${reportId}`);

        // 1. Initialize Supabase Admin (bypasses RLS so the server can read/write freely)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 2. Fetch the report data and media URLs
        const { data: report, error } = await supabase
            .from('lesson_reports')
            .select('*, students(full_name)')
            .eq('id', reportId)
            .single();

        if (error || !report) throw new Error("Report not found");

        // 3. Download the files and convert them for Gemini
        const imageParts = await Promise.all((report.screenshot_urls || []).map(fetchAsGenerativePart));
        const audioParts = await Promise.all((report.recording_urls || []).map(fetchAsGenerativePart));

        const allMediaParts = [...imageParts, ...audioParts];

        // 4. Initialize Gemini 2.5 Flash (The current active model)
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        // 5. The Master Prompt (Updated to include notes)
        const prompt = `
            You are an expert tutor's assistant. You are analyzing a tutoring lesson for a student named ${report.students?.full_name || 'the student'}.
            I have provided audio recordings of the lesson, photos of the worksheets, and written notes/summaries from the tutor.

            Tutor's Notes / Zoom Summary:
            """
            ${report.tutor_notes || "No written notes provided."}
            """

            Listen to the audio, look at the photos, and read the tutor's notes. Then provide the following:
            1. "summary": A professional summary of what was covered in the lesson (written in the third person, about 3-4 sentences).
            2. "skills": An array of specific academic skills worked on. For each, assign a "mastery_level" from 1 (struggling/emerging) to 5 (mastered).
            3. "next_lesson": A specific suggestion for what should be covered next based on what they struggled with or need to advance.

            Return exactly this JSON structure and nothing else:
            {
                "summary": "...",
                "skills": [
                    { "skill_name": "...", "mastery_level": 3 }
                ],
                "next_lesson": "..."
            }
        `;

        // 6. Send everything to Gemini
        console.log(`Sending ${imageParts.length} images and ${audioParts.length} audio files to Gemini...`);
        const result = await model.generateContent([prompt, ...allMediaParts]);
        const responseText = result.response.text();

        // 7. Parse the AI's response
        const aiData = JSON.parse(responseText);

        // 8. Save the brilliant analysis back to the database!
        const { error: updateError } = await supabase
            .from('lesson_reports')
            .update({
                ai_summary: aiData.summary,
                ai_skills_analysis: aiData.skills,
                next_lesson_suggestions: aiData.next_lesson
            })
            .eq('id', reportId);

        if (updateError) throw updateError;

        console.log("AI Analysis Complete!");
        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (err) {
        console.error("AI Route Error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}