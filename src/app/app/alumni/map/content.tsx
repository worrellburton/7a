'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import AlumniProfileEditor from '../_components/AlumniProfileEditor';

// Phase 3 — interactive Leaflet map (ssr:false because Leaflet
// imports `window` at module load). The list view stays as a
// fallback below the map for accessibility + when nobody has
// lat/lng yet.
const AlumniMapCanvas = dynamic(() => import('../_components/AlumniMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl bg-warm-bg/30 border border-black/10 h-[60vh] min-h-[420px] flex items-center justify-center text-[12px] text-foreground/55 italic">
      Loading map…
    </div>
  ),
});

interface AlumniPin {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  available_for: string[];
  phone: string | null;
  email_for_alumni: string | null;
  phone_visible: boolean;
  email_visible: boolean;
  lat: number | null;
  lng: number | null;
}

export default function AlumniMapContent() {
  const { user } = useAuth();
  const [pins, setPins] = useState<AlumniPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  // Current viewer's own on_map state — drives the header toggle.
  // null = unknown (not loaded), true/false = explicit setting.
  const [myOnMap, setMyOnMap] = useState<boolean | null>(null);
  const [togglingMap, setTogglingMap] = useState(false);
  // Whether the viewer has any alumni_profiles row at all. If not,
  // flipping the toggle "on" needs to open the editor so they can
  // set a city before they can land a pin.
  const [hasProfile, setHasProfile] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Pull pins + each alum's avatar/full_name in one round-trip via
    // a join — the map markers ARE their profile photos.
    const { data } = await supabase
      .from('alumni_profiles')
      .select('user_id, city, state, bio, interests, available_for, phone, email_for_alumni, phone_visible, email_visible, lat, lng, users:user_id(full_name, avatar_url)')
      .eq('on_map', true)
      .order('state', { ascending: true })
      .order('city', { ascending: true });
    const flattened: AlumniPin[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const usr = (row.users as { full_name?: string | null; avatar_url?: string | null } | null) ?? null;
      return {
        user_id: row.user_id as string,
        full_name: usr?.full_name ?? null,
        avatar_url: usr?.avatar_url ?? null,
        city: (row.city as string | null) ?? null,
        state: (row.state as string | null) ?? null,
        bio: (row.bio as string | null) ?? null,
        interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
        available_for: Array.isArray(row.available_for) ? (row.available_for as string[]) : [],
        phone: (row.phone as string | null) ?? null,
        email_for_alumni: (row.email_for_alumni as string | null) ?? null,
        phone_visible: !!row.phone_visible,
        email_visible: !!row.email_visible,
        lat: (row.lat as number | null) ?? null,
        lng: (row.lng as number | null) ?? null,
      };
    });
    setPins(flattened);
    setLoading(false);

    // Fetch the viewer's own row separately so we know the toggle
    // state — they might be a pin themselves (loaded above) or
    // they might have a row with on_map=false (filtered out above).
    if (user?.id) {
      const { data: own } = await supabase
        .from('alumni_profiles')
        .select('on_map, city')
        .eq('user_id', user.id)
        .maybeSingle();
      if (own) {
        setHasProfile(true);
        setMyOnMap(!!own.on_map);
      } else {
        setHasProfile(false);
        setMyOnMap(false);
      }
    }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);

  // Flip my on_map flag. If the user has no profile yet, route them
  // into the full editor so they can land a city + pin location;
  // a profile with no city geocodes to nothing and lands no pin.
  async function toggleOnMap() {
    if (!user?.id || togglingMap) return;
    if (!hasProfile) {
      // No row yet — open the editor so they can set city/state.
      // The editor's save flow flips on_map true on its own.
      setEditorOpen(true);
      return;
    }
    setTogglingMap(true);
    const next = !myOnMap;
    setMyOnMap(next);
    const { error } = await supabase
      .from('alumni_profiles')
      .update({ on_map: next })
      .eq('user_id', user.id);
    if (error) {
      // Revert on failure so the toggle's optimistic flip stays
      // honest about server state.
      setMyOnMap(!next);
    } else {
      void load();
    }
    setTogglingMap(false);
  }

  // Group by `state · city` so the list reads like a directory.
  const grouped = (() => {
    const map = new Map<string, AlumniPin[]>();
    for (const p of pins) {
      const key = `${p.state ?? '—'} · ${p.city ?? '—'}`;
      const slot = map.get(key) ?? [];
      slot.push(p);
      map.set(key, slot);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Alumni map</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Find an alum near you.
          </h1>
          <p className="mt-1 text-sm text-foreground/65 max-w-xl">
            Pins below are opt-in only. If you&rsquo;d like to appear, add yourself via your profile —
            you choose what&rsquo;s visible.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">
            {myOnMap ? 'You’re on the map' : 'You’re not on the map'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={!!myOnMap}
            aria-label={myOnMap ? 'Remove me from the map' : 'Add me to the map'}
            onClick={() => void toggleOnMap()}
            disabled={togglingMap || myOnMap === null}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              myOnMap ? 'bg-primary' : 'bg-foreground/20'
            }`}
            title={myOnMap ? 'Click to remove your pin' : 'Click to drop a pin'}
          >
            <span
              className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                myOnMap ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55 hover:text-foreground"
          >
            Edit details
          </button>
        </div>
      </header>

      {/* Interactive map — only pins with a geocoded lat/lng. The
          list below stays visible too so an alum whose city hasn't
          been geocoded yet still appears, and screen-reader users
          have a textual fallback. */}
      {!loading && pins.some((p) => p.lat != null && p.lng != null) && (
        <div className="mb-8">
          <AlumniMapCanvas
            pins={pins
              .filter((p): p is AlumniPin & { lat: number; lng: number } => p.lat != null && p.lng != null)
              .map((p) => ({
                user_id: p.user_id,
                full_name: p.full_name,
                avatar_url: p.avatar_url,
                city: p.city,
                state: p.state,
                bio: p.bio,
                interests: p.interests,
                available_for: p.available_for,
                phone: p.phone,
                email_for_alumni: p.email_for_alumni,
                phone_visible: p.phone_visible,
                email_visible: p.email_visible,
                lat: p.lat,
                lng: p.lng,
              }))}
          />
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : grouped.length === 0 ? (
        <EmptyState onOptIn={() => setEditorOpen(true)} />
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, group]) => (
            <section key={key}>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55 mb-2">{key}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.map((p) => (
                  <article key={p.user_id} className="rounded-xl border border-black/10 bg-white p-4">
                    {p.bio && (
                      <p className="text-[13px] text-foreground/80 leading-relaxed line-clamp-4">{p.bio}</p>
                    )}
                    {(p.interests.length > 0 || p.available_for.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.interests.map((t) => (
                          <span key={`i-${t}`} className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {p.available_for.map((t) => (
                          <span key={`a-${t}`} className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11.5px]">
                      {p.phone_visible && p.phone && (
                        <a href={`tel:${p.phone}`} className="text-primary font-semibold hover:underline">{p.phone}</a>
                      )}
                      {p.email_visible && p.email_for_alumni && (
                        <a href={`mailto:${p.email_for_alumni}`} className="text-primary font-semibold hover:underline">{p.email_for_alumni}</a>
                      )}
                      {!p.phone_visible && !p.email_visible && (
                        <span className="text-foreground/45 italic">Contact via Feather chat</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editorOpen && <AlumniProfileEditor onClose={() => setEditorOpen(false)} onSaved={() => void load()} />}
    </div>
  );
}

function EmptyState({ onOptIn }: { onOptIn: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-warm-bg/40 px-6 py-12 text-center">
      <p className="text-3xl mb-3" aria-hidden="true">🗺️</p>
      <h2 className="text-lg font-bold text-foreground">No pins yet.</h2>
      <p className="mt-1 text-[13px] text-foreground/60 max-w-md mx-auto">
        Be the first to put your city on the map. Your profile defaults to private — you decide what other
        alumni see.
      </p>
      <button
        type="button"
        onClick={onOptIn}
        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
      >
        Add me to the map
      </button>
    </div>
  );
}
