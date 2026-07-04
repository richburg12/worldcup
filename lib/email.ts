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
    'Please confirm by the end of Tuesday 7 July (end of the Round of 16) — after that, entries can no longer be added to the leaderboard.',
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
    <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#57534e;">Please confirm by the <strong>end of Tuesday 7 July</strong> (end of the Round of 16) — after that, entries can no longer be added to the leaderboard.</p>
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

export type PicksReminderParams = {
  to: string;
  displayName: string;
  rounds: { label: string; picks: string[] }[]; // one row per contest round, team names in bracket order
  championName: string | null;
  tiebreakGoals: number;
  leaderboardUrl: string;
};

// Builds the post-lock reminder email (subject/text/html) without sending — pure, so it can be
// previewed or tested without Resend credentials.
export function renderPicksReminderEmail(params: PicksReminderParams): {
  subject: string;
  text: string;
  html: string;
} {
  const name = escapeHtml(params.displayName);
  const champion = params.championName ?? '—';
  const subject = 'Entries are closed — here are your bracket picks 🏆';

  const textLines = [
    `Hi ${params.displayName},`,
    '',
    "Entries for D GRANDE's World Cup bracket contest are now closed — the Round of 16 has kicked off. " +
      "Here's the bracket you locked in, for your reference. No changes can be made from here; just sit back and follow the results.",
    '',
  ];
  for (const round of params.rounds) {
    textLines.push(`${round.label}: ${round.picks.join(', ')}`);
  }
  textLines.push('');
  textLines.push(`Your champion pick: ${champion}`);
  textLines.push(`Tiebreak — total goals in the final (regulation time): ${params.tiebreakGoals}`);
  textLines.push('');
  textLines.push(`Follow the live leaderboard as results come in: ${params.leaderboardUrl}`);
  textLines.push('');
  textLines.push(
    'The best bracket when the final whistle blows wins a fajita dinner for 4 (up to £200) at D GRANDE Tex-Mex. Good luck! 🏆'
  );
  textLines.push('');
  textLines.push('— The team at D GRANDE Tex-Mex');
  const text = textLines.join('\n');

  const roundsHtml = params.rounds
    .map(
      (round) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f0efed;font-size:12px;color:#78716c;white-space:nowrap;vertical-align:top;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(round.label)}</td>
        <td style="padding:9px 0 9px 16px;border-bottom:1px solid #f0efed;font-size:14px;color:#1c1917;">${round.picks.map(escapeHtml).join(', ')}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px 26px;border:1px solid #e7e5e4;">
    <h1 style="margin:0 0 14px;font-size:20px;color:#1c1917;">Entries are closed — here's your bracket 🏆</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Hi ${name},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.5;">Entries for <strong>D GRANDE's World Cup bracket contest</strong> are now closed — the Round of 16 has kicked off. Here's the bracket you locked in, for your reference. No changes can be made from here; just sit back and follow the results.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
      <tbody>${roundsHtml}</tbody>
    </table>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#92400e;">Your champion pick</p>
      <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1c1917;">${escapeHtml(champion)} 🏆</p>
      <p style="margin:0 0 4px;font-size:13px;color:#92400e;">Tiebreak — total goals in the final</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:#1c1917;">${params.tiebreakGoals}</p>
    </div>
    <p style="margin:0 0 22px;text-align:center;">
      <a href="${params.leaderboardUrl}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">Follow the live leaderboard</a>
    </p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#57534e;">The best bracket when the final whistle blows wins a <strong>fajita dinner for 4</strong> (up to £200) at D GRANDE Tex-Mex. Good luck!<br/>— The team at D GRANDE Tex-Mex</p>
  </div>
</body></html>`;

  return { subject, text, html };
}

// Sends the post-lock reminder: entries are closed, here's the bracket you locked in. Returns true
// if handed off to Resend, false if email is disabled (so the caller can retry later).
export async function sendPicksReminderEmail(params: PicksReminderParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[EMAIL] RESEND_API_KEY/EMAIL_FROM not set — skipping picks reminder email');
    return false;
  }
  const { subject, text, html } = renderPicksReminderEmail(params);
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to: params.to, subject, text, html });
    return true;
  } catch (err) {
    console.error('[EMAIL] picks reminder send failed:', err);
    throw err;
  }
}
