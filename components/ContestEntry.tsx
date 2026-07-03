'use client';

import { useEffect, useState } from 'react';
import type { Picks } from '@/lib/bracket';

// The "enter to win" flow for the bracket page. Shows a call-to-action once the visitor has filled
// out a complete bracket, opens a small form (display name, email, final-score tiebreak), and posts
// it to /api/contest/enter. The entry only counts once they click the link in their email.

type Props = { picks: Picks; complete: boolean; championName: string | null };

type Submit = { state: 'idle' | 'sending' | 'sent' | 'error'; message?: string };

export default function ContestEntry({ picks, complete, championName }: Props) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [goals, setGoals] = useState('');
  const [submit, setSubmit] = useState<Submit>({ state: 'idle' });
  const [lock, setLock] = useState<{ locked: boolean; lockIso: string; r32DoneIso: string } | null>(null);

  useEffect(() => {
    fetch('/api/contest/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => j.ok && setLock({ locked: j.locked, lockIso: j.lockIso, r32DoneIso: j.r32DoneIso }))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const g = Number(goals);
    if (!Number.isInteger(g) || g < 0 || g > 20) {
      setSubmit({ state: 'error', message: 'Enter your tiebreak as a whole number of goals (0–20).' });
      return;
    }
    setSubmit({ state: 'sending' });
    try {
      const res = await fetch('/api/contest/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, tiebreakGoals: g, picks }),
      });
      const json = await res.json();
      if (json.ok) {
        setSubmit({ state: 'sent' });
      } else {
        setSubmit({ state: 'error', message: json.error || 'Something went wrong. Please try again.' });
      }
    } catch {
      setSubmit({ state: 'error', message: 'Could not reach the server. Please try again.' });
    }
  }

  const locked = lock?.locked ?? false;
  const r32InProgress = !!lock && Date.now() < Date.parse(lock.r32DoneIso);

  return (
    <section className="mt-2 mb-8 w-full max-w-[560px] px-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Prize contest</p>
        <h2 className="font-display mt-1 text-xl font-bold text-stone-900">
          Win a fajita dinner for 4 🌮
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Lock in your Round-of-16-onward bracket for a chance to win dinner for four (up to £200) at
          D GRANDE Chiswick. Best score wins.
        </p>

        {locked ? (
          <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-medium text-stone-500 ring-1 ring-stone-200">
            Entries are closed — the Round of 16 has kicked off. Follow along on the{' '}
            <a href="#leaderboard" className="font-semibold text-amber-600 hover:underline">leaderboard</a> below.
          </p>
        ) : (
          <>
            {r32InProgress && (
              <div className="mt-4 rounded-lg bg-amber-100/70 px-3 py-2.5 text-left text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
                <span className="font-semibold">⏳ The Round of 32 is still being played.</span> You&apos;re
                welcome to enter now, but a pick only scores if that team actually reaches the Round of 16 — so
                you&apos;d have better odds waiting until all 16 teams are known — Saturday, once the
                last Round-of-32 game wraps up — then entering before the 6pm lock.
              </div>
            )}
            {!complete && (
              <p className="mt-4 text-sm text-stone-500">
                Fill out your full bracket first — pick a winner all the way to the champion, then come back
                here to enter.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setOpen(true)}
                disabled={!complete}
                className="rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Enter the contest
              </button>
              <a href="#leaderboard" className="text-sm font-semibold text-amber-700 hover:underline">
                View leaderboard ↓
              </a>
            </div>
            {lock && (
              <p className="mt-3 text-xs text-stone-400">
                Entries close at kickoff of the first Round-of-16 match — Saturday 4th, 6pm. So, in other
                words, you&apos;ll want to make your pick during the day Saturday before Canada v Morocco
                kicks off at 6pm!
              </p>
            )}
          </>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => submit.state !== 'sending' && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {submit.state === 'sent' ? (
              <div className="text-center">
                <p className="text-4xl">📬</p>
                <h3 className="font-display mt-2 text-xl font-bold text-stone-900">Check your email</h3>
                <p className="mt-2 text-sm text-stone-600">
                  We&apos;ve sent a confirmation link to <span className="font-medium">{email}</span>. Click it
                  to lock your entry onto the leaderboard. (Check spam if it&apos;s not there in a minute.)
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 className="font-display text-xl font-bold text-stone-900">Enter the contest</h3>
                {championName && (
                  <p className="mt-1 text-sm text-stone-500">
                    Your champion pick: <span className="font-semibold text-stone-700">{championName}</span> 🏆
                  </p>
                )}
                {r32InProgress && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                    Heads up: the Round of 32 isn&apos;t finished yet, so some picks may be teams that don&apos;t
                    reach the R16. You can still enter — but you&apos;d have better odds waiting until the 16
                    teams are set.
                  </p>
                )}

                <label className="mt-4 block text-sm font-medium text-stone-700">
                  Display name (shown publicly)
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={24}
                    required
                    placeholder="e.g. Rich the Ref"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base md:text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </label>

                <label className="mt-3 block text-sm font-medium text-stone-700">
                  Email (kept private — only used if you win)
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base md:text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </label>

                <label className="mt-3 block text-sm font-medium text-stone-700">
                  Tiebreak: total goals in the final (regulation time)
                  <input
                    type="number"
                    inputMode="numeric"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    min={0}
                    max={20}
                    required
                    placeholder="e.g. 3"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base md:text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </label>

                {submit.state === 'error' && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submit.message}</p>
                )}

                <p className="mt-4 text-xs text-stone-400">
                  No purchase necessary. 18+. One entry per person. Winner contacted by email. Your email is
                  never shown publicly or shared.
                </p>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={submit.state === 'sending'}
                    className="rounded-full px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submit.state === 'sending'}
                    className="rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
                  >
                    {submit.state === 'sending' ? 'Sending…' : 'Confirm entry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
