import type { Metadata } from 'next';
import Leaderboard from '@/components/Leaderboard';

export const metadata: Metadata = {
  title: 'World Cup Bracket Contest — Leaderboard',
  description: 'Live leaderboard for the World Cup 2026 bracket contest. Best score wins a fajita dinner for 4.',
};

export default function LeaderboardPage() {
  return <Leaderboard />;
}
