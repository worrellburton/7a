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
    const { data } = await supabase
      .from('alumni_profiles')
      .select('user_id, city, state, phone, email_for_alumni, available_for, phone_visible, email_visible, updated_at')
      .eq('on_phone_list', true)
      .order('state', { ascending: true })
      .order('city', { ascending: true });
    setRows((data ?? []) as Contact[]);
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
          {rows.map((r, idx) => (
            <div
              key={r.user_id}
              className={`px-4 py-3 flex items-center gap-3 ${idx > 0 ? 'border-t border-black/5' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">
                  {[r.city, r.state].filter(Boolean).join(', ') || 'Location private'}
                </p>
                {r.available_for.length > 0 && (
                  <p className="text-[11px] text-foreground/55 mt-0.5">
                    {r.available_for.slice(0, 4).join(' · ')}
                  </p>
                )}
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
          ))}
        </div>
      )}

      {editorOpen && <AlumniProfileEditor onClose={() => setEditorOpen(false)} onSaved={() => void load()} />}
    </div>
  );
}
