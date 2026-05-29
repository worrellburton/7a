'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AlumniProfileEditor from '../_components/AlumniProfileEditor';

// Peer support phone list · the one shared at weekly meetings.
// Reads from alumni_profiles where on_phone_list = true. Alumni
// add themselves by toggling the opt-in inside their profile;
// admins can also maintain manual entries via the moderation
// surface in Phase 2.

interface Contact {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email_for_alumni: string | null;
  available_for: string[];
  phone_visible: boolean;
  email_visible: boolean;
  updated_at: string;
}

export default function PeerSupportContent() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Pull each alum's name + avatar in the same round-trip via the
    // users join so every row in the list can render its identity
    // (matching the alumni map's portrait-pin convention).
    const { data } = await supabase
      .from('alumni_profiles')
      .select('user_id, city, state, phone, email_for_alumni, available_for, phone_visible, email_visible, updated_at, users:user_id(full_name, avatar_url)')
      .eq('on_phone_list', true)
      .order('state', { ascending: true })
      .order('city', { ascending: true });
    const flattened: Contact[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const usr = (row.users as { full_name?: string | null; avatar_url?: string | null } | null) ?? null;
      return {
        user_id: row.user_id as string,
        full_name: usr?.full_name ?? null,
        avatar_url: usr?.avatar_url ?? null,
        city: (row.city as string | null) ?? null,
        state: (row.state as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        email_for_alumni: (row.email_for_alumni as string | null) ?? null,
        available_for: Array.isArray(row.available_for) ? (row.available_for as string[]) : [],
        phone_visible: !!row.phone_visible,
        email_visible: !!row.email_visible,
        updated_at: (row.updated_at as string) ?? '',
      };
    });
    setRows(flattened);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Peer support list</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Pick up the phone. Be picked up.
          </h1>
          <p className="mt-1 text-sm text-foreground/65 max-w-xl">
            Alumni who&rsquo;ve opted in to take calls. Updated weekly at the alumni meeting; add yourself
            anytime via your profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 shrink-0"
        >
          ➕ Add me to the list
        </button>
      </header>

      {loading ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-warm-bg/40 px-6 py-10 text-center">
          <p className="text-3xl mb-2" aria-hidden="true">📞</p>
          <p className="text-[13px] text-foreground/60">
            Nobody&rsquo;s on the list yet. Be the first — toggle &ldquo;Add me to the peer support phone
            list&rdquo; in your profile.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          {rows.map((r, idx) => {
            const initial = (r.full_name || r.city || '?').charAt(0).toUpperCase();
            const locationStr = [r.city, r.state].filter(Boolean).join(', ');
            return (
              <div
                key={r.user_id}
                className={`px-4 py-3 flex items-center gap-3 ${idx > 0 ? 'border-t border-black/5' : ''}`}
              >
                {r.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.avatar_url}
                    alt={r.full_name || ''}
                    referrerPolicy="no-referrer"
                    className="shrink-0 w-10 h-10 rounded-full object-cover ring-1 ring-primary/40"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary text-[13px] font-bold ring-1 ring-primary/40 inline-flex items-center justify-center"
                  >
                    {initial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {r.full_name || 'Alumni'}
                  </p>
                  <p className="text-[11px] text-foreground/55 mt-0.5 truncate">
                    {locationStr || 'Location private'}
                    {r.available_for.length > 0 && (
                      <>
                        <span aria-hidden className="mx-1.5 text-foreground/30">·</span>
                        {r.available_for.slice(0, 4).join(' · ')}
                      </>
                    )}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-0.5 text-[12px]">
                  {r.phone_visible && r.phone ? (
                    <a href={`tel:${r.phone}`} className="text-primary font-semibold">{r.phone}</a>
                  ) : (
                    <span className="text-foreground/45 italic">Via Feather chat</span>
                  )}
                  {r.email_visible && r.email_for_alumni && (
                    <a href={`mailto:${r.email_for_alumni}`} className="text-foreground/65 text-[11px]">{r.email_for_alumni}</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editorOpen && <AlumniProfileEditor onClose={() => setEditorOpen(false)} onSaved={() => void load()} />}
    </div>
  );
}
