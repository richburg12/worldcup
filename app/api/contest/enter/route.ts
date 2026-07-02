import { NextRequest, NextResponse } from 'next/server';
import {
  contestPicks,
  isComplete,
  isLocked,
  normalizeEmail,
  validEmailShape,
  validTiebreak,
  validUsername,
} from '@/lib/contest';
import { isCleanUsername } from '@/lib/profanity';
import { upsertUnverifiedEntry } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simple per-instance IP rate limit (fine for low traffic; Vercel instances don't share memory).
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function rateLimited(ip: string, nowMs: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => nowMs - t < WINDOW_MS);
  recent.push(nowMs);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0] : '').trim() || 'unknown';
}

export async function POST(request: NextRequest) {
  const nowMs = Date.now();

  if (isLocked(nowMs)) {
    return NextResponse.json(
      { ok: false, error: 'Entries are closed — the Round of 16 has kicked off.' },
      { status: 403 }
    );
  }

  let body: {
    email?: unknown;
    displayName?: unknown;
    picks?: unknown;
    tiebreakGoals?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const tiebreakGoals = body.tiebreakGoals;
  const rawPicks = body.picks;

  if (!validEmailShape(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!validUsername(displayName)) {
    return NextResponse.json(
      { ok: false, error: 'Display name must be 2–24 characters (letters, numbers, spaces).' },
      { status: 400 }
    );
  }
  if (!isCleanUsername(displayName)) {
    return NextResponse.json({ ok: false, error: 'Please choose a different display name.' }, { status: 400 });
  }
  if (!validTiebreak(tiebreakGoals)) {
    return NextResponse.json(
      { ok: false, error: 'Enter your tiebreak as a whole number of goals (0–20).' },
      { status: 400 }
    );
  }
  if (!rawPicks || typeof rawPicks !== 'object') {
    return NextResponse.json({ ok: false, error: 'Your bracket picks are missing.' }, { status: 400 });
  }
  const picks = contestPicks(rawPicks as Record<string, string>);
  if (!isComplete(picks)) {
    return NextResponse.json(
      { ok: false, error: 'Finish your bracket first — pick a winner for every match through the final.' },
      { status: 400 }
    );
  }

  if (rateLimited(clientIp(request), nowMs)) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please try again a bit later.' },
      { status: 429 }
    );
  }

  try {
    const outcome = await upsertUnverifiedEntry({
      email,
      emailNorm: normalizeEmail(email),
      displayName,
      picks,
      tiebreakGoals: tiebreakGoals as number,
    });

    if (outcome.status === 'already_verified') {
      return NextResponse.json({
        ok: false,
        code: 'already_verified',
        error:
          'This email already has a confirmed entry. If you need to change it, reply to your confirmation email.',
      });
    }

    await sendVerificationEmail({ to: email, displayName, token: outcome.token });
    return NextResponse.json({ ok: true, status: outcome.status });
  } catch (err) {
    console.error('[CONTEST] enter failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Something went wrong saving your entry. Please try again.' },
      { status: 500 }
    );
  }
}
