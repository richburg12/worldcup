import { redirect } from 'next/navigation';

// The leaderboard now lives on the bracket page, directly below the entry card. Keep this route
// as a permanent redirect so any older links (or already-sent emails) still land in the right place.
export default function LeaderboardPage() {
  redirect('/worldcup#leaderboard');
}
