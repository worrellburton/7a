'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

// Staff-only moderation queue for alumni-submitted resources +
// stories. Lists pending items across both tables, with one-click
// approve / reject. Gated by isAdmin at render time + RLS on the
// underlying tables.

interface PendingItem {
  kind: 'resource' | 'story';
  id: string;
  title: string;
  detail: string;
  submitted_by: string | null;
  created_at: string;
}

export default function ModerationContent() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [resources, stories] = await Promise.all([
      supabase.from('alumni_resources').select('id, title, description, submitted_by, created_at').eq('status', 'pending'),
      supabase.from('alumni_stories').select('id, title, body, submitted_by, created_at').eq('status', 'pending'),
    ]);
    const out: PendingItem[] = [];
    for (const r of resources.data ?? []) {
      out.push({ kind: 'resource', id: r.id, title: r.title, detail: r.description ?? '', submitted_by: r.submitted_by, created_at: r.created_at });
    }
    for (const s of stories.data ?? []) {
      out.push({ kind: 'story', id: s.id, title: s.title, detail: s.body ?? '', submitted_by: s.submitted_by, created_at: s.created_at });
    }
    out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setItems(out);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function decide(item: PendingItem, decision: 'published' | 'rejected') {
    const table = item.kind === 'resource' ? 'alumni_resources' : 'alumni_stories';
    const update: Record<string, unknown> = { status: decision };
    if (item.kind === 'story' && decision === 'published') update.published_at = new Date().toISOString();
    await supabase.from(table).update(update).eq('id', item.id);
    void load();
  }

  if (!isAdmin) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-3xl mb-2" aria-hidden="true">🔒</p>
        <p className="text-[13px] text-foreground/60">Moderation is staff-only. <Link href="/app/alumni" className="text-primary font-semibold">Back to the alumni hub</Link>.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Moderation queue</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          {items.length} pending {items.length === 1 ? 'submission' : 'submissions'}
        </h1>
      </header>

      {loading ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-foreground/55 italic">Inbox zero. Nothing waiting on review.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={`${it.kind}-${it.id}`} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{it.kind === 'resource' ? 'Resource' : 'Story'}</p>
                <p className="text-[10.5px] text-foreground/45">{new Date(it.created_at).toLocaleString()}</p>
              </div>
              <h2 className="text-[15px] font-bold text-foreground">{it.title}</h2>
              {it.detail && <p className="mt-1 text-[13px] text-foreground/70 leading-relaxed whitespace-pre-line line-clamp-6">{it.detail}</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={() => void decide(it, 'published')}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-emerald-700">
                  Publish
                </button>
                <button onClick={() => void decide(it, 'rejected')}
                  className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-foreground/65 text-[11.5px] font-semibold hover:bg-warm-bg/60">
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
