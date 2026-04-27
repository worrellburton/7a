'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

// Canonical NAP / business info, the team's source of truth when
// filling out directory listings, Google Business Profile, etc.
//
// Backed by public.business_info (singleton row keyed by
// id='singleton'). Every field saves on blur straight to Supabase
// and a realtime subscription keeps two simultaneous editors in
// sync. No localStorage anywhere — same cloud-first model as
// directories + recent activity.

interface BusinessInfo {
  id: string;
  business_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  website_url: string | null;
  hours: string | null;
  business_category: string | null;
  description: string | null;
  logo_url: string | null;
  photo_urls: string[];
  video_urls: string[];
  reviews_url: string | null;
  attributes: string[];
  updated_at: string | null;
  updated_by: string | null;
}

const EMPTY: BusinessInfo = {
  id: 'singleton',
  business_name: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  country: 'United States',
  phone: null,
  website_url: null,
  hours: null,
  business_category: null,
  description: null,
  logo_url: null,
  photo_urls: [],
  video_urls: [],
  reviews_url: null,
  attributes: [],
  updated_at: null,
  updated_by: null,
};

const SELECT = 'id, business_name, address_line1, address_line2, city, state, postal_code, country, phone, website_url, hours, business_category, description, logo_url, photo_urls, video_urls, reviews_url, attributes, updated_at, updated_by';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function InformationContent() {
  const { user, session } = useAuth();
  const [info, setInfo] = useState<BusinessInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    (async () => {
      const rows = await db({
        action: 'select',
        table: 'business_info',
        select: SELECT,
      }).catch(() => null);
      if (cancelled) return;
      const row = Array.isArray(rows) && rows.length > 0
        ? (rows[0] as BusinessInfo)
        : null;
      if (row) setInfo({ ...EMPTY, ...row, photo_urls: row.photo_urls ?? [], video_urls: row.video_urls ?? [], attributes: row.attributes ?? [] });
      setLoading(false);
    })();

    const channel = supabase
      .channel('business-info')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_info' }, (payload) => {
        if (payload.eventType === 'DELETE') return;
        const row = payload.new as BusinessInfo;
        if (row.id !== 'singleton') return;
        setInfo({ ...EMPTY, ...row, photo_urls: row.photo_urls ?? [], video_urls: row.video_urls ?? [], attributes: row.attributes ?? [] });
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session]);

  const save = useCallback(async (patch: Partial<BusinessInfo>) => {
    if (!user?.id) return;
    setSaveState('saving');
    const next = { ...info, ...patch };
    setInfo(next);
    const payload: Record<string, unknown> = {
      id: 'singleton',
      ...patch,
      updated_by: user.id,
    };
    const ok = await db({
      action: 'upsert',
      table: 'business_info',
      data: [payload],
      onConflict: 'id',
    }).catch(() => null);
    if (ok) {
      setSaveState('saved');
      setSavedAt(Date.now());
      window.setTimeout(() => {
        setSaveState((s) => (s === 'saved' ? 'idle' : s));
      }, 1800);
    } else {
      setSaveState('error');
    }
  }, [info, user?.id]);

  // Address preview — what the team typically pastes into a directory
  // submission. Blank parts collapse cleanly.
  const fullAddress = useMemo(() => {
    const street = [info.address_line1, info.address_line2].filter(Boolean).join(', ');
    const cityLine = [info.city, [info.state, info.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return [street, cityLine, info.country].filter(Boolean).join(' · ');
  }, [info]);

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/app/seo"
              className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              SEO
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Information
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Canonical business info — the team&apos;s source of truth when
            filling out directory listings, Google Business Profile, and
            any third-party form. Every field saves to the cloud on
            blur and syncs across the team in real time.
          </p>
        </div>
        <SaveIndicator state={saveState} savedAt={savedAt} />
      </header>

      <SeoSubNav />

      {loading ? (
        <p className="text-sm text-foreground/50">Loading…</p>
      ) : (
        <div className="space-y-6">
          <Section
            title="NAP data"
            blurb="Business name, address, and phone — the trio every directory asks for. Keep these identical across every listing so Google reads them as one consistent business."
          >
            <Field label="Business name" value={info.business_name} onSave={(v) => save({ business_name: v })} placeholder="Seven Arrows Recovery" />
            <Field label="Phone number" value={info.phone} onSave={(v) => save({ phone: v })} placeholder="(555) 123-4567" />
            <Field label="Address line 1" value={info.address_line1} onSave={(v) => save({ address_line1: v })} placeholder="123 Main Street" />
            <Field label="Address line 2" value={info.address_line2} onSave={(v) => save({ address_line2: v })} placeholder="Suite 200" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="City" value={info.city} onSave={(v) => save({ city: v })} placeholder="Phoenix" />
              <Field label="State" value={info.state} onSave={(v) => save({ state: v })} placeholder="AZ" />
              <Field label="Postal code" value={info.postal_code} onSave={(v) => save({ postal_code: v })} placeholder="85001" />
            </div>
            <Field label="Country" value={info.country} onSave={(v) => save({ country: v })} placeholder="United States" />
            {fullAddress && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <span className="font-semibold uppercase tracking-wider text-[10px] mr-2">Preview</span>
                {fullAddress}
              </div>
            )}
          </Section>

          <Section
            title="Essential info"
            blurb="Website URL, hours of operation, and business category. These three drive how a listing actually surfaces in search."
          >
            <Field label="Website URL" value={info.website_url} onSave={(v) => save({ website_url: v })} placeholder="https://www.sevenarrowsrecoveryarizona.com" />
            <Field label="Hours of operation" value={info.hours} onSave={(v) => save({ hours: v })} placeholder="Mon-Fri 9-5, Sat 10-2" multiline />
            <Field label="Business category" value={info.business_category} onSave={(v) => save({ business_category: v })} placeholder="Addiction Treatment Center" />
            <Field label="Short description" value={info.description} onSave={(v) => save({ description: v })} placeholder="One-paragraph blurb for 'About' fields. Mirror what's on the homepage hero." multiline />
          </Section>

          <Section
            title="Rich media & engagement"
            blurb="Photos, logos, videos, and where customers leave reviews. One URL per line — paste from Supabase storage, the public site, or wherever the asset already lives."
          >
            <Field label="Logo URL" value={info.logo_url} onSave={(v) => save({ logo_url: v })} placeholder="https://…/logo.png" />
            <ListField
              label="Photo URLs"
              values={info.photo_urls}
              onSave={(v) => save({ photo_urls: v })}
              placeholder={'One URL per line\nhttps://…/exterior.jpg\nhttps://…/lobby.jpg'}
            />
            <ListField
              label="Video URLs"
              values={info.video_urls}
              onSave={(v) => save({ video_urls: v })}
              placeholder={'One URL per line\nhttps://youtube.com/watch?v=…'}
            />
            <Field label="Reviews URL" value={info.reviews_url} onSave={(v) => save({ reviews_url: v })} placeholder="https://g.page/r/…" />
          </Section>

          <Section
            title="Attributes"
            blurb="Service attributes Google Business Profile and many directories surface as filterable tags (e.g. wheelchair accessible, woman-owned). One per line."
          >
            <ListField
              label="Attributes"
              values={info.attributes}
              onSave={(v) => save({ attributes: v })}
              placeholder={'One attribute per line\nWheelchair accessible\nVeteran-owned\nLGBTQ+ friendly'}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title, blurb, children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
        <p className="text-xs text-foreground/55 mt-1 max-w-2xl">{blurb}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label, value, onSave, placeholder, multiline = false,
}: {
  label: string;
  value: string | null;
  onSave: (next: string | null) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  // Local draft mirrors `value` and only escapes via onSave on blur
  // (or Cmd-Enter for the multiline variant). Avoids hammering
  // Supabase on every keystroke.
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const commit = () => {
    const next = draft.trim();
    if ((next || null) === (value ?? null)) return;
    onSave(next || null);
  };

  const inputClass = 'w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40';

  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55 mb-1 block">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              commit();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          rows={3}
          placeholder={placeholder}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </label>
  );
}

function ListField({
  label, values, onSave, placeholder,
}: {
  label: string;
  values: string[];
  onSave: (next: string[]) => void;
  placeholder?: string;
}) {
  // Internally edited as a newline-separated string; saved as an
  // array. Empty lines collapse so the array stays clean.
  const [draft, setDraft] = useState((values ?? []).join('\n'));
  useEffect(() => { setDraft((values ?? []).join('\n')); }, [values]);

  const commit = () => {
    const next = draft
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (arraysEqual(next, values ?? [])) return;
    onSave(next);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
          {label}
        </span>
        <span className="text-[10px] text-foreground/40">
          {values.length} {values.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={Math.max(3, Math.min(8, draft.split('\n').length))}
        placeholder={placeholder}
        className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 resize-y font-mono"
      />
    </div>
  );
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: number | null }) {
  const [, force] = useState(0);
  // Re-render every 30s so the "saved 2m ago" stamp ages in place.
  useEffect(() => {
    if (state !== 'idle' || !savedAt) return;
    const id = window.setInterval(() => force((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, [state, savedAt]);

  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/55">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Saving…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Saved
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-700">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Save failed — try again
      </span>
    );
  }
  if (savedAt) {
    const mins = Math.floor((Date.now() - savedAt) / 60000);
    const stamp = mins < 1 ? 'just now' : `${mins}m ago`;
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/45">
        <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
        Saved {stamp}
      </span>
    );
  }
  return null;
}
