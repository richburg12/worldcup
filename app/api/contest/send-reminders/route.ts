import { NextRequest, NextResponse } from 'next/server';
import { getBracket } from '@/lib/footballData';
import { listEntriesNeedingReminder, markReminderSent } from '@/lib/db';
import { isLocked, picksSummary } from '@/lib/contest';
import { sendPicksReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Post-lock "entries are closed — here are your picks" email. A Vercel cron (see vercel.json) hits
// this shortly after the 6pm lock. Safe to run repeatedly and safe to run early:
//   - it does nothing until the lock has actually passed (isLocked), so it can never send early;
//   - each confirmed entrant is emailed at most once (guarded by picks_reminder_sent_at in the DB),
//     so extra runs (or the backup run) only pick up anyone not yet mailed.
// Auth: the admin token always allows a manual trigger. For the cron path, if CRON_SECRET is set we
// require it (Vercel sends it automatically as a bearer token); if it isn't set the endpoint is open
// so the cron works with zero extra config — the lock gate + one-shot flag mean the worst an
// anonymous hit can do is send the exact emails we intended, at the intended time. (We deliberately
// do NOT gate on ADMIN_TOKEN's mere existence, or the cron — which can't present it — would be
// rejected and nothing would send.)

function authorized(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  const provided = request.headers.get('x-admin-token');
  if (adminToken && provided && provided === adminToken) return true; // manual trigger

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) return request.headers.get('authorization') === `Bearer ${cronSecret}`;
  return true; // no cron secret configured — open, but capped by the lock + one-shot guards
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://wecanjustmakeshitnow.com').replace(/\/$/, '');
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  // Never send before entries actually close.
  if (!isLocked(Date.now())) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 'entries not closed yet' });
  }

  let entries;
  try {
    entries = await listEntriesNeedingReminder();
  } catch (err) {
    console.error('[CONTEST] reminder: load entries failed:', err);
    return NextResponse.json({ ok: false, error: 'Could not load entries.' }, { status: 500 });
  }

  if (entries.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Resolve picked team ids to names for the email.
  const { bracket } = await getBracket();
  const leaderboardUrl = `${baseUrl()}/worldcup#leaderboard`;

  let sent = 0;
  let failed = 0;
  for (const entry of entries) {
    const { rounds, championName } = picksSummary(entry.picks, (id) => bracket.teams[id]?.name ?? null);

    try {
      const ok = await sendPicksReminderEmail({
        to: entry.email,
        displayName: entry.displayName,
        rounds,
        championName,
        tiebreakGoals: entry.tiebreakGoals,
        leaderboardUrl,
      });
      // Only flag as sent if it was actually handed off. If email is disabled (false) we leave the
      // flag unset so a later run can still deliver it.
      if (ok) {
        await markReminderSent(entry.id);
        sent++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`[CONTEST] reminder: send failed for entry ${entry.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
