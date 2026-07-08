'use client';

import { useCallback, useEffect, useState } from 'react';
import { computeBracket, ROUNDS } from '@/lib/bracket';
import type { BracketData } from '@/lib/footballData';

// Manual result control, shown at the top of the admin page. Lets the operator mark a knockout
// winner (QF -> SF -> Final) the moment they know it, ahead of the data feed. A pick goes live on
// the public bracket and the contest leaderboard immediately, and cascades into the next round.

// Rounds we allow control over, from the outside in: 2 = QF, 3 = SF, 4 = Final.
const CONTROL_ROUNDS = [2, 3, 4];

type ApiState = { bracket: BracketData; overrides: Record<string, string> };

export default function AdminResults({ token }: { token: string }) {
  const [state, setState] = useState<ApiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/results', { headers: { 'x-admin-token': token }, cache: 'no-store' });
      const json = await res.json();
      if (json.ok) setState({ bracket: json.bracket, overrides: json.overrides || {} });
      else setError(json.error || 'Could not load results.');
    } catch {
      setError('Could not reach the server.');
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const teamName = (id: string | null | undefined): string | null =>
    id && state ? state.bracket.teams[id]?.name ?? null : null;

  async function setWinner(matchKey: string, teamId: string, name: string, matchLabel: string) {
    if (busy) return;
    if (!confirm(`Set ${name} as the winner of ${matchLabel}?\n\nThis goes live on the public bracket and the leaderboard immediately.`)) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/admin/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ matchKey, winnerId: teamId }),
      });
      const json = await res.json();
      if (json.ok) {
        setNote(`✓ ${name} marked as the winner — now live.`);
        await load();
      } else {
        setNote(`✗ ${json.error || 'Could not save.'}`);
      }
    } catch {
      setNote('✗ Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function revert(matchKey: string, matchLabel: string) {
    if (busy) return;
    if (!confirm(`Clear your manual result for ${matchLabel}?\n\nThe match will go back to whatever the data feed reports.`)) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/results?matchKey=${encodeURIComponent(matchKey)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      const json = await res.json();
      if (json.ok) {
        setNote('✓ Reverted to the data feed.');
        await load();
      } else {
        setNote(`✗ ${json.error || 'Could not clear.'}`);
      }
    } catch {
      setNote('✗ Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <section className="mb-8 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-display text-lg font-bold text-stone-900">Set match winners</h2>
        {error ? (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        ) : (
          <p className="mt-2 text-sm text-stone-400">Loading the bracket…</p>
        )}
      </section>
    );
  }

  // Resolve who is currently in each slot (feed + any overrides already applied to results).
  const { slots } = computeBracket(state.bracket.seed, {}, state.bracket.results);
  const feedResults = state.bracket.feedResults || {};

  return (
    <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <h2 className="font-display text-lg font-bold text-stone-900">Set match winners</h2>
      <p className="mt-1 text-sm text-stone-600">
        Tap the winner to mark a result before the feed catches up. It goes live immediately and
        fills in the next round below.
      </p>
      {note && <p className="mt-2 text-sm font-medium text-stone-800">{note}</p>}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-4 space-y-5">
        {CONTROL_ROUNDS.map((r) => {
          const matchCount = ROUNDS[r].count / 2;
          return (
            <div key={r}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{ROUNDS[r].label}</h3>
              <div className="mt-2 space-y-2">
                {Array.from({ length: matchCount }, (_, m) => {
                  const key = `${r}:${m}`;
                  const a = slots[r][2 * m];
                  const b = slots[r][2 * m + 1];
                  const winnerId = state.bracket.results[key] ?? null;
                  const isOverride = state.overrides[key] !== undefined;
                  const feedWid = feedResults[key];
                  const feedConflict = !!feedWid && !!winnerId && feedWid !== winnerId;
                  const matchLabel = `${ROUNDS[r].short} — ${teamName(a) ?? 'TBD'} v ${teamName(b) ?? 'TBD'}`;

                  const teamButton = (teamId: string | null) => {
                    const name = teamName(teamId);
                    if (!teamId || !name) {
                      return (
                        <div className="flex-1 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-center text-base md:text-sm text-stone-400">
                          TBD
                        </div>
                      );
                    }
                    const isWinner = winnerId === teamId;
                    return (
                      <button
                        onClick={() => setWinner(key, teamId, name, matchLabel)}
                        disabled={busy}
                        aria-pressed={isWinner}
                        className={`flex-1 rounded-lg border px-3 py-3 text-center text-base md:text-sm font-semibold transition-colors disabled:opacity-50 ${
                          isWinner
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
                        }`}
                      >
                        {isWinner ? '✓ ' : ''}
                        {name}
                      </button>
                    );
                  };

                  return (
                    <div key={key} className="rounded-lg bg-white/70 p-2">
                      <div className="flex items-stretch gap-2">
                        {teamButton(a)}
                        <div className="flex items-center text-xs font-medium text-stone-400">v</div>
                        {teamButton(b)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
                        {isOverride && (
                          <span className="text-xs text-stone-500">
                            set by you ·{' '}
                            <button
                              onClick={() => revert(key, matchLabel)}
                              disabled={busy}
                              className="font-medium text-red-500 hover:underline disabled:opacity-50"
                            >
                              revert to feed
                            </button>
                          </span>
                        )}
                        {feedConflict && (
                          <span className="text-xs font-medium text-red-600">
                            ⚠ feed says {teamName(feedWid)} won
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
