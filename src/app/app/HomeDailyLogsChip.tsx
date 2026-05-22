'use client';

// Minimal "logs today" indicator under the Online-today orbit on
// /app. Clicking opens /app/logs — a dedicated full-screen rain
// page so the visual flourish that used to live ambient on the
// home page now has its own real estate. Hover surfaces a small
// helper line so the affordance reads as 'click to open'.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function HomeDailyLogsChip() {
  const { user, session } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  // Initial fetch — uses the same /api/contact-logs/today endpoint
  // the rain page consumes so the count matches what the lever
  // preview / activity feed report.
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/contact-logs/today', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = (await res.json()) as { count?: number; logs?: unknown[] };
        if (cancelled) return;
        if (typeof json.count === 'number') setCount(json.count);
        else if (Array.isArray(json.logs)) setCount(json.logs.length);
      } catch {
        // non-fatal — realtime will bring the number up to date
      }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  // Realtime — every new contact_logs row bumps the count by one
  // until the next refresh. We don't worry about deletes; the
  // initial fetch on each load re-anchors the number.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`home-daily-logs-chip-${user.id}-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_logs' },
        () => setCount((c) => (c == null ? 1 : c + 1)),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  return (
    <div className="flex justify-center">
      <Link
        href="/app/logs"
        aria-label="Open today's log rain"
        title="Click to watch today's logs fall"
        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/40 bg-emerald-50/80 text-emerald-700 text-[11px] font-semibold uppercase tracking-[0.18em] hover:border-emerald-500/70 hover:bg-emerald-100/90 hover:text-emerald-800 hover:shadow-sm transition-all"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span aria-hidden="true">🪵</span>
        <span>Daily logs</span>
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${count != null ? 'bg-emerald-500' : 'bg-foreground/25'}`}
          aria-hidden="true"
        />
        <span className="tabular-nums text-emerald-700/85">{count ?? '—'}</span>
        {/* Hover-only nudge — invisible until pointer enters the
            chip, then slides in as a quick reminder that the chip
            is clickable. */}
        <span
          aria-hidden="true"
          className="ml-0.5 text-emerald-700/40 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          →
        </span>
      </Link>
    </div>
  );
}
