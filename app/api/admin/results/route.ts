import { NextRequest, NextResponse } from 'next/server';
import { getBracket } from '@/lib/footballData';
import { clearResultOverride, listResultOverrides, setResultOverride } from '@/lib/db';
import { computeBracket, ROUNDS } from '@/lib/bracket';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Manual result overrides let the operator mark a knockout winner before the data feed reports it.
// Same lightweight admin gate as /api/admin/contest: a shared secret in x-admin-token === ADMIN_TOKEN.
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

// Overrides are only allowed from the quarter-finals inward (rounds 2=QF, 3=SF, 4=Final).
const OVERRIDABLE_ROUNDS = [2, 3, 4];

// Valid match keys per round, e.g. "2:0".."2:3" for the QF. Derived from ROUNDS so it can't drift.
function isOverridableKey(key: string): boolean {
  const [rStr, mStr] = key.split(':');
  const r = Number(rStr);
  const m = Number(mStr);
  if (!OVERRIDABLE_ROUNDS.includes(r) || !Number.isInteger(m)) return false;
  return m >= 0 && m < ROUNDS[r].count / 2;
}

// Current bracket + the operator's overrides, for rendering the admin controls.
export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const [{ bracket }, overrides] = await Promise.all([getBracket(), listResultOverrides()]);
    return NextResponse.json({ ok: true, bracket, overrides });
  } catch (err) {
    console.error('[ADMIN] load results failed:', err);
    return NextResponse.json({ ok: false, error: 'Could not load results.' }, { status: 500 });
  }
}

// Set a manual winner for a match. The winner must be one of the two teams currently in that slot.
export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;

  let body: { matchKey?: unknown; winnerId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const matchKey = typeof body.matchKey === 'string' ? body.matchKey : '';
  const winnerId = typeof body.winnerId === 'string' ? body.winnerId : '';
  if (!isOverridableKey(matchKey) || !winnerId) {
    return NextResponse.json({ ok: false, error: 'Bad match or team.' }, { status: 400 });
  }

  try {
    // Resolve who is actually in that slot right now (feed results only — no hypothetical picks),
    // then only accept a winner that is one of the two present teams.
    const { bracket } = await getBracket();
    const { slots } = computeBracket(bracket.seed, {}, bracket.results);
    const [r, m] = matchKey.split(':').map(Number);
    const a = slots[r][2 * m];
    const b = slots[r][2 * m + 1];
    if (winnerId !== a && winnerId !== b) {
      return NextResponse.json(
        { ok: false, error: 'That team is not in this match yet.' },
        { status: 409 }
      );
    }

    await setResultOverride(matchKey, winnerId);
    // No cache-busting needed: getBracket() reads overrides fresh on every request, so this is
    // live on the next read (the public bracket polls every ~60s; a reopened tab refreshes at once).
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN] set result override failed:', err);
    return NextResponse.json({ ok: false, error: 'Could not save the result.' }, { status: 500 });
  }
}

// Clear a manual winner, so the match falls back to the live feed.
export async function DELETE(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  const matchKey = request.nextUrl.searchParams.get('matchKey') || '';
  if (!isOverridableKey(matchKey)) {
    return NextResponse.json({ ok: false, error: 'Bad match.' }, { status: 400 });
  }
  try {
    await clearResultOverride(matchKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN] clear result override failed:', err);
    return NextResponse.json({ ok: false, error: 'Could not clear the result.' }, { status: 500 });
  }
}
