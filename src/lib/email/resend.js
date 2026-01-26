// import { Resend } from "resend";

// function getResend() {
//     const apiKey = process.env.RESEND_API_KEY;
//     if (!apiKey) {
//         throw new Error("RESEND_API_KEY is not set");
//     }
//     return new Resend(apiKey);
// }

// export async function sendEmail({ to, subject, html, text }) {
//     if (!to) throw new Error("Missing recipient email");

//     const resend = getResend();

//     const from =
//         process.env.RESEND_FROM || "DarshaTutor <onboarding@resend.dev>";

//     const { data, error } = await resend.emails.send({
//         from,
//         to,
//         subject,
//         html,
//         text,
//     });

//     if (error) {
//         throw new Error(error.message || "Resend send failed");
//     }

//     return data;
// }

// import { Resend } from "resend";

// function getResend() {
//     const apiKey = process.env.RESEND_API_KEY;
//     if (!apiKey) throw new Error("RESEND_API_KEY is not set");
//     return new Resend(apiKey);
// }

// export async function sendEmail({ to, subject, html, text }) {
//     if (!to) throw new Error("Missing recipient email");
//     const resend = getResend();
//     const from = process.env.RESEND_FROM || "DarshaTutor <onboarding@resend.dev>";

//     const { data, error } = await resend.emails.send({ from, to, subject, html, text });
//     if (error) throw new Error(error.message || "Resend send failed");
//     return data;
// }


import { Resend } from "resend";

let resendClient = null;

function getResendClient() {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY");
    if (!resendClient) resendClient = new Resend(key);
    return resendClient;
}

export async function sendEmail({ to, subject, html, text }) {
    if (!to) throw new Error("Missing recipient email");

    // const from = process.env.RESEND_FROM; // must be your verified domain
    // if (!from) throw new Error("Missing RESEND_FROM");
    const from = process.env.RESEND_FROM || "DarshaTutor <onboarding@resend.dev>";

    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
    });

    if (error) throw new Error(error.message || "Resend send failed");
    return data;
}
