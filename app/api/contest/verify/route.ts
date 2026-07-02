import { NextRequest, NextResponse } from 'next/server';
import { verifyByToken } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Public link target from the confirmation email. Marks the entry verified, then bounces the
// visitor to the leaderboard with a status flag the page uses to show a confirmation banner.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const dest = new URL('/leaderboard', request.nextUrl.origin);

  if (!token) {
    dest.searchParams.set('verified', '0');
    return NextResponse.redirect(dest);
  }

  try {
    const ok = await verifyByToken(token);
    dest.searchParams.set('verified', ok ? '1' : '0');
  } catch (err) {
    console.error('[CONTEST] verify failed:', err);
    dest.searchParams.set('verified', '0');
  }
  return NextResponse.redirect(dest);
}
