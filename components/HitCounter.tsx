'use client';

import { useEffect, useState } from 'react';

const HEARTBEAT_MS = 30_000; // keep this visitor in the "here now" set (server window is 60s)
const ID_KEY = 'wc-visitor-id';

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

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-5">
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className="font-display text-base font-bold tabular-nums text-stone-900"
          aria-label={`${state.views} page views`}
        >
          {state.views.toLocaleString()}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">views</span>
      </span>

      {state.live > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
          </span>
          {state.live} here now
        </span>
      )}
    </div>
  );
}
