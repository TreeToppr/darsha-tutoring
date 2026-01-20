/**
 * Supabase client (browser-side).
 * Used throughout the app to read/write data with RLS enforced.
 */
import { createClient } from "@supabase/supabase-js";

// These should be defined in your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Guardrail: fail loudly during development if env vars are missing.
if (!supabaseUrl || !supabaseAnonKey) {
    // eslint-disable-next-line no-console
    console.warn(
        "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
