import { NextResponse } from 'next/server';
import { getBracket } from '@/lib/footballData';
import { listVerifiedEntries } from '@/lib/db';
import { finalGoals, isLocked, lockIso, MAX_SCORE, scorePicks, FINAL_KEY } from '@/lib/contest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Public leaderboard. Scores every verified entry against the live results and returns a ranked
// list. Emails are never included. Ties break by closeness of the final-goals guess (only once the
// final has been played), then by who entered first.
export async function GET() {
  const nowMs = Date.now();

  let entries;
  try {
    entries = await listVerifiedEntries();
  } catch (err) {
    console.error('[CONTEST] leaderboard load failed:', err);
    return NextResponse.json({ ok: false, error: 'Could not load the leaderboard.' }, { status: 500 });
  }

  const { bracket } = await getBracket();
  const actualFinalGoals = finalGoals(bracket.scores);
  const finalPlayed = actualFinalGoals !== null;

  const scored = entries.map((e) => {
    const { score, correct } = scorePicks(e.picks, bracket.results);
    const championId = e.picks[FINAL_KEY] ?? null;
    const tiebreakDiff =
      finalPlayed && actualFinalGoals !== null ? Math.abs(e.tiebreakGoals - actualFinalGoals) : null;
    return {
      id: e.id,
      displayName: e.displayName,
      score,
      correct,
      championId,
      championName: championId ? bracket.teams[championId]?.name ?? null : null,
      tiebreakGoals: e.tiebreakGoals,
      tiebreakDiff,
      createdAt: e.createdAt,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (finalPlayed && a.tiebreakDiff !== b.tiebreakDiff) {
      return (a.tiebreakDiff ?? Infinity) - (b.tiebreakDiff ?? Infinity);
    }
    return a.createdAt.localeCompare(b.createdAt); // earliest entry first
  });

  // Standard-competition ranking (ties share a rank).
  let lastScore = Number.NaN;
  let lastDiff: number | null = Number.NaN as unknown as number | null;
  let rank = 0;
  const ranked = scored.map((row, i) => {
    const tiesPrev =
      row.score === lastScore && (!finalPlayed || row.tiebreakDiff === lastDiff);
    if (!tiesPrev) rank = i + 1;
    lastScore = row.score;
    lastDiff = row.tiebreakDiff;
    return { rank, ...row };
  });

  return NextResponse.json({
    ok: true,
    entries: ranked,
    meta: {
      total: ranked.length,
      maxScore: MAX_SCORE,
      locked: isLocked(nowMs),
      lockIso: lockIso(),
      finalPlayed,
      finalGoals: actualFinalGoals,
    },
  });
}
