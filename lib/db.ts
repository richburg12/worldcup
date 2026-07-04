// All contest database access lives here (Vercel Postgres). One table: contest_entries.
//
// An entry is created "unverified" and only appears on the leaderboard / is eligible to win once
// the entrant clicks the link in their confirmation email. Email is stored but never exposed
// publicly — it exists solely to contact winners.

import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';
import type { Picks } from './bracket';

export type Entry = {
  id: number;
  displayName: string;
  picks: Picks;
  tiebreakGoals: number;
  verified: boolean;
  createdAt: string;
};

// Admin view additionally exposes the (otherwise private) email.
export type AdminEntry = Entry & { email: string };

let tablesReady = false;

// Idempotent schema setup; safe to call at the top of any handler. Guarded so it only runs once
// per serverless instance rather than per request.
export async function initContestTables(): Promise<void> {
  if (tablesReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS contest_entries (
      id             SERIAL PRIMARY KEY,
      email          TEXT NOT NULL,
      email_norm     TEXT NOT NULL UNIQUE,
      display_name   TEXT NOT NULL,
      picks          JSONB NOT NULL,
      tiebreak_goals INT NOT NULL,
      verify_token   TEXT NOT NULL,
      verified       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      verified_at    TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS contest_entries_verified_idx ON contest_entries (verified)`;
  await sql`CREATE INDEX IF NOT EXISTS contest_entries_token_idx ON contest_entries (verify_token)`;
  // Records when the post-lock "entries closed — here are your picks" email went out, so it can
  // never be sent to the same entrant twice. NULL = not yet sent.
  await sql`ALTER TABLE contest_entries ADD COLUMN IF NOT EXISTS picks_reminder_sent_at TIMESTAMPTZ`;
  tablesReady = true;
}

function newToken(): string {
  return randomBytes(24).toString('hex');
}

export type EnterOutcome =
  | { status: 'created' | 'resent'; token: string; displayName: string }
  | { status: 'already_verified' };

// Create a new unverified entry, or replace an existing UNVERIFIED one for the same inbox
// (regenerating its token so a fresh confirmation email is sent). If a VERIFIED entry already
// exists for that inbox we refuse — we won't let the public form overwrite a confirmed entry
// (no ownership proof); such edits go through admin.
export async function upsertUnverifiedEntry(params: {
  email: string;
  emailNorm: string;
  displayName: string;
  picks: Picks;
  tiebreakGoals: number;
}): Promise<EnterOutcome> {
  await initContestTables();
  const existing = await sql`
    SELECT id, verified FROM contest_entries WHERE email_norm = ${params.emailNorm} LIMIT 1
  `;
  if (existing.rows.length > 0) {
    if (existing.rows[0].verified) return { status: 'already_verified' };
    const token = newToken();
    await sql`
      UPDATE contest_entries
      SET email = ${params.email},
          display_name = ${params.displayName},
          picks = ${JSON.stringify(params.picks)}::jsonb,
          tiebreak_goals = ${params.tiebreakGoals},
          verify_token = ${token},
          created_at = NOW()
      WHERE email_norm = ${params.emailNorm}
    `;
    return { status: 'resent', token, displayName: params.displayName };
  }
  const token = newToken();
  await sql`
    INSERT INTO contest_entries (email, email_norm, display_name, picks, tiebreak_goals, verify_token)
    VALUES (${params.email}, ${params.emailNorm}, ${params.displayName},
            ${JSON.stringify(params.picks)}::jsonb, ${params.tiebreakGoals}, ${token})
  `;
  return { status: 'created', token, displayName: params.displayName };
}

// Mark the entry with this token verified. Returns true if a (previously unverified) entry was
// found; idempotent-friendly — re-clicking a link for an already-verified entry also returns true.
export async function verifyByToken(token: string): Promise<boolean> {
  await initContestTables();
  const found = await sql`SELECT id, verified FROM contest_entries WHERE verify_token = ${token} LIMIT 1`;
  if (found.rows.length === 0) return false;
  if (!found.rows[0].verified) {
    await sql`UPDATE contest_entries SET verified = TRUE, verified_at = NOW() WHERE verify_token = ${token}`;
  }
  return true;
}

// Verified entries only, for the public leaderboard. No email field.
export async function listVerifiedEntries(): Promise<Entry[]> {
  await initContestTables();
  const { rows } = await sql`
    SELECT id, display_name, picks, tiebreak_goals, verified, created_at
    FROM contest_entries WHERE verified = TRUE ORDER BY created_at ASC
  `;
  return rows.map(rowToEntry);
}

// Everything, including email, for the admin view.
export async function listAllEntries(): Promise<AdminEntry[]> {
  await initContestTables();
  const { rows } = await sql`
    SELECT id, email, display_name, picks, tiebreak_goals, verified, created_at
    FROM contest_entries ORDER BY created_at DESC
  `;
  return rows.map((r) => ({ ...rowToEntry(r), email: String(r.email) }));
}

// Confirmed entries that haven't yet been sent their post-lock picks reminder. Includes email
// (needed to send it) — this list is never exposed publicly, only used by the reminder job.
export async function listEntriesNeedingReminder(): Promise<AdminEntry[]> {
  await initContestTables();
  const { rows } = await sql`
    SELECT id, email, display_name, picks, tiebreak_goals, verified, created_at
    FROM contest_entries
    WHERE verified = TRUE AND picks_reminder_sent_at IS NULL
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({ ...rowToEntry(r), email: String(r.email) }));
}

// Mark that the picks reminder has been emailed to this entry, so it never goes out twice.
export async function markReminderSent(id: number): Promise<void> {
  await initContestTables();
  await sql`UPDATE contest_entries SET picks_reminder_sent_at = NOW() WHERE id = ${id}`;
}

// Fetch a single entry (including email) by id, for admin actions. Null if not found.
export async function getEntryById(id: number): Promise<AdminEntry | null> {
  await initContestTables();
  const { rows } = await sql`
    SELECT id, email, display_name, picks, tiebreak_goals, verified, created_at
    FROM contest_entries WHERE id = ${id} LIMIT 1
  `;
  if (rows.length === 0) return null;
  return { ...rowToEntry(rows[0]), email: String(rows[0].email) };
}

export async function deleteEntry(id: number): Promise<void> {
  await initContestTables();
  await sql`DELETE FROM contest_entries WHERE id = ${id}`;
}

export async function renameEntry(id: number, displayName: string): Promise<void> {
  await initContestTables();
  await sql`UPDATE contest_entries SET display_name = ${displayName} WHERE id = ${id}`;
}

function rowToEntry(r: Record<string, unknown>): Entry {
  return {
    id: Number(r.id),
    displayName: String(r.display_name),
    // pg returns jsonb already parsed into an object.
    picks: (r.picks ?? {}) as Picks,
    tiebreakGoals: Number(r.tiebreak_goals),
    verified: Boolean(r.verified),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}
