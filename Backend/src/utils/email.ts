/**
 * Stubbed pending a Resend API key. Swap the body of this function for a
 * real Resend send call (see README) without touching any caller.
 */
export async function sendInviteEmail(to: string, link: string): Promise<void> {
  console.log(`[email:stub] Invite for ${to}: ${link}`);
}
