'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminResults from '@/components/AdminResults';

// Minimal single-operator admin: paste the ADMIN_TOKEN once (kept in localStorage), then view
// every entry (including private emails) and delete or rename any of them. Not a full auth system
// — adequate for one person managing a low-stakes promo.

type AdminEntry = {
  id: number;
  email: string;
  displayName: string;
  tiebreakGoals: number;
  verified: boolean;
  createdAt: string;
};

const TOKEN_KEY = 'wc-admin-token';

export default function AdminContestPage() {
  const [token, setToken] = useState('');
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const load = useCallback(async (tok: string) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/contest', { headers: { 'x-admin-token': tok }, cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setEntries(json.entries);
        setAuthed(true);
        localStorage.setItem(TOKEN_KEY, tok);
      } else {
        setAuthed(false);
        setError(json.error || 'Unauthorized.');
      }
    } catch {
      setError('Could not reach the server.');
    }
  }, []);

  async function del(id: number, name: string) {
    if (!confirm(`Delete entry "${name}"? This can't be undone.`)) return;
    await fetch(`/api/admin/contest?id=${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
    load(token);
  }

  async function testEmail(id: number, name: string) {
    if (!confirm(`Send a test of the "entries closed — here are your picks" email to ${name}'s address now?`)) return;
    setNote(null);
    try {
      const res = await fetch('/api/admin/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ id, action: 'test-reminder' }),
      });
      const json = await res.json();
      setNote(json.ok ? `✓ Test email sent to ${json.sentTo}` : `✗ ${json.error || 'Send failed.'}`);
    } catch {
      setNote('✗ Could not reach the server.');
    }
  }

  async function rename(id: number, current: string) {
    const next = prompt('New display name:', current);
    if (!next || next.trim() === current) return;
    const res = await fetch('/api/admin/contest', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ id, displayName: next.trim() }),
    });
    const json = await res.json();
    if (!json.ok) alert(json.error || 'Rename failed.');
    load(token);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10">
      <h1 className="font-display text-2xl font-bold text-stone-900">Contest entries — admin</h1>

      {!authed ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(token);
          }}
          className="mt-6 flex items-end gap-3"
        >
          <label className="flex-1 text-sm font-medium text-stone-700">
            Admin token
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base md:text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </label>
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">
            Load
          </button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-stone-500">{entries.length} total entries</p>
      )}

      {authed && (
        <div className="mt-6">
          <AdminResults token={token} />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {note && <p className="mt-3 text-sm font-medium text-stone-700">{note}</p>}

      {authed && entries.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-400">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-2 py-2 text-center">Tie</th>
                <th className="px-2 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2.5 font-medium text-stone-800">{e.displayName}</td>
                  <td className="px-3 py-2.5 text-stone-500">{e.email}</td>
                  <td className="px-2 py-2.5 text-center text-stone-500">{e.tiebreakGoals}</td>
                  <td className="px-2 py-2.5 text-center">
                    {e.verified ? (
                      <span className="text-green-600">✓ verified</span>
                    ) : (
                      <span className="text-stone-400">pending</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => testEmail(e.id, e.displayName)} className="text-stone-600 hover:underline">
                      test email
                    </button>
                    <span className="text-stone-300"> · </span>
                    <button onClick={() => rename(e.id, e.displayName)} className="text-amber-600 hover:underline">
                      rename
                    </button>
                    <span className="text-stone-300"> · </span>
                    <button onClick={() => del(e.id, e.displayName)} className="text-red-500 hover:underline">
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
