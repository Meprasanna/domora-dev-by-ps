import nodemailer from "nodemailer";

const smtpUser = process.env.GMAIL_SMTP_USER;
const smtpPassword = process.env.GMAIL_SMTP_APP_PASSWORD;

const transporter =
  smtpUser && smtpPassword
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: smtpUser, pass: smtpPassword },
      })
    : null;

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(message: EmailMessage) {
  if (!transporter || !smtpUser) {
    throw new Error("Gmail SMTP is not configured");
  }

  return transporter.sendMail({
    from: `Domora <${smtpUser}>`,
    ...message,
  });
}

export async function verifyEmailTransport() {
  if (!transporter) return false;
  await transporter.verify();
  return true;
}
