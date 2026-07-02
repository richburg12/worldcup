'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Row = {
  rank: number;
  id: number;
  displayName: string;
  score: number;
  correct: number;
  championName: string | null;
  tiebreakGoals: number;
  tiebreakDiff: number | null;
};

type Meta = {
  total: number;
  maxScore: number;
  locked: boolean;
  lockIso: string;
  finalPlayed: boolean;
  finalGoals: number | null;
};

const POLL_MS = 60_000;

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [banner, setBanner] = useState<'confirmed' | 'invalid' | null>(null);

  // Read the ?verified flag set by the email link redirect (no Suspense needed this way).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('verified');
    if (v === '1') setBanner('confirmed');
    else if (v === '0') setBanner('invalid');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/contest/leaderboard', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setRows(json.entries);
        setMeta(json.meta);
        setError(null);
      } else {
        setError(json.error || 'Could not load the leaderboard.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-white pb-16">
      <div className="w-full max-w-[720px] px-5 pt-4">
        <Link href="/worldcup" className="text-sm font-medium text-stone-400 transition-colors hover:text-amber-600">
          ← Back to the bracket
        </Link>
      </div>

      <div className="w-full max-w-[720px] px-5">
        <header className="pt-7 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Prize contest</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            Leaderboard
          </h1>
          <p className="mt-1 max-w-md text-sm text-stone-500">
            Highest score wins a fajita dinner for 4 (up to £200) at the restaurant. 1 pt per Round-of-16 pick,
            2 for quarters, 4 for semis, 8 for the champion — {meta ? meta.maxScore : 32} points possible.
          </p>
        </header>

        {banner === 'confirmed' && (
          <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            🎉 Your entry is confirmed and on the board below. Good luck!
          </div>
        )}
        {banner === 'invalid' && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-inset ring-red-600/20">
            That confirmation link is invalid or expired. Head back to the bracket and enter again.
          </div>
        )}

        {meta && (
          <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-stone-500">
            <span>{meta.total} {meta.total === 1 ? 'entry' : 'entries'}</span>
            <span className="text-stone-300">·</span>
            <span>{meta.locked ? 'Entries closed' : 'Entries open'}</span>
            {meta.finalPlayed && meta.finalGoals !== null && (
              <>
                <span className="text-stone-300">·</span>
                <span>Final had {meta.finalGoals} goal{meta.finalGoals === 1 ? '' : 's'} (tiebreak)</span>
              </>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loaded && rows.length === 0 && !error && (
          <p className="mt-10 text-center text-stone-400">
            No confirmed entries yet.{' '}
            <Link href="/worldcup" className="font-semibold text-amber-600 hover:underline">Be the first →</Link>
          </p>
        )}

        {rows.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-400">
                <tr>
                  <th className="px-3 py-2.5 sm:px-4">#</th>
                  <th className="px-3 py-2.5 sm:px-4">Player</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell sm:px-4">Champion pick</th>
                  {meta?.finalPlayed && <th className="px-2 py-2.5 text-center">Tie</th>}
                  <th className="px-3 py-2.5 text-right sm:px-4">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((r) => (
                  <tr key={r.id} className={r.rank === 1 ? 'bg-amber-50/50' : ''}>
                    <td className="px-3 py-3 font-semibold text-stone-500 sm:px-4">
                      {r.rank === 1 ? '🏆' : r.rank}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span className="font-semibold text-stone-800">{r.displayName}</span>
                      <span className="block text-xs text-stone-400 sm:hidden">{r.championName ?? '—'}</span>
                    </td>
                    <td className="hidden px-3 py-3 text-stone-600 sm:table-cell sm:px-4">
                      {r.championName ?? '—'}
                    </td>
                    {meta?.finalPlayed && (
                      <td className="px-2 py-3 text-center text-xs text-stone-400">
                        {r.tiebreakDiff === null ? '—' : `±${r.tiebreakDiff}`}
                      </td>
                    )}
                    <td className="px-3 py-3 text-right sm:px-4">
                      <span className="font-bold text-stone-900">{r.score}</span>
                      <span className="text-stone-400"> / {meta?.maxScore ?? 32}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-stone-400">
          No purchase necessary. 18+. One entry per person. Winner contacted by email. Emails are never shown
          publicly or shared. Ties broken by closest guess of total goals in the final (regulation time).
        </p>
      </div>
    </main>
  );
}
