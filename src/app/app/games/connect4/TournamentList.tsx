'use client';

// Connect-4 · Phase 7 · tournament list + create flow. Rendered
// underneath the lobby on the index page. Shows recent
// tournaments (draft / active / complete) and a small create
// form that POSTs /api/games/connect4/tournaments.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

interface Tournament {
  id: string;
  name: string;
  size: number;
  status: 'draft' | 'active' | 'complete';
  winner_id: string | null;
  created_by: string;
  created_at: string;
}

export default function TournamentList() {
  const { session } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Tournament[]>([]);
  const [name, setName] = useState('');
  const [size, setSize] = useState<4 | 8 | 16>(8);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    const r = await fetch('/api/games/connect4/tournaments', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) { setError((json as { error?: string }).error ?? `HTTP ${r.status}`); return; }
    setItems(((json as { rows: Tournament[] }).rows) ?? []);
  }, [session?.access_token]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    const ch = supabase
      .channel('connect4-tournaments-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connect4_tournaments' }, () => void reload())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [reload]);

  const onCreate = useCallback(async () => {
    if (!session?.access_token || !name.trim()) return;
    setCreating(true);
    setError(null);
    const r = await fetch('/api/games/connect4/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ name: name.trim(), size }),
    });
    const json = await r.json().catch(() => ({}));
    setCreating(false);
    if (!r.ok) { setError((json as { error?: string }).error ?? `HTTP ${r.status}`); return; }
    const created = json as Tournament;
    setName('');
    router.push(`/app/games/connect4?tournament=${created.id}`);
  }, [session?.access_token, name, size, router]);

  const active = useMemo(() => items.filter((t) => t.status !== 'complete').slice(0, 6), [items]);
  const past = useMemo(() => items.filter((t) => t.status === 'complete').slice(0, 4), [items]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
      <header className="flex items-baseline justify-between mb-2">
        <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase text-foreground/45">Tournaments</h2>
        <span className="text-[11px] text-foreground/40 tabular-nums">{items.length}</span>
      </header>

      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tournament name…"
          maxLength={80}
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border border-black/10 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value) as 4 | 8 | 16)}
          className="px-2 py-1.5 rounded-md border border-black/10 bg-white text-[12px]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
          <option value={16}>16</option>
        </select>
        <button
          type="button"
          onClick={() => void onCreate()}
          disabled={creating || !name.trim()}
          className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? '…' : 'Create'}
        </button>
      </div>
      {error && <p className="mb-2 text-[11.5px] text-red-700" role="alert">{error}</p>}

      {active.length > 0 && (
        <ul className="space-y-1 mb-2">
          {active.map((t) => (
            <li key={t.id}>
              <Link href={`/app/games/connect4?tournament=${t.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] hover:bg-warm-bg/60" style={{ fontFamily: 'var(--font-body)' }}>
                <span className={`inline-block w-2 h-2 rounded-full ${t.status === 'draft' ? 'bg-foreground/30' : 'bg-emerald-500'}`} aria-hidden />
                <span className="truncate flex-1">{t.name}</span>
                <span className="text-[10.5px] text-foreground/45 whitespace-nowrap">{t.size}-bracket · {t.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <>
          <p className="text-[9.5px] font-bold tracking-[0.18em] uppercase text-foreground/40 mt-3 mb-1">Completed</p>
          <ul className="space-y-1">
            {past.map((t) => (
              <li key={t.id}>
                <Link href={`/app/games/connect4?tournament=${t.id}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-foreground/55 hover:bg-warm-bg/60" style={{ fontFamily: 'var(--font-body)' }}>
                  <span className="truncate flex-1">{t.name}</span>
                  <span className="text-[10px] text-foreground/45">{t.size}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
