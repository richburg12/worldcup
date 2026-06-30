import { NextRequest, NextResponse } from 'next/server';
import { buildBracket, fetchMatches, knockoutMatches, summarise } from '@/lib/footballData';

const STAGE_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

// Public endpoint (no auth) so it can be polled by the browser and Vercel crons.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Per-instance in-memory cache. football-data's free tier is rate-limited, so we
// don't call it on every request. NOTE: this cache is NOT shared across serverless
// instances — it's purely a per-instance request-rate guard, which is fine here
// because the data is non-critical and refreshed every minute by the cron anyway.
type Cache = { at: number; payload: unknown };
let cache: Cache | null = null;
const TTL_MS = 60_000;

export async function GET(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get('debug') === '1';
  const full = request.nextUrl.searchParams.get('full') === '1';
  const fresh = request.nextUrl.searchParams.get('fresh') === '1';

  if (full) {
    const all = await fetchMatches();
    const rows = knockoutMatches(all)
      .map((m) => ({
        id: m.id,
        stage: m.stage,
        date: m.utcDate,
        home: m.homeTeam?.name ?? null,
        hid: m.homeTeam?.id ?? null,
        away: m.awayTeam?.name ?? null,
        aid: m.awayTeam?.id ?? null,
        st: m.status,
        win: m.score?.winner ?? null,
      }))
      .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.id - b.id);
    return NextResponse.json({ ok: true, rows });
  }

  try {
    if (!fresh && cache && Date.now() - cache.at < TTL_MS) {
      return NextResponse.json(cache.payload);
    }

    const all = await fetchMatches();

    const payload = debug
      ? { ok: true, debug: summarise(knockoutMatches(all)) }
      : { ok: true, bracket: buildBracket(all) };

    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[RESULTS] fetch failed:', err);
    const message = err instanceof Error && /not set/.test(err.message)
      ? 'FOOTBALL_DATA_TOKEN is not set'
      : 'Could not load results feed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
