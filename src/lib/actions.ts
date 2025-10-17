'use server';

import nodemailer from 'nodemailer';

/**
 * Sends a notification email using nodemailer and SendGrid. 
 * This function is a Server Action and will only execute on the server.
 * @param to The recipient's email address.
 * @param subject The subject of the email.
 * @param html The HTML content of the email.
 */
export async function sendEmailAction(to: string, subject: string, html: string): Promise<void> {
  // Credentials are stored securely as environment variables.
  const sendgridApiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
  const fromAddress = process.env.NEXT_PUBLIC_SENDGRID_FROM_ADDRESS;

  if (!sendgridApiKey || !fromAddress) {
    console.error("Missing SendGrid configuration. Please set NEXT_PUBLIC_SENDGRID_API_KEY and NEXT_PUBLIC_SENDGRID_FROM_ADDRESS environment variables on your server.");
    throw new Error("SMTP service is not configured.");
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // true for 465, false for other ports like 587
    auth: {
      user: 'apikey', // This is a literal string 'apikey' for SendGrid
      pass: sendgridApiKey,
    },
  });

  const mailOptions = {
    from: `"CONTROL CHEC" <${fromAddress}>`,
    to: to,
    subject: subject,
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Error sending email via Server Action to ${to}:`, error);
    // Depending on the use case, you might want to re-throw the error
    // so the calling function knows the email failed to send.
    throw new Error("Failed to send notification email.");
  }
}
