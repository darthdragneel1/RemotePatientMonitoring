import nodemailer from "nodemailer";

export async function sendInviteEmail(to: string, link: string): Promise<void> {
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log(`[email:stub] Invite for ${to}: ${link}`);
    console.log(`[email:stub] Please set GMAIL_USER and GMAIL_APP_PASSWORD to send real emails.`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"Remote Patient Monitoring" <${GMAIL_USER}>`,
      to,
      subject: "You've been invited to Remote Patient Monitoring",
      html: `
        <h2>Welcome to Remote Patient Monitoring!</h2>
        <p>You have been invited to join the platform.</p>
        <p>Click the link below to accept your invitation and create your account:</p>
        <p><a href="${link}">${link}</a></p>
        <br />
        <p>If you did not expect this invitation, you can safely ignore this email.</p>
      `,
    });

    console.log(`[email:sent] Invite successfully sent to ${to}`, info.messageId);
  } catch (error) {
    console.error(`[email:error] Failed to send invite to ${to}`, error);
  }
}
