export async function sendInviteEmail(to: string, link: string): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const SENDER_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev"; // Default for Resend testing

  if (!RESEND_API_KEY) {
    console.log(`[email:stub] Invite for ${to}: ${link}`);
    console.log(`[email:stub] Please set RESEND_API_KEY to send real emails.`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Remote Patient Monitoring <${SENDER_EMAIL}>`,
        to: [to],
        subject: "You've been invited to Remote Patient Monitoring",
        html: `
          <h2>Welcome to Remote Patient Monitoring!</h2>
          <p>You have been invited to join the platform.</p>
          <p>Click the link below to accept your invitation and create your account:</p>
          <p><a href="${link}">${link}</a></p>
          <br />
          <p>If you did not expect this invitation, you can safely ignore this email.</p>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Resend API Error: ${res.status} ${errorText}`);
    }

    const data = (await res.json()) as { id: string };
    console.log(`[email:sent] Invite successfully sent to ${to}`, data.id);
  } catch (error) {
    console.error(`[email:error] Failed to send invite to ${to}`, error);
  }
}
