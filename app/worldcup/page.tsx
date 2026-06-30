import Link from 'next/link';
import type { Metadata } from 'next';
import CircularBracket from '@/components/CircularBracket';

export const metadata: Metadata = {
  title: 'World Cup 2026 Bracket',
  description: 'A live, interactive circular World Cup 2026 knockout bracket — play out the rounds.',
};

export default function WorldCupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-white pb-6">
      <div className="w-full max-w-[920px] px-5 pt-4">
        <Link href="/" className="text-sm font-medium text-stone-400 transition-colors hover:text-amber-600">
          ← we can just make shit now
        </Link>
      </div>
      <CircularBracket />
    </main>
  );
}
