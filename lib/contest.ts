// Contest rules, scoring, and validation — all pure logic (no DB, no Date-at-module-load).
//
// The prediction contest runs from the Round of 16 forward. Entrants fill out the existing
// bracket; we capture the R16→Final slice of their picks, an email (kept private, used only to
// contact winners), a public display name, and a tiebreak guess (total goals in the final,
// regulation time only). Scoring compares their picks to the live results.

import { Picks, ROUNDS } from './bracket';

// Rounds included in the contest, by bracket round index (see ROUNDS in lib/bracket.ts):
//   1 = Round of 16, 2 = Quarter-finals, 3 = Semi-finals, 4 = Final.
export const CONTEST_ROUNDS = [1, 2, 3, 4] as const;

// Points per correct pick, weighted so each round is worth the same in aggregate (8 pts),
// which heavily rewards calling the deep rounds right. Max attainable = 32.
export const ROUND_POINTS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8 };

export const MAX_SCORE = CONTEST_ROUNDS.reduce(
  (sum, r) => sum + ROUND_POINTS[r] * (ROUNDS[r].count / 2),
  0
); // 8·1 + 4·2 + 2·4 + 1·8 = 32

// The one match that decides the tiebreak (Final = round 4, match 0).
export const FINAL_KEY = '4:0';

// Every match key an entry must have a pick for, in bracket order.
export const CONTEST_MATCH_KEYS: string[] = CONTEST_ROUNDS.flatMap((r) =>
  Array.from({ length: ROUNDS[r].count / 2 }, (_, m) => `${r}:${m}`)
);

// Hard entry cutoff: first R16 kickoff, 6pm London (BST = UTC+1) on 2026-07-04 → 17:00 UTC.
// Override via CONTEST_LOCK_ISO for testing (e.g. push it into the future to exercise the flow).
export function lockIso(): string {
  return process.env.CONTEST_LOCK_ISO || '2026-07-04T17:00:00Z';
}

export function isLocked(nowMs: number): boolean {
  return nowMs >= Date.parse(lockIso());
}

// Confirmations (clicking the verify link) are accepted only up to this moment — the end of the day
// on 7 Jul London, i.e. midnight going into the 8th (BST = UTC+1, so 23:00 UTC on the 7th), roughly
// the end of the Round of 16. After this an unconfirmed entry can no longer be confirmed, so nobody
// can suddenly appear on the leaderboard deep into the contest. Env-overridable for testing.
export function confirmCutoffIso(): string {
  return process.env.CONTEST_CONFIRM_CUTOFF_ISO || '2026-07-07T23:00:00Z';
}

export function confirmationsClosed(nowMs: number): boolean {
  return nowMs >= Date.parse(confirmCutoffIso());
}

// When the last Round-of-32 match is expected to finish (~4:30am London / 03:30 UTC on 2026-07-04).
// Until then the R16 field isn't fully set, so entering is allowed but disadvantageous — the UI
// shows a "you'd have better odds waiting" nudge that switches off once this passes.
// Env-overridable for testing.
export function r32DoneIso(): string {
  return process.env.CONTEST_R32_DONE_ISO || '2026-07-04T03:30:00Z';
}

// ---- scoring ----

export type ScoreBreakdown = {
  score: number;
  correct: number; // number of correct picks (of matches that have finished)
  perRound: Record<number, { correct: number; decided: number }>;
};

// Score a set of picks against finalised results. Only finished matches contribute; a pick for a
// match that hasn't happened yet simply doesn't count until it does.
export function scorePicks(picks: Picks, results: Record<string, string>): ScoreBreakdown {
  let score = 0;
  let correct = 0;
  const perRound: Record<number, { correct: number; decided: number }> = {};
  for (const round of CONTEST_ROUNDS) {
    const matchCount = ROUNDS[round].count / 2;
    const bucket = { correct: 0, decided: 0 };
    for (let m = 0; m < matchCount; m++) {
      const key = `${round}:${m}`;
      const res = results[key];
      if (!res) continue; // match not decided yet
      bucket.decided++;
      if (picks[key] === res) {
        score += ROUND_POINTS[round];
        correct++;
        bucket.correct++;
      }
    }
    perRound[round] = bucket;
  }
  return { score, correct, perRound };
}

// Actual total goals in the final (regulation time; feed already backs out any shootout), or null
// if the final hasn't been played. Used to resolve leaderboard ties.
export function finalGoals(scores: Record<string, { a: number; b: number }>): number | null {
  const s = scores[FINAL_KEY];
  return s ? s.a + s.b : null;
}

// Build the per-round picks summary used in the reminder email, resolving team ids to names via the
// supplied lookup (kept pure — the caller passes bracket.teams). Missing picks render as '—'.
export function picksSummary(
  picks: Picks,
  teamName: (id: string) => string | null
): { rounds: { label: string; picks: string[] }[]; championName: string | null } {
  const rounds = CONTEST_ROUNDS.map((r) => {
    const matchCount = ROUNDS[r].count / 2;
    const p = Array.from({ length: matchCount }, (_, m) => {
      const id = picks[`${r}:${m}`];
      return (id && teamName(id)) || '—';
    });
    return { label: ROUNDS[r].label, picks: p };
  });
  const championId = picks[FINAL_KEY];
  const championName = (championId && teamName(championId)) || null;
  return { rounds, championName };
}

// ---- validation ----

// Keep only the contest-relevant picks (R16→Final) from a full bracket pick set.
export function contestPicks(picks: Picks): Picks {
  const out: Picks = {};
  for (const key of CONTEST_MATCH_KEYS) {
    if (picks[key]) out[key] = picks[key];
  }
  return out;
}

// A valid entry must have picked a winner for every R16→Final match (i.e. chosen a champion).
export function isComplete(picks: Picks): boolean {
  return CONTEST_MATCH_KEYS.every((key) => typeof picks[key] === 'string' && picks[key].length > 0);
}

export const MAX_USERNAME = 24;
export const MIN_USERNAME = 2;

export function validUsername(name: string): boolean {
  const n = name.trim();
  // Letters/numbers/spaces and a few friendly punctuation marks; no control chars or angle brackets.
  return n.length >= MIN_USERNAME && n.length <= MAX_USERNAME && /^[\p{L}\p{N} .,!'_\-]+$/u.test(n);
}

// Total goals in a football match is realistically small; cap generously to reject junk.
export const MAX_TIEBREAK_GOALS = 20;

export function validTiebreak(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_TIEBREAK_GOALS;
}

// Lightweight email sanity check (not RFC-perfect; verification email is the real proof).
export function validEmailShape(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254;
}

// Collapse addresses that reach the same inbox to one key, so aliases can't multiply entries.
// Gmail ignores dots and everything after '+'; for other providers we only strip the '+tag'.
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 0) return email;
  let local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const gmailish = domain === 'gmail.com' || domain === 'googlemail.com';
  local = local.split('+')[0];
  if (gmailish) local = local.replace(/\./g, '');
  return `${local}@${gmailish ? 'gmail.com' : domain}`;
}
