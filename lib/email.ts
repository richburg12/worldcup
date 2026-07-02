// Contest email via Resend. Currently one template: the entry confirmation ("click to confirm").
// If RESEND_API_KEY isn't set the send is a graceful no-op (returns false) so nothing crashes in
// environments where email isn't wired up yet.

import { Resend } from 'resend';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://wecanjustmakeshitnow.com').replace(/\/$/, '');
}

// Sends the confirmation email. Returns true if handed off to Resend, false if email is disabled.
export async function sendVerificationEmail(params: {
  to: string;
  displayName: string;
  token: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[EMAIL] RESEND_API_KEY/EMAIL_FROM not set — skipping verification email');
    return false;
  }

  const link = `${baseUrl()}/api/contest/verify?token=${encodeURIComponent(params.token)}`;
  const name = escapeHtml(params.displayName);
  const subject = 'Confirm your entry — win a fajita dinner for 4 🌮';

  const text = [
    `Hi ${params.displayName},`,
    '',
    "Thanks for entering D GRANDE's World Cup bracket contest! You're one click away from the leaderboard.",
    '',
    'Confirm your entry here:',
    link,
    '',
    'The best bracket when the final whistle blows wins a fajita dinner for 4 (up to £200) at D GRANDE Tex-Mex. Good luck! 🏆',
    '',
    '— The team at D GRANDE Tex-Mex',
    '',
    "If you didn't enter, you can safely ignore this email. We'll only ever use your address to contact you if you win.",
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px 26px;border:1px solid #e7e5e4;">
    <h1 style="margin:0 0 14px;font-size:20px;color:#1c1917;">You're one click from the leaderboard 🏆</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Thanks for entering <strong>D GRANDE's World Cup bracket contest</strong>! Confirm your entry to lock it onto the leaderboard.</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">The best bracket when the final whistle blows wins a <strong>fajita dinner for 4</strong> (up to £200) at D GRANDE Tex-Mex. 🌮</p>
    <p style="margin:0 0 22px;text-align:center;">
      <a href="${link}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">Confirm my entry</a>
    </p>
    <p style="margin:0 0 6px;font-size:12px;color:#78716c;line-height:1.5;">Or paste this link into your browser:</p>
    <p style="margin:0 0 20px;font-size:12px;color:#78716c;word-break:break-all;">${link}</p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#57534e;">Good luck!<br/>— The team at D GRANDE Tex-Mex</p>
    <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.5;">If you didn't enter, you can safely ignore this email. We'll only ever use your address to contact you if you win.</p>
  </div>
</body></html>`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to: params.to, subject, text, html });
    return true;
  } catch (err) {
    console.error('[EMAIL] verification send failed:', err);
    throw err;
  }
}
