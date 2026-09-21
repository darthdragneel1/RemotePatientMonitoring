import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

export async function sendInviteEmail(to: string, link: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:stub] Invite for ${to}: ${link}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
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
    console.log(`[email:sent] Invite successfully sent to ${to}`);
  } catch (error) {
    console.error(`[email:error] Failed to send invite to ${to}`, error);
  }
}
