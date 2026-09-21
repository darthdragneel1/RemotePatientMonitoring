import nodemailer from "nodemailer";

export async function sendInviteEmail(to: string, link: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`[email:stub] Invite for ${to}: ${link}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Remote Patient Monitoring" <${process.env.GMAIL_USER}>`,
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
