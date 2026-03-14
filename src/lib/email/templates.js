import { sendEmail } from './resend';

export const emailTemplates = {
    // 1. Sent to Parent & Tutor immediately after a successful booking
    async sendBookingConfirmation({ parentEmail, tutorEmail, bookingDetails }) {
        const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Lesson Confirmed!</h2>
        <p>A new lesson has been scheduled:</p>
        <ul style="background: #f3f4f6; padding: 20px; list-style: none; border-radius: 8px;">
          <li><strong>Subject:</strong> ${bookingDetails.subject}</li>
          <li><strong>Date:</strong> ${bookingDetails.date}</li>
          <li><strong>Time:</strong> ${bookingDetails.time}</li>
          <li><strong>Type:</strong> ${bookingDetails.type}</li>
        </ul>
        <p>Log in to your dashboard to view full details.</p>
      </div>
    `;



        // Send to Parent
        await sendEmail(parentEmail, "Booking Confirmed - Tutoring Pro", html);
        // Send to Tutor
        await sendEmail(tutorEmail, "New Booking Received - Tutoring Pro", html);
    },

    // 2. Sent when a Tutor marks a lesson as "Completed"
    // Inside emailTemplates object...
    async sendPaymentReceipt({ parentEmail, bookingDetails }) {
        const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #059669;">Lesson Receipt</h2>
        <p>Hi there! Your lesson for <strong>${bookingDetails.studentName}</strong> has been completed.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${bookingDetails.date}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> $${bookingDetails.amount}</p>
          <p style="margin: 5px 0;"><strong>Method:</strong> ${bookingDetails.method.toUpperCase()}</p>
        </div>
        <p style="color: #6b7280; font-size: 12px;">Thank you for using our tutoring platform.</p>
      </div>
    `;

        await sendEmail(parentEmail, `Receipt: Lesson on ${bookingDetails.date}`, html);
    }
};