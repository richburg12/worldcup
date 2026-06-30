'use client';

import { useCallback, useEffect, useState } from 'react';
import { BANDS, CX, CY, computeBracket, MATCH_LINKS, NODES, Picks, polar, ROUNDS } from '@/lib/bracket';
import type { BracketData } from '@/lib/footballData';

const STORAGE_KEY = 'wc2026-picks-v1';
const POLL_MS = 60_000;

export default function CircularBracket() {
  const [data, setData] = useState<BracketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Picks>({});
  const [loaded, setLoaded] = useState(false);

  // Load saved hypothetical picks once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPicks(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // Fetch the live bracket, then refresh every minute.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/results', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.bracket) {
        setData(json.bracket);
        setError(null);
      } else {
        setError(json.error || 'Could not load the live bracket');
      }
    } catch {
      setError('Could not reach the results feed');
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const { slots, validPicks } = data
    ? computeBracket(data.seed, picks, data.results)
    : { slots: null, validPicks: {} as Picks };

  // Persist only the picks that still apply.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validPicks));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(validPicks), loaded]);

  function handlePick(round: number, index: number) {
    if (!slots || !data) return;
    const matchIndex = Math.floor(index / 2);
    if (data.results[`${round}:${matchIndex}`]) return; // finished -> locked
    const teamId = slots[round][index];
    if (!teamId) return;
    setPicks((prev) => ({ ...prev, [`${round}:${matchIndex}`]: teamId }));
  }

  const champion = slots ? slots[ROUNDS.length - 1][0] : null;
  const hasPicks = Object.keys(validPicks).length > 0;
  const teamOf = (id: string | null) => (id && data ? data.teams[id] : null);

  return (
    <div className="flex flex-col items-center w-full">
      <header className="w-full max-w-[920px] px-5 pt-7 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
              World Cup <span className="text-amber-600">2026</span>
            </h1>
            <p className="mt-1 max-w-md text-sm text-stone-500">
              Tap a team in an open match to send them through — finished matches lock automatically.
            </p>
          </div>
          <button
            onClick={() => setPicks({})}
            disabled={!hasPicks}
            className="shrink-0 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-40"
          >
            Reset picks
          </button>
        </div>

        {data && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-stone-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-green-700 ring-1 ring-inset ring-green-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> LIVE
            </span>
            <span>
              {data.finished} of {data.total} knockout matches played
            </span>
            <span className="text-stone-300">·</span>
            <span>
              updated {new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, refreshes every 60s
            </span>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </header>

      {!data && !error && <p className="my-24 text-stone-400">Loading the live bracket…</p>}

      {slots && data && (
        <svg viewBox="0 0 1280 1120" className="w-full max-w-[920px] h-auto" style={{ touchAction: 'manipulation' }}>
          {/* ring background bands */}
          {BANDS.map((b) =>
            b.thickness > 0 ? (
              <circle key={`band-${b.round}`} cx={CX} cy={CY} r={b.mid} fill="none" stroke={ROUNDS[b.round].bandColor} strokeWidth={b.thickness} />
            ) : null
          )}

          {/* per-match bracket connectors: grey stem (winner's path) under the coloured pairing "U" */}
          {MATCH_LINKS.map((l, i) => (
            <line key={`stem-${i}`} x1={l.stem.x1} y1={l.stem.y1} x2={l.stem.x2} y2={l.stem.y2} stroke="#9aa6b2" strokeWidth={1.5} />
          ))}
          {MATCH_LINKS.map((l, i) => (
            <g key={`u-${i}`} stroke={l.color} strokeWidth={2.5} strokeLinecap="round" opacity={0.85} fill="none">
              <line x1={l.stubA.x1} y1={l.stubA.y1} x2={l.stubA.x2} y2={l.stubA.y2} />
              <line x1={l.stubB.x1} y1={l.stubB.y1} x2={l.stubB.x2} y2={l.stubB.y2} />
              <path d={l.bar} />
            </g>
          ))}

          {/* round label pills, stacked down the bottom gap (between the two bottom teams) */}
          {ROUNDS.slice(0, 5).map((r, idx) => {
            const b = BANDS[idx];
            // sit the pill at the band's inner edge (toward centre), clear of the team circles
            const labelRadius = Math.max(62, b.mid - b.thickness / 2);
            const { x, y } = polar(labelRadius, 180);
            const w = r.short.length * 7.5 + 18;
            return (
              <g key={`pill-${r.key}`}>
                <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={11} fill={r.labelColor} />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={700} fill="#fff">
                  {r.short}
                </text>
              </g>
            );
          })}

          {/* team nodes */}
          {ROUNDS.slice(0, 5).map((rd, r) =>
            NODES[r].map((n) => {
              const teamId = slots[r][n.index];
              const matchIndex = Math.floor(n.index / 2);
              const winnerId = data.results[`${r}:${matchIndex}`];
              const completed = Boolean(winnerId);
              const isWinner = completed && teamId === winnerId;
              const isLoser = completed && teamId !== winnerId;
              const isPicked = !completed && !!teamId && validPicks[`${r}:${matchIndex}`] === teamId;
              const clickable = !!teamId && !completed;
              const team = teamOf(teamId);

              let ring = '#cbd5e1';
              let ringW = 2;
              if (isWinner) {
                ring = '#16a34a';
                ringW = 4;
              } else if (isPicked) {
                ring = '#d97706';
                ringW = 4;
              }

              const showLabel = r === 0;
              const labelPos = showLabel ? polar(ROUNDS[0].radius + 60, n.angle) : null;
              const onRight = n.angle >= 0;

              return (
                <g
                  key={`n-${r}-${n.index}`}
                  className={clickable ? 'wc-node wc-clickable' : 'wc-node'}
                  onClick={clickable ? () => handlePick(r, n.index) : undefined}
                  style={{ cursor: clickable ? 'pointer' : 'default' }}
                >
                  {team ? (
                    <>
                      {team.crest ? (
                        <image
                          href={team.crest}
                          x={n.x - n.nodeR}
                          y={n.y - n.nodeR}
                          width={n.nodeR * 2}
                          height={n.nodeR * 2}
                          preserveAspectRatio="xMidYMid slice"
                          style={{ clipPath: 'circle(50%)', ...(isLoser ? { filter: 'grayscale(1)', opacity: 0.45 } : {}) }}
                        />
                      ) : (
                        <circle cx={n.x} cy={n.y} r={n.nodeR} fill="#e2e8f0" />
                      )}
                      <circle className="wc-ring" cx={n.x} cy={n.y} r={n.nodeR} fill="none" stroke={ring} strokeWidth={ringW} />
                      {isWinner && (
                        <g>
                          <circle cx={n.x + n.nodeR * 0.72} cy={n.y - n.nodeR * 0.72} r={9} fill="#16a34a" />
                          <path
                            d={`M ${n.x + n.nodeR * 0.72 - 4} ${n.y - n.nodeR * 0.72} l 2.5 3 l 5 -6`}
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                    </>
                  ) : (
                    <>
                      <circle cx={n.x} cy={n.y} r={n.nodeR} fill="#eef2f6" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 3" />
                      <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={n.nodeR} fill="#94a3b8">
                        ?
                      </text>
                    </>
                  )}

                  {team && <title>{team.name}</title>}

                  {showLabel && team && labelPos && (
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor={onRight ? 'start' : 'end'}
                      dominantBaseline="middle"
                      fontSize={12.5}
                      fontWeight={600}
                      fill="#44403c"
                    >
                      {team.name}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* champion / trophy at centre */}
          {champion && teamOf(champion) ? (
            <g>
              {teamOf(champion)!.crest && (
                <image
                  href={teamOf(champion)!.crest!}
                  x={CX - 40}
                  y={CY - 34}
                  width={80}
                  height={80}
                  preserveAspectRatio="xMidYMid slice"
                  style={{ clipPath: 'circle(50%)' }}
                />
              )}
              <circle cx={CX} cy={CY + 6} r={40} fill="none" stroke="#d4a017" strokeWidth={5} />
              <text x={CX} y={CY - 52} textAnchor="middle" fontSize={34}>
                🏆
              </text>
            </g>
          ) : (
            <text x={CX} y={CY + 6} textAnchor="middle" dominantBaseline="middle" fontSize={56}>
              🏆
            </text>
          )}
        </svg>
      )}

      {champion && teamOf(champion) && (
        <p className="mb-8 -mt-2 text-center text-lg font-semibold text-stone-800">🏆 Your champion: {teamOf(champion)!.name}</p>
      )}
    </div>
  );
}
