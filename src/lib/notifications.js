import { supabase } from './supabaseClient';

export async function sendNotification(userId, title, message, href) {
    if (!userId) return;

    // We removed .select() to avoid triggering a security "Read" check
    const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title: title,
        message: message,
        href: href
    });

    if (error) {
        console.error("❌ DATABASE REJECTED NOTIFICATION:", error);
    } else {
        console.log("✅ NOTIFICATION SENT SUCCESSFULLY (Sent to: " + userId + ")");
    }
}