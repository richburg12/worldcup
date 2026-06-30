// Integration with football-data.org (https://www.football-data.org).
// Free tier: pass the token in the `X-Auth-Token` header; ~10 requests/minute.
//
// We only read knockout-stage matches for the World Cup and turn them into our
// bracket "results" (which match was finished, and who won). The exact mapping
// from football-data's match list to our circular bracket positions is finalised
// after we inspect the live data shape (see /api/results?debug=1).

import { unstable_cache } from 'next/cache';
import { FALLBACK_BRACKET } from './fallbackBracket';

const BASE = 'https://api.football-data.org/v4';

export type FdScore = {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration?: string;
  fullTime?: { home: number | null; away: number | null };
  penalties?: { home: number | null; away: number | null };
};

export type FdTeam = { id: number | null; name: string | null; tla?: string | null; crest?: string | null };

export type FdMatch = {
  id: number;
  stage: string; // e.g. LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL, (LAST_32 for 48-team format)
  group: string | null;
  status: string; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, ...
  utcDate: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: FdScore;
};

const KNOCKOUT_STAGES = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

function token(): string {
  const t = process.env.FOOTBALL_DATA_TOKEN;
  if (!t) throw new Error('FOOTBALL_DATA_TOKEN is not set');
  return t;
}

function competition(): string {
  return process.env.FOOTBALL_DATA_COMPETITION || 'WC';
}

// Pin the season (e.g. 2026) so the feed can never silently switch to a future World Cup.
function season(): string | null {
  return process.env.FOOTBALL_DATA_SEASON || null;
}

// Fetch all matches for the configured competition (and pinned season, if set).
export async function fetchMatches(): Promise<FdMatch[]> {
  const s = season();
  const url = `${BASE}/competitions/${competition()}/matches${s ? `?season=${s}` : ''}`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': token() },
    // The upstream call is rate-limited; caching is handled one level up by
    // getBracketSnapshot (shared across all serverless instances), so don't cache here.
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { matches?: FdMatch[] };
  return data.matches ?? [];
}

export function knockoutMatches(matches: FdMatch[]): FdMatch[] {
  return matches.filter((m) => KNOCKOUT_STAGES.includes(m.stage));
}

export function winningTeam(m: FdMatch): FdTeam | null {
  if (m.status !== 'FINISHED' || !m.score) return null;
  if (m.score.winner === 'HOME_TEAM') return m.homeTeam;
  if (m.score.winner === 'AWAY_TEAM') return m.awayTeam;
  return null; // draw with no winner field -> not resolved here
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export type BracketTeam = { id: string; name: string; crest: string | null };

// football-data crests are a mix of national flags and federation logos. For a consistent
// circular-flag look we map each nation to a circle-flags ISO code; anything not mapped falls
// back to the API crest, so unknown teams still render.
const NAME_TO_ISO: Record<string, string> = {
  Brazil: 'br', Japan: 'jp', 'Ivory Coast': 'ci', Norway: 'no', Mexico: 'mx', Ecuador: 'ec',
  England: 'gb-eng', 'Congo DR': 'cd', Argentina: 'ar', 'Cape Verde Islands': 'cv', Australia: 'au',
  Egypt: 'eg', Switzerland: 'ch', Algeria: 'dz', Colombia: 'co', Ghana: 'gh', Germany: 'de',
  Paraguay: 'py', France: 'fr', Sweden: 'se', 'South Africa': 'za', Canada: 'ca', Netherlands: 'nl',
  Morocco: 'ma', Portugal: 'pt', Croatia: 'hr', Spain: 'es', Austria: 'at', 'United States': 'us',
  'Bosnia-Herzegovina': 'ba', Belgium: 'be', Senegal: 'sn',
};

function flagFor(t: FdTeam): string | null {
  const iso = t.name ? NAME_TO_ISO[t.name] : undefined;
  if (iso) return `https://hatscripts.github.io/circle-flags/flags/${iso}.svg`;
  return t.crest ?? null;
}

// Tidy up the feed's display names (flag lookups above still use the original feed names).
const NAME_OVERRIDES: Record<string, string> = {
  'Cape Verde Islands': 'Cape Verde',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
};
function displayName(t: FdTeam, id: string): string {
  const n = t.name ?? '';
  return NAME_OVERRIDES[n] ?? (n || id);
}

export type BracketData = {
  teams: Record<string, BracketTeam>;
  seed: (string | null)[]; // 32 team ids in tree-leaf order (consecutive pairs are R32 matches)
  results: Record<string, string>; // `${round}:${matchIndex}` -> winning team id (finalised only)
  // `${round}:${matchIndex}` -> full-time score for slot A (2m) and slot B (2m+1). Excludes shootouts.
  scores: Record<string, { a: number; b: number }>;
  // `${round}:${matchIndex}` -> UTC kickoff ISO string (any matchup with >=1 known team).
  dates: Record<string, string>;
  finished: number; // count of finished knockout matches
  total: number; // total knockout matches
  lastUpdated: string;
};

// Round sizes from R32 (outer) inward; matches per round = size / 2.
const ROUND_SIZES = [32, 16, 8, 4, 2, 1];

// football-data stage -> our round index (0 = R32 outer).
const STAGE_TO_ROUND: Record<string, number> = {
  LAST_32: 0,
  LAST_16: 1,
  QUARTER_FINALS: 2,
  SEMI_FINALS: 3,
  FINAL: 4,
};

// Turn the live football-data match list into our circular-bracket model.
// We rely on two facts confirmed from the live feed:
//   1. Round-of-32 matches, ordered by id, are in bracket order; consecutive pairs (0,1)(2,3)...
//      feed each next-round match.
//   2. Winners are linked across rounds by team identity, so finished results chain forward
//      with no guesswork.
export function buildBracket(matches: FdMatch[]): BracketData {
  const knockout = knockoutMatches(matches);

  const teams: Record<string, BracketTeam> = {};
  const register = (t: FdTeam | undefined | null) => {
    if (t && t.id != null) {
      const id = String(t.id);
      if (!teams[id]) teams[id] = { id, name: displayName(t, id), crest: flagFor(t) };
    }
  };
  knockout.forEach((m) => {
    register(m.homeTeam);
    register(m.awayTeam);
  });

  // R32 in bracket order. We then place the second half first so it renders on the right,
  // matching the source image's orientation (purely cosmetic).
  const r32 = knockout.filter((m) => m.stage === 'LAST_32').sort((a, b) => a.id - b.id);
  const ordered = r32.slice(8).concat(r32.slice(0, 8));

  const seed: (string | null)[] = [];
  ordered.forEach((m) => {
    seed.push(m.homeTeam?.id != null ? String(m.homeTeam.id) : null);
    seed.push(m.awayTeam?.id != null ? String(m.awayTeam.id) : null);
  });

  // seed position lookup, used to map any feed match to its bracket slot by team identity.
  const seedIndex = new Map<string, number>();
  seed.forEach((id, i) => {
    if (id) seedIndex.set(id, i);
  });

  // Lookup of finished matches keyed by the (unordered) pair of team ids.
  const winners = new Map<string, string>(); // pair -> winner id
  const scoreByPair = new Map<string, { homeId: string; awayId: string; home: number; away: number }>();
  // Kickoff dates keyed by bracket slot `${round}:${matchIndex}` (mapped via any known team).
  const dates: Record<string, string> = {};
  let finished = 0;
  for (const m of knockout) {
    const round = STAGE_TO_ROUND[m.stage];
    if (round == null) continue;
    const homeId = m.homeTeam?.id != null ? String(m.homeTeam.id) : null;
    const awayId = m.awayTeam?.id != null ? String(m.awayTeam.id) : null;

    // Place this match's kickoff time onto its bracket slot, using whichever team we know.
    const knownId = homeId && seedIndex.has(homeId) ? homeId : awayId && seedIndex.has(awayId) ? awayId : null;
    if (knownId != null && m.utcDate) {
      const matchIndex = Math.floor(seedIndex.get(knownId)! / 2 ** (round + 1));
      dates[`${round}:${matchIndex}`] = m.utcDate;
    }

    const w = winningTeam(m);
    if (w?.id != null && homeId && awayId) {
      winners.set(pairKey(homeId, awayId), String(w.id));
      // Full-time score, with any penalty shootout backed out so it shows the 90/120-min result.
      let home = m.score.fullTime?.home ?? 0;
      let away = m.score.fullTime?.away ?? 0;
      if (m.score.duration === 'PENALTY_SHOOTOUT' && m.score.penalties) {
        home -= m.score.penalties.home ?? 0;
        away -= m.score.penalties.away ?? 0;
      }
      scoreByPair.set(pairKey(homeId, awayId), { homeId, awayId, home, away });
      finished++;
    }
  }

  // Walk the tree top-down: a match resolves only when both its teams are known and that exact
  // pairing has a finished result. This chains forward correctly as the tournament progresses.
  const slots: (string | null)[][] = ROUND_SIZES.map((n) => new Array(n).fill(null));
  for (let i = 0; i < seed.length; i++) slots[0][i] = seed[i];
  const results: Record<string, string> = {};
  const scores: Record<string, { a: number; b: number }> = {};
  for (let r = 0; r < ROUND_SIZES.length - 1; r++) {
    const matchCount = ROUND_SIZES[r] / 2;
    for (let m = 0; m < matchCount; m++) {
      const a = slots[r][2 * m];
      const b = slots[r][2 * m + 1];
      if (a && b) {
        const wid = winners.get(pairKey(a, b));
        if (wid) {
          results[`${r}:${m}`] = wid;
          slots[r + 1][m] = wid;
        }
        const sp = scoreByPair.get(pairKey(a, b));
        if (sp) {
          // Map the feed's home/away scores onto slot A (2m) and slot B (2m+1).
          scores[`${r}:${m}`] = { a: sp.homeId === a ? sp.home : sp.away, b: sp.homeId === b ? sp.home : sp.away };
        }
      }
    }
  }

  return {
    teams,
    seed,
    results,
    scores,
    dates,
    finished,
    total: knockout.length,
    lastUpdated: new Date().toISOString(),
  };
}

// Shared, cross-instance snapshot of the bracket. football-data is hit at most once every
// 60 seconds globally (not per visitor), keeping us well under the free-tier rate limit.
// If a refresh fails, Next.js keeps serving the last good snapshot.
export const getBracketSnapshot = unstable_cache(
  async (): Promise<BracketData> => buildBracket(await fetchMatches()),
  ['wc-bracket-snapshot-v2'],
  { revalidate: 60, tags: ['wc-bracket'] }
);

// A bracket is "usable" only if it's a full 32-team draw — guards against the feed
// returning an empty/partial future season if the WC code ever repoints.
export function isUsableBracket(b: BracketData | null | undefined): boolean {
  return (
    !!b &&
    Array.isArray(b.seed) &&
    b.seed.length === 32 &&
    b.seed.every(Boolean) &&
    Object.keys(b.teams ?? {}).length >= 2
  );
}

// Resilient bracket source. Never throws — the site always renders something:
//   - FREEZE_BRACKET=1  -> always serve the baked-in snapshot (use once the final is played)
//   - live feed valid   -> serve live
//   - live feed down/invalid -> serve the baked-in snapshot instead of erroring
export async function getBracket(): Promise<{ bracket: BracketData; source: 'live' | 'frozen' | 'fallback' }> {
  if (process.env.FREEZE_BRACKET === '1') {
    return { bracket: FALLBACK_BRACKET, source: 'frozen' };
  }
  try {
    const live = await getBracketSnapshot();
    if (isUsableBracket(live)) return { bracket: live, source: 'live' };
    console.warn('[RESULTS] live feed returned an unusable bracket; serving fallback snapshot');
  } catch (err) {
    console.error('[RESULTS] live feed failed; serving fallback snapshot:', err);
  }
  return { bracket: FALLBACK_BRACKET, source: 'fallback' };
}

// Compact summary used to inspect the real data shape before finalising the
// bracket mapping. Hit /api/results?debug=1 once the token is set.
export function summarise(matches: FdMatch[]) {
  const byStage: Record<string, { total: number; finished: number; sample: unknown[] }> = {};
  for (const m of matches) {
    const s = (byStage[m.stage] ||= { total: 0, finished: 0, sample: [] });
    s.total++;
    if (m.status === 'FINISHED') s.finished++;
    if (s.sample.length < 3) {
      s.sample.push({
        id: m.id,
        group: m.group,
        status: m.status,
        utcDate: m.utcDate,
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        winner: m.score?.winner ?? null,
      });
    }
  }
  return { totalMatches: matches.length, stages: byStage };
}
