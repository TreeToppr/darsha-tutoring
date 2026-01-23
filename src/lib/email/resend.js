import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
    if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
    if (!to) throw new Error("Missing recipient email");

    const from = process.env.RESEND_FROM || "DarshaTutor <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
    });

    if (error) {
        throw new Error(error.message || "Resend send failed");
    }

    return data;
}
