import { NextResponse } from 'next/server';
import { getBracket } from '@/lib/footballData';

// Public endpoint (no auth) so it can be polled by the browser.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Resilient: serves live data when available, otherwise the baked-in snapshot. Never errors.
  const { bracket, source } = await getBracket();
  return NextResponse.json({ ok: true, bracket, source });
}
