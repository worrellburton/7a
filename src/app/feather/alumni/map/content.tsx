'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { soberMilestoneLabel } from '../_components/TimeSoberCard';
import AlumniProfileEditor from '../_components/AlumniProfileEditor';
import { toAvatarThumb } from '@/lib/avatarThumb';

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
  text_ok: boolean;
  sobriety_date: string | null;
  sobriety_public: boolean;
  lat: number | null;
  lng: number | null;
}

// Pretty-print a 10-digit US phone as (858) 201-6210; leave anything
// else untouched so international / extension formats survive.
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return raw;
}

// Glowing tap-to-call phone card — the shared "call me" affordance
// across the alumni map + peer-support surfaces.
function PhoneCard({ phone, size = 'md' }: { phone: string; size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-4 py-2 text-[14px]';
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      onClick={(e) => e.stopPropagation()}
      className={`group/phone inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-white font-bold text-primary tabular-nums shadow-[0_0_16px_-4px_rgba(188,107,74,0.55)] hover:shadow-[0_0_24px_-2px_rgba(188,107,74,0.8)] hover:border-primary/70 transition-all ${pad}`}
      title={`Call ${formatPhone(phone)}`}
    >
      <span aria-hidden className="text-[1.05em] leading-none transition-transform group-hover/phone:scale-110">📞</span>
      <span>{formatPhone(phone)}</span>
    </a>
  );
}

// "Text anytime" affordance — only shown when the alum opted into
// text_ok AND their phone is public. One-tap sms: deep link.
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

export default function AlumniMapContent() {
  const { user, session } = useAuth();
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
  // Which list row is expanded to its full detail dropdown.
  const [expandedPin, setExpandedPin] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Pull pins + each alum's avatar/full_name in one round-trip via
    // a join — the map markers ARE their profile photos.
    const { data } = await supabase
      .from('alumni_profiles')
      .select('user_id, city, state, bio, interests, available_for, phone, email_for_alumni, phone_visible, email_visible, text_ok, sobriety_date, sobriety_public, lat, lng, users:user_id(full_name, avatar_url)')
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
        text_ok: !!row.text_ok,
        sobriety_date: (row.sobriety_date as string | null) ?? null,
        sobriety_public: !!row.sobriety_public,
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

  // Self-heal ungeocoded pins. A profile can end up on_map with a city
  // but no lat/lng (the editor's geocode call failed, or the city was
  // set outside the editor) — those alumni show in the list but land
  // no map pin. When we notice any, fire one sweep at the server-side
  // geocoder and re-fetch. Once per mount, so a city Nominatim can't
  // resolve doesn't loop us forever.
  const healAttemptedRef = useRef(false);
  useEffect(() => {
    if (healAttemptedRef.current || loading || !session?.access_token) return;
    if (!pins.some((p) => p.lat == null && !!p.city)) return;
    healAttemptedRef.current = true;
    void fetch('/api/alumni/geocode-missing', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => { if (r.ok) void load(); })
      .catch(() => { /* next page load retries */ });
  }, [pins, loading, session?.access_token, load]);

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
      <Link href="/feather/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
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

      {/* Interactive map — always rendered, even when nobody is
          geocoded yet, so an alum landing here can see the AZ map
          base and the affordance for what 'turn the toggle on'
          will look like. The list below covers ungeocoded pins +
          screen-reader users. */}
      {!loading && (
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
                text_ok: p.text_ok,
                sobriety_date: p.sobriety_date,
                sobriety_public: p.sobriety_public,
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
              <div className="rounded-xl border border-black/10 bg-white overflow-hidden divide-y divide-black/5">
                {group.map((p) => {
                  const expanded = expandedPin === p.user_id;
                  const initial = (p.full_name || p.city || '?').charAt(0).toUpperCase();
                  const showPhone = p.phone_visible && !!p.phone;
                  const showText = showPhone && p.text_ok;
                  return (
                    <div key={p.user_id}>
                      {/* Collapsed row — click to expand the detail dropdown. */}
                      <button
                        type="button"
                        onClick={() => setExpandedPin((prev) => (prev === p.user_id ? null : p.user_id))}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-warm-bg/40 transition-colors"
                        aria-expanded={expanded}
                      >
                        {p.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={toAvatarThumb(p.avatar_url, 200) ?? p.avatar_url} alt="" referrerPolicy="no-referrer" className="shrink-0 w-11 h-11 rounded-full object-cover ring-1 ring-primary/40" />
                        ) : (
                          <span aria-hidden className="shrink-0 w-11 h-11 rounded-full bg-primary/10 text-primary text-[15px] font-bold ring-1 ring-primary/40 inline-flex items-center justify-center">{initial}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-foreground truncate">{p.full_name || 'Alumni'}</p>
                          <p className="text-[11.5px] text-foreground/55 truncate">
                            {[p.city, p.state].filter(Boolean).join(', ') || 'Location private'}
                            {showText && <span className="ml-1.5 text-emerald-600 font-semibold">· 💬 texts welcome</span>}
                          </p>
                        </div>
                        {showPhone ? (
                          <PhoneCard phone={p.phone as string} size="sm" />
                        ) : (
                          <span className="shrink-0 text-[11px] text-foreground/45 italic">Via Feather chat</span>
                        )}
                        <span aria-hidden className={`shrink-0 ml-1 inline-flex items-center justify-center w-6 h-6 rounded-md border text-foreground/55 transition-transform ${expanded ? 'rotate-180 bg-foreground text-white border-foreground' : 'bg-white border-black/10'}`}>
                          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
                        </span>
                      </button>

                      {/* Expanded detail dropdown. */}
                      {expanded && (
                        <div className="px-4 pb-4 pt-1 bg-warm-bg/25">
                          {p.sobriety_public && soberMilestoneLabel(p.sobriety_date) && (
                            <p className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                              🌱 {soberMilestoneLabel(p.sobriety_date)}
                            </p>
                          )}
                          {p.bio && (
                            <p className="text-[13px] text-foreground/80 leading-relaxed">{p.bio}</p>
                          )}
                          {(p.interests.length > 0 || p.available_for.length > 0) && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {p.interests.map((t) => (
                                <span key={`i-${t}`} className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>
                              ))}
                              {p.available_for.map((t) => (
                                <span key={`a-${t}`} className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {showPhone && <PhoneCard phone={p.phone as string} />}
                            {showText && <TextAnytime phone={p.phone as string} />}
                            {p.email_visible && p.email_for_alumni && (
                              <a
                                href={`mailto:${p.email_for_alumni}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-[12.5px] font-semibold text-foreground/75 hover:bg-warm-bg/60"
                              >
                                ✉️ {p.email_for_alumni}
                              </a>
                            )}
                            {!showPhone && !p.email_visible && (
                              <span className="text-[12px] text-foreground/45 italic">Reach out via Feather chat.</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {pins.length > 0 && <AlumniInsightsPanel pins={pins} />}

      {editorOpen && <AlumniProfileEditor onClose={() => setEditorOpen(false)} onSaved={() => void load()} />}
    </div>
  );
}

// Aggregate stats computed from the on_map pins. Everything is derived
// from the data already loaded for the map + list above — no extra
// round-trips. Updates live as new alumni opt in (the reload triggered
// by the on_map toggle re-runs load() which feeds this).
function AlumniInsightsPanel({ pins }: { pins: AlumniPin[] }) {
  const stats = useMemo(() => {
    const total = pins.length;
    const states = new Set<string>();
    const cities = new Set<string>();
    const stateCounts = new Map<string, number>();
    const availableCounts = new Map<string, number>();
    const interestCounts = new Map<string, number>();
    let phoneCount = 0;
    let textOkCount = 0;
    let emailCount = 0;
    let bioCount = 0;
    let withSobrietyDate = 0;
    let totalSoberDays = 0;
    const todayMs = Date.now();
    for (const p of pins) {
      if (p.state) {
        states.add(p.state);
        stateCounts.set(p.state, (stateCounts.get(p.state) ?? 0) + 1);
      }
      if (p.city) cities.add(`${p.city}|${p.state ?? ''}`);
      for (const t of p.available_for) availableCounts.set(t, (availableCounts.get(t) ?? 0) + 1);
      for (const t of p.interests) interestCounts.set(t, (interestCounts.get(t) ?? 0) + 1);
      if (p.phone_visible && p.phone) phoneCount += 1;
      if (p.phone_visible && p.phone && p.text_ok) textOkCount += 1;
      if (p.email_visible && p.email_for_alumni) emailCount += 1;
      if (p.bio && p.bio.trim().length > 0) bioCount += 1;
      if (p.sobriety_date) {
        const t = Date.parse(p.sobriety_date);
        if (Number.isFinite(t) && t <= todayMs) {
          withSobrietyDate += 1;
          totalSoberDays += Math.floor((todayMs - t) / 86_400_000);
        }
      }
    }
    const topStates = Array.from(stateCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topAvailable = Array.from(availableCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const topInterests = Array.from(interestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const totalSoberYears = totalSoberDays / 365.25;
    return {
      total,
      stateCount: states.size,
      cityCount: cities.size,
      topStates,
      topAvailable,
      topInterests,
      phoneCount,
      textOkCount,
      emailCount,
      bioCount,
      withSobrietyDate,
      totalSoberYears,
    };
  }, [pins]);

  const pct = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);

  return (
    <section className="mt-10 mb-4">
      <div className="mb-4 flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          By the numbers.
        </h2>
        <p className="text-[11.5px] text-foreground/55">Live from the pins above — updates as alumni opt in.</p>
      </div>

      {/* Hero stats — the headline numbers. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <HeroStat label="On the map" value={stats.total} sub={stats.total === 1 ? 'alum' : 'alumni'} tone="primary" />
        <HeroStat label="States" value={stats.stateCount} sub={stats.stateCount === 1 ? 'state represented' : 'states represented'} />
        <HeroStat label="Cities" value={stats.cityCount} sub={stats.cityCount === 1 ? 'city' : 'cities'} />
        {stats.withSobrietyDate > 0 ? (
          <HeroStat
            label="Combined sobriety"
            value={Math.round(stats.totalSoberYears)}
            sub={`years across ${stats.withSobrietyDate} alum${stats.withSobrietyDate === 1 ? '' : 'ni'}`}
            tone="emerald"
          />
        ) : (
          <HeroStat
            label="Open to texts"
            value={stats.textOkCount}
            sub={`${pct(stats.textOkCount)}% of the map`}
            tone="emerald"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Geographic spread. */}
        <article className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45 mb-2">Where alumni are</p>
          {stats.topStates.length === 0 ? (
            <p className="text-[12px] text-foreground/45 italic">No states recorded yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {stats.topStates.map(([state, count]) => (
                <BarRow key={state} label={state} value={count} max={stats.total} />
              ))}
            </ul>
          )}
        </article>

        {/* What alumni are available for. */}
        <article className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45 mb-2">Most offered support</p>
          {stats.topAvailable.length === 0 ? (
            <p className="text-[12px] text-foreground/45 italic">No availability tags selected yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {stats.topAvailable.map(([tag, count]) => (
                <BarRow key={tag} label={tag} value={count} max={stats.total} tone="emerald" />
              ))}
            </ul>
          )}
        </article>

        {/* Recovery program / interest mix. */}
        <article className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45 mb-2">Top recovery programs</p>
          {stats.topInterests.length === 0 ? (
            <p className="text-[12px] text-foreground/45 italic">No programs / interests selected yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {stats.topInterests.map(([tag, count]) => (
                <BarRow key={tag} label={tag} value={count} max={stats.total} tone="primary" />
              ))}
            </ul>
          )}
        </article>
      </div>

      {/* Reachability strip — who you can actually contact. */}
      <article className="mt-3 rounded-2xl border border-black/10 bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45 mb-2">How alumni are reachable</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ReachStat label="Phone listed" value={stats.phoneCount} pct={pct(stats.phoneCount)} />
          <ReachStat label="Open to texts" value={stats.textOkCount} pct={pct(stats.textOkCount)} tone="emerald" />
          <ReachStat label="Email listed" value={stats.emailCount} pct={pct(stats.emailCount)} />
          <ReachStat label="Wrote a bio" value={stats.bioCount} pct={pct(stats.bioCount)} />
        </div>
      </article>
    </section>
  );
}

function HeroStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: 'primary' | 'emerald';
}) {
  const valueClass =
    tone === 'primary' ? 'text-primary' : tone === 'emerald' ? 'text-emerald-700' : 'text-foreground';
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${valueClass}`} style={{ fontFamily: 'var(--font-display)' }}>
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-[11px] text-foreground/55 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone?: 'emerald' | 'primary';
}) {
  const pctNum = max > 0 ? Math.round((value / max) * 100) : 0;
  const fill =
    tone === 'emerald' ? 'bg-emerald-500/70' : tone === 'primary' ? 'bg-primary/70' : 'bg-foreground/40';
  return (
    <li className="flex items-center gap-3">
      <span className="text-[12px] text-foreground/80 flex-1 min-w-0 truncate">{label}</span>
      <div className="relative h-2 w-28 sm:w-32 rounded-full bg-foreground/[0.06] overflow-hidden">
        <span className={`absolute inset-y-0 left-0 ${fill} rounded-full`} style={{ width: `${pctNum}%` }} />
      </div>
      <span className="shrink-0 text-[11.5px] text-foreground/60 tabular-nums w-10 text-right">{value}</span>
    </li>
  );
}

function ReachStat({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone?: 'emerald';
}) {
  const valueClass = tone === 'emerald' ? 'text-emerald-700' : 'text-foreground';
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${valueClass}`} style={{ fontFamily: 'var(--font-display)' }}>
        {value}
        <span className="ml-1 text-[11px] font-medium text-foreground/45">· {pct}%</span>
      </p>
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
