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
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #020817; padding: 40px 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Welcome to Remote Patient Monitoring!</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #334155;">You have been invited to join the platform.</p>
          <p style="font-size: 16px; line-height: 1.5; color: #334155;">Click the button below to accept your invitation and create your account:</p>
          
          <div style="margin: 32px 0;">
            <a href="${link}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Accept Invitation</a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">If the button doesn't work, you can copy and paste this link into your browser:<br/><a href="${link}" style="color: #3b82f6;">${link}</a></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log(`[email:sent] Invite successfully sent to ${to}`, info.messageId);
  } catch (error) {
    console.error(`[email:error] Failed to send invite to ${to}`, error);
  }
}

export async function sendAlertEmail(to: string[], subject: string, html: string): Promise<void> {
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log(`[email:stub] Alert to ${to.join(", ")}: ${subject}`);
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
      bcc: to, // use bcc to hide recipients from each other
      subject,
      html,
    });

    console.log(`[email:sent] Alert successfully sent to ${to.length} recipients`, info.messageId);
  } catch (error) {
    console.error(`[email:error] Failed to send alert email`, error);
  }
}
