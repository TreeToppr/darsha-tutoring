import { supabase } from './supabaseClient';

export async function sendNotification(userId, title, message, href) {
    try {
        const res = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 👇 We package your 4 arguments into the JSON body here!
            body: JSON.stringify({
                user_id: userId,
                title: title,
                message: message,
                href: href
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Failed to push notification");
        }

        console.log("✅ NOTIFICATION SENT SUCCESSFULLY (Sent to: " + userId + ")");
    } catch (error) {
        console.error("❌ DATABASE REJECTED NOTIFICATION:", error);
    }
}