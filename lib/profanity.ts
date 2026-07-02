// Basic profanity screen for public display names. Not bulletproof — a determined person can
// evade any client-side list — but it stops casual abuse from parking something ugly on the
// leaderboard under the restaurant's brand. Admins can also delete/rename any entry after the fact.

// Leetspeak-ish substitutions folded to letters before matching.
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b',
};

// Core blocklist (kept deliberately short and obvious). Matched as substrings of the collapsed
// name, plus a few that only make sense as whole words to avoid the "Scunthorpe problem".
const SUBSTRINGS = [
  'fuck', 'shit', 'bitch', 'cunt', 'wank', 'bollock', 'bastard', 'dick',
  'pussy', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'retard', 'rape',
  'nazi', 'paki', 'spastic', 'kike', 'chink', 'coon', 'twat',
];
const WHOLE_WORDS = ['ass', 'cum', 'tit', 'tits', 'hoe', 'jap'];

// Collapse a name to a comparable form: lowercase, de-leet, strip anything but letters.
function collapse(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map((c) => LEET[c] ?? c)
    .join('')
    .replace(/[^a-z]/g, '');
}

export function isCleanUsername(name: string): boolean {
  const collapsed = collapse(name);
  if (SUBSTRINGS.some((bad) => collapsed.includes(bad))) return false;
  const words = name.toLowerCase().split(/[^a-z]+/i).filter(Boolean);
  if (words.some((w) => WHOLE_WORDS.includes(w))) return false;
  return true;
}
