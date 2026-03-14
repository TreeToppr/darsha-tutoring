export async function sendEmail({ to, subject, html }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: process.env.RESEND_FROM || 'DarshaTutor <onboarding@resend.dev>',
            to,
            subject,
            html,
        }),
    });

    const data = await res.json();
    return data;
}

// --- Email Templates ---

export const templates = {
    newBookingRequest: (tutorName, studentName, subject, date, time) => `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #24985b;">New Booking Request!</h1>
            <p>Hi ${tutorName},</p>
            <p>You have a new lesson request for <strong>${subject}</strong> with <strong>${studentName}</strong>.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Date:</strong> ${date}</p>
                <p style="margin: 0;"><strong>Time:</strong> ${time}</p>
            </div>
            <p>Please log in to your dashboard to accept or reschedule this lesson.</p>
            <a href="${process.env.APP_BASE_URL}/tutor-dashboard" style="background: #24985b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Request</a>
        </div>
    `,
    paymentConfirmed: (parentName, amount, subject) => `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #24985b;">Payment Received!</h1>
            <p>Hi ${parentName},</p>
            <p>Your payment of <strong>$${amount}</strong> for your <strong>${subject}</strong> lesson has been successfully processed.</p>
            <p>Your booking is now fully confirmed. You can view your receipt and lesson details in your dashboard.</p>
            <a href="${process.env.APP_BASE_URL}/parent-dashboard" style="background: #24985b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
        </div>
    `
};