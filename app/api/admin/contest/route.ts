import { NextRequest, NextResponse } from 'next/server';
import { deleteEntry, getEntryById, listAllEntries, renameEntry } from '@/lib/db';
import { picksSummary, validUsername } from '@/lib/contest';
import { getBracket } from '@/lib/footballData';
import { sendPicksReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lightweight admin gate: a shared secret in the x-admin-token header, compared to ADMIN_TOKEN.
// No sessions/cookies — adequate for a single operator on a low-stakes promo. Returns a response
// to short-circuit on failure, or null to proceed.
function guard(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Admin not configured.' }, { status: 503 });
  }
  const provided = request.headers.get('x-admin-token');
  if (!provided || provided !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  return null;
}

// List every entry (including private emails) for the admin table.
export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ ok: true, entries: await listAllEntries() });
  } catch (err) {
    console.error('[ADMIN] list entries failed:', err);
    return NextResponse.json({ ok: false, error: 'Could not load entries.' }, { status: 500 });
  }
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://wecanjustmakeshitnow.com').replace(/\/$/, '');
}

// Send a one-off test of the "entries closed — here are your picks" reminder to a single entry's
// email, using that entry's real picks. Ignores the 6pm lock and does NOT mark the entry as
// reminded, so it never interferes with the real batch send at lock time. Used from the admin page
// to preview the email in a real inbox before the contest closes.
export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  if (body.action !== 'test-reminder') {
    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'Bad id.' }, { status: 400 });
  }
  try {
    const entry = await getEntryById(id);
    if (!entry) return NextResponse.json({ ok: false, error: 'Entry not found.' }, { status: 404 });

    const { bracket } = await getBracket();
    const { rounds, championName } = picksSummary(entry.picks, (tid) => bracket.teams[tid]?.name ?? null);
    const ok = await sendPicksReminderEmail({
      to: entry.email,
      displayName: entry.displayName,
      rounds,
      championName,
      tiebreakGoals: entry.tiebreakGoals,
      leaderboardUrl: `${baseUrl()}/worldcup#leaderboard`,
    });
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: 'Email is not configured (RESEND_API_KEY/EMAIL_FROM missing).' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, sentTo: entry.email });
  } catch (err) {
    console.error('[ADMIN] test reminder failed:', err);
    return NextResponse.json({ ok: false, error: 'Could not send the test email.' }, { status: 500 });
  }
}

// Delete an entry by id.
export async function DELETE(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'Bad id.' }, { status: 400 });
  }
  try {
    await deleteEntry(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN] delete entry failed:', err);
    return NextResponse.json({ ok: false, error: 'Delete failed.' }, { status: 500 });
  }
}

// Rename an entry's public display name (e.g. to neutralise something borderline without deleting).
export async function PATCH(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  let body: { id?: unknown; displayName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const id = Number(body.id);
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  if (!Number.isInteger(id) || id <= 0 || !validUsername(displayName)) {
    return NextResponse.json({ ok: false, error: 'Bad id or name.' }, { status: 400 });
  }
  try {
    await renameEntry(id, displayName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN] rename entry failed:', err);
    return NextResponse.json({ ok: false, error: 'Rename failed.' }, { status: 500 });
  }
}
