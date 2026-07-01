import { NextRequest, NextResponse } from 'next/server';
import { counterEnabled, recordHit } from '@/lib/counter';

// Public endpoint (no auth) so the bracket page can count views and heartbeat "live" visitors.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  // Store not connected yet — tell the client to stay hidden.
  if (!counterEnabled()) return NextResponse.json({ ok: true, enabled: false });

  let body: { id?: unknown; fresh?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const id = typeof body.id === 'string' && body.id ? body.id.slice(0, 64) : null;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing visitor id' }, { status: 400 });

  try {
    const state = await recordHit(id, body.fresh === true, Date.now());
    return NextResponse.json({ ok: true, enabled: true, ...state });
  } catch (err) {
    // Never let a counter hiccup surface to visitors — just hide it.
    console.error('[COUNTER] recordHit failed:', err);
    return NextResponse.json({ ok: true, enabled: false });
  }
}
