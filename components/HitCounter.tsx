'use client';

import { useEffect, useState } from 'react';

const HEARTBEAT_MS = 30_000; // keep this visitor in the "here now" set (server window is 60s)
const ID_KEY = 'wc-visitor-id';
const MIN_DIGITS = 6; // zero-pad the odometer like an old GeoCities counter

type CounterState = { views: number; live: number };

// A per-tab id: survives refresh (so "live now" stays stable), unique per open tab.
function getVisitorId(): string {
  try {
    let id = sessionStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export default function HitCounter() {
  const [state, setState] = useState<CounterState | null>(null);

  useEffect(() => {
    const id = getVisitorId();
    let stopped = false;

    async function ping(fresh: boolean) {
      try {
        const res = await fetch('/api/counter', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, fresh }),
          cache: 'no-store',
        });
        const data = await res.json();
        if (!stopped && data?.enabled && typeof data.views === 'number') {
          setState({ views: data.views, live: Number(data.live) || 0 });
        }
      } catch {
        // Silent — the counter simply won't update this tick.
      }
    }

    ping(true); // this page load is a fresh view
    const timer = setInterval(() => ping(false), HEARTBEAT_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  // Hidden until the store is connected and the first count lands.
  if (!state) return null;

  const digits = String(state.views).padStart(MIN_DIGITS, '0').split('');

  return (
    <div className="mt-8 flex justify-center px-5">
      <div className="inline-flex items-center gap-3 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-sm shadow-inner">
        <span className="text-stone-400" aria-hidden>
          👁
        </span>
        <span className="flex gap-[2px]" aria-label={`${state.views} page views`}>
          {digits.map((d, i) => (
            <span
              key={i}
              className="rounded-sm bg-black px-1 text-amber-400 tabular-nums [text-shadow:0_0_6px_rgba(251,191,36,0.6)]"
            >
              {d}
            </span>
          ))}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-stone-500">views</span>
        <span className="text-stone-700" aria-hidden>
          |
        </span>
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-stone-400">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-green-400">{state.live}</span> here now
        </span>
      </div>
    </div>
  );
}
