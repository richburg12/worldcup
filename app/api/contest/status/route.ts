import { NextResponse } from 'next/server';
import { isLocked, lockIso, r32DoneIso } from '@/lib/contest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Public: whether contest entries are currently open, so the bracket page can show the entry
// button vs an "entries closed" state. Authoritative (respects the CONTEST_LOCK_ISO override).
export async function GET() {
  const nowMs = Date.now();
  return NextResponse.json({ ok: true, locked: isLocked(nowMs), lockIso: lockIso(), r32DoneIso: r32DoneIso() });
}
