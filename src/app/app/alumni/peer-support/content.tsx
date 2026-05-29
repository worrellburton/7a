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
  bio: string | null;
  interests: string[];
  phone: string | null;
  email_for_alumni: string | null;
  available_for: string[];
  phone_visible: boolean;
  email_visible: boolean;
  text_ok: boolean;
  updated_at: string;
}

// Pretty-print a 10-digit US phone; leave anything else untouched.
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return raw;
}

// Glowing tap-to-call card — shared visual language with the map list.
function PhoneCard({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      onClick={(e) => e.stopPropagation()}
      className="group/phone inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-white px-3.5 py-2 text-[13.5px] font-bold text-primary tabular-nums shadow-[0_0_16px_-4px_rgba(188,107,74,0.55)] hover:shadow-[0_0_24px_-2px_rgba(188,107,74,0.8)] hover:border-primary/70 transition-all"
      title={`Call ${formatPhone(phone)}`}
    >
      <span aria-hidden className="leading-none transition-transform group-hover/phone:scale-110">📞</span>
      <span>{formatPhone(phone)}</span>
    </a>
  );
}

function TextAnytime({ phone }: { phone: string }) {
  return (
    <a
      href={`sms:${phone.replace(/[^\d+]/g, '')}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 transition-colors"
      title={`Text ${formatPhone(phone)} — open to texts anytime`}
    >
      <span aria-hidden>💬</span> Text anytime
    </a>
  );
}

export default function PeerSupportContent() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Pull each alum's name + avatar in the same round-trip via the
    // users join so every row in the list can render its identity
    // (matching the alumni map's portrait-pin convention).
    const { data } = await supabase
      .from('alumni_profiles')
      .select('user_id, city, state, bio, interests, phone, email_for_alumni, available_for, phone_visible, email_visible, text_ok, updated_at, users:user_id(full_name, avatar_url)')
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
        bio: (row.bio as string | null) ?? null,
        interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
        phone: (row.phone as string | null) ?? null,
        email_for_alumni: (row.email_for_alumni as string | null) ?? null,
        available_for: Array.isArray(row.available_for) ? (row.available_for as string[]) : [],
        phone_visible: !!row.phone_visible,
        email_visible: !!row.email_visible,
        text_ok: !!row.text_ok,
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
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden divide-y divide-black/5">
          {rows.map((r) => {
            const initial = (r.full_name || r.city || '?').charAt(0).toUpperCase();
            const locationStr = [r.city, r.state].filter(Boolean).join(', ');
            const expanded = expandedId === r.user_id;
            const showPhone = r.phone_visible && !!r.phone;
            const showText = showPhone && r.text_ok;
            return (
              <div key={r.user_id}>
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === r.user_id ? null : r.user_id))}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-warm-bg/40 transition-colors"
                  aria-expanded={expanded}
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
                      {showText && <span className="ml-1.5 text-emerald-600 font-semibold">· 💬 texts welcome</span>}
                    </p>
                  </div>
                  {showPhone ? (
                    <a
                      href={`tel:${(r.phone as string).replace(/[^\d+]/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-primary font-semibold tabular-nums text-[12.5px] hover:underline"
                    >
                      {formatPhone(r.phone as string)}
                    </a>
                  ) : (
                    <span className="shrink-0 text-foreground/45 italic text-[11.5px]">Via Feather chat</span>
                  )}
                  <span aria-hidden className={`shrink-0 ml-1 inline-flex items-center justify-center w-6 h-6 rounded-md border text-foreground/55 transition-transform ${expanded ? 'rotate-180 bg-foreground text-white border-foreground' : 'bg-white border-black/10'}`}>
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
                  </span>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 pt-1 bg-warm-bg/25">
                    {r.bio && <p className="text-[13px] text-foreground/80 leading-relaxed">{r.bio}</p>}
                    {(r.interests.length > 0 || r.available_for.length > 0) && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {r.interests.map((t) => (
                          <span key={`i-${t}`} className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {r.available_for.map((t) => (
                          <span key={`a-${t}`} className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {showPhone && <PhoneCard phone={r.phone as string} />}
                      {showText && <TextAnytime phone={r.phone as string} />}
                      {r.email_visible && r.email_for_alumni && (
                        <a
                          href={`mailto:${r.email_for_alumni}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-[12.5px] font-semibold text-foreground/75 hover:bg-warm-bg/60"
                        >
                          ✉️ {r.email_for_alumni}
                        </a>
                      )}
                      {!showPhone && !r.email_visible && (
                        <span className="text-[12px] text-foreground/45 italic">Reach out via Feather chat.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editorOpen && <AlumniProfileEditor onClose={() => setEditorOpen(false)} onSaved={() => void load()} />}
    </div>
  );
}
