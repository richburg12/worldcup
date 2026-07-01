import { Redis } from '@upstash/redis';

// Public hit counter backed by Upstash Redis (connected via the Vercel Marketplace).
// If the store isn't connected yet, every function no-ops and the counter stays hidden,
// so the site is completely safe to ship before the store exists.

const VIEWS_KEY = 'wc:views'; // running total of page views (never expires)
const LIVE_KEY = 'wc:live'; // sorted set of visitorId -> last-seen timestamp (ms)
const LIVE_WINDOW_MS = 60_000; // a visitor counts as "here now" for 60s after their last ping

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  // The Vercel Upstash integration sets KV_REST_API_*; some setups use UPSTASH_REDIS_REST_*.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // store not connected — disable gracefully
  redis = new Redis({ url, token });
  return redis;
}

export function counterEnabled(): boolean {
  return getRedis() !== null;
}

export type CounterState = { views: number; live: number };

// Record a hit. `fresh` = a brand-new page load (bumps the total); heartbeats pass false.
// Returns the latest { views, live }, or null if the store isn't connected.
export async function recordHit(
  visitorId: string,
  fresh: boolean,
  nowMs: number,
): Promise<CounterState | null> {
  const r = getRedis();
  if (!r) return null;

  const cutoff = nowMs - LIVE_WINDOW_MS;
  const p = r.pipeline();
  p.zadd(LIVE_KEY, { score: nowMs, member: visitorId }); // stamp this visitor as active now
  p.zremrangebyscore(LIVE_KEY, 0, cutoff); // drop anyone whose last ping is stale
  if (fresh) p.incr(VIEWS_KEY);
  else p.get(VIEWS_KEY);
  p.zcard(LIVE_KEY); // how many visitors are active within the window

  const res = await p.exec();
  // Pipeline results line up with the order above: [zadd, zrem, views, zcard].
  const views = Number(res[2] ?? 0);
  const live = Number(res[3] ?? 0);
  return { views, live };
}
