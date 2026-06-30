import { NextRequest, NextResponse } from 'next/server';
import { fetchMatches, getBracketSnapshot, knockoutMatches, summarise } from '@/lib/footballData';

const STAGE_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

// Public endpoint (no auth) so it can be polled by the browser.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get('debug') === '1';
  const full = request.nextUrl.searchParams.get('full') === '1';

  // Inspection helpers (manual use only) hit the feed directly, bypassing the shared cache.
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
    if (debug) {
      return NextResponse.json({ ok: true, debug: summarise(knockoutMatches(await fetchMatches())) });
    }
    // Shared 60s cache across all instances — football-data is hit at most once a minute.
    const bracket = await getBracketSnapshot();
    return NextResponse.json({ ok: true, bracket });
  } catch (err) {
    console.error('[RESULTS] fetch failed:', err);
    const message =
      err instanceof Error && /not set/.test(err.message) ? 'FOOTBALL_DATA_TOKEN is not set' : 'Could not load results feed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
