'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

// Single tabbed page combining the four formerly-separate Website
// Requests views (Overview · VObs · Forms · Careers). Tab state is
// reflected in ?tab=… so admins can deep-link / refresh and stay on
// the same view.
//
// Each tab does its own data fetch on activation; the lists are
// small enough that there's no value in pre-fetching all four.

type Tab = 'overview' | 'vobs' | 'forms' | 'careers';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'vobs', label: 'VObs' },
  { id: 'forms', label: 'Forms' },
  { id: 'careers', label: 'Careers' },
];

function isTab(v: string | null): v is Tab {
  return v === 'overview' || v === 'vobs' || v === 'forms' || v === 'careers';
}

export default function WebsiteRequestsContent() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params?.get('tab') ?? null;
  const initial: Tab = isTab(requested) ? requested : 'overview';
  const [tab, setTab] = useState<Tab>(initial);

  function selectTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Website Requests
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Submissions from every form on the public site.
        </p>
      </header>

      <div className="mb-5 flex gap-1 border-b border-black/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'text-primary border-primary'
                : 'text-foreground/60 border-transparent hover:text-foreground hover:border-foreground/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewPanel onJump={selectTab} />}
      {tab === 'vobs' && <VobsPanel />}
      {tab === 'forms' && <FormsPanel />}
      {tab === 'careers' && <CareersPanel />}
    </div>
  );
}

// ------------- Overview ----------------------------------------------------

interface RecentVob {
  id: string;
  full_name: string;
  insurance_provider: string | null;
  status: string;
  received_at: string;
}
interface RecentForm {
  id: string;
  source: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
}
interface OverviewData {
  vobs: { total: number; new: number; recent: RecentVob[] };
  forms: { total: number; new: number; recent: RecentForm[] };
}

function OverviewPanel({ onJump }: { onJump: (t: Tab) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website-requests/overview', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OverviewData;
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="text-sm text-red-600">Error: {error}</p>;
  if (!data) return <p className="text-sm text-foreground/50">Loading…</p>;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <CategoryCard
        title="VObs"
        onClick={() => onJump('vobs')}
        description="Insurance verification requests from the admissions form."
        total={data.vobs.total}
        newCount={data.vobs.new}
        tone="amber"
        recent={data.vobs.recent.map((r) => ({
          id: r.id,
          line1: r.full_name,
          line2: r.insurance_provider ?? '(no insurance listed)',
          ts: r.received_at,
        }))}
      />
      <CategoryCard
        title="Forms"
        onClick={() => onJump('forms')}
        description="Contact, footer, and exit-intent submissions from the public site."
        total={data.forms.total}
        newCount={data.forms.new}
        tone="blue"
        recent={data.forms.recent.map((r) => ({
          id: r.id,
          line1: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || '(no name)',
          line2: `${r.source ?? 'unknown source'}${r.email && (r.first_name || r.last_name) ? ` · ${r.email}` : ''}`,
          ts: r.created_at,
        }))}
      />
    </div>
  );
}

interface RecentItem { id: string; line1: string; line2: string; ts: string; }

function CategoryCard({
  title, onClick, description, total, newCount, recent, tone,
}: {
  title: string; onClick: () => void; description: string;
  total: number; newCount: number; recent: RecentItem[]; tone: 'amber' | 'blue';
}) {
  const accent = tone === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200';
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-black/10 bg-white p-5 hover:border-primary/40 transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
          <p className="text-xs text-foreground/60 mt-0.5">{description}</p>
        </div>
        {newCount > 0 && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${accent}`}>
            {newCount} new
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{total}</span>
        <span className="text-xs text-foreground/50">total</span>
      </div>
      {recent.length > 0 ? (
        <ul className="space-y-2 flex-1">
          {recent.map((r) => (
            <li key={r.id} className="text-xs flex items-center justify-between gap-3 border-t border-black/5 pt-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground/85 truncate">{r.line1}</p>
                <p className="text-foreground/50 truncate">{r.line2}</p>
              </div>
              <span className="text-foreground/40 flex-shrink-0">
                {new Date(r.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-foreground/50 italic">No submissions yet.</p>
      )}
      <p className="text-xs text-primary font-semibold mt-4">Open {title} →</p>
    </button>
  );
}

// ------------- VObs --------------------------------------------------------

interface VobRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  insurance_provider: string | null;
  status: string;
  notes: string | null;
  received_at: string;
  card_front_url: string | null;
  card_back_url: string | null;
}

function VobsPanel() {
  const [rows, setRows] = useState<VobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website-requests/vobs', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.rows ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Section count={rows.length} loading={loading} error={error} emptyText="No VOB requests yet.">
      <ul className="divide-y divide-black/5 border border-black/10 rounded-xl bg-white overflow-hidden">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{r.full_name}</p>
                <p className="text-xs text-foreground/60 mt-0.5">
                  {r.phone}{r.phone && r.email && ' · '}{r.email}
                </p>
                {r.insurance_provider && (
                  <p className="text-sm text-foreground/80 mt-1">
                    Insurance: <span className="font-medium">{r.insurance_provider}</span>
                  </p>
                )}
                {r.notes && <p className="text-sm text-foreground/70 mt-1">{r.notes}</p>}
                {(r.card_front_url || r.card_back_url) && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      Insurance Card
                    </p>
                    {r.card_front_url && <CardThumb url={r.card_front_url} label="Front" />}
                    {r.card_back_url && <CardThumb url={r.card_back_url} label="Back" />}
                  </div>
                )}
              </div>
              <RowMeta status={r.status} ts={r.received_at} />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ------------- Forms (non-careers contact submissions) --------------------

interface FormRow {
  id: string;
  source: 'contact_page' | 'footer' | 'exit_intent' | 'careers' | 'other' | null;
  first_name: string | null;
  last_name: string | null;
  telephone: string | null;
  email: string | null;
  message: string | null;
  payment_method: string | null;
  consent: boolean;
  page_url: string | null;
  referrer: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

type FormSourceFilter = 'all' | 'contact_page' | 'footer' | 'exit_intent' | 'other';
const FORM_SOURCE_LABELS: Record<Exclude<FormSourceFilter, 'all'>, string> = {
  contact_page: 'Contact Page',
  footer: 'Footer',
  exit_intent: 'Exit Intent',
  other: 'Other',
};

function FormsPanel() {
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FormSourceFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website-requests/forms', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.rows ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.source === filter)),
    [rows, filter],
  );

  return (
    <Section count={rows.length} loading={loading} error={error} emptyText="No submissions yet.">
      <div className="mb-3 flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-foreground/50 mr-1">Source:</span>
        {(['all', 'contact_page', 'footer', 'exit_intent', 'other'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filter === v
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-foreground/70 border-black/10 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {v === 'all' ? 'All' : FORM_SOURCE_LABELS[v]}
          </button>
        ))}
      </div>

      {visible.length === 0 && filter !== 'all' && (
        <p className="text-sm text-foreground/50">No submissions match the current filter.</p>
      )}

      {visible.length > 0 && (
        <ul className="divide-y divide-black/5 border border-black/10 rounded-xl bg-white overflow-hidden">
          {visible.map((r) => {
            const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '(no name)';
            return (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{fullName}</p>
                      {r.source && r.source !== 'careers' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-200">
                          {FORM_SOURCE_LABELS[r.source as Exclude<FormSourceFilter, 'all'>] ?? r.source}
                        </span>
                      )}
                      {r.payment_method && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200">
                          {r.payment_method}
                        </span>
                      )}
                      {r.source === 'footer' && !r.consent && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-red-50 text-red-700 border-red-200">
                          No consent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      {r.telephone}{r.telephone && r.email && ' · '}{r.email}
                    </p>
                    {r.message && (
                      <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{r.message}</p>
                    )}
                    {(r.page_url || r.referrer) && (
                      <p className="text-[11px] text-foreground/40 mt-1 truncate">
                        {r.page_url ? `From: ${r.page_url}` : `Referrer: ${r.referrer}`}
                      </p>
                    )}
                  </div>
                  <RowMeta status={r.status} ts={r.created_at} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// ------------- Careers ----------------------------------------------------

function trackFromMessage(message: string | null): { track: string | null; rest: string } {
  if (!message) return { track: null, rest: '' };
  const m = message.match(/^\[([^\]]+)\]\s*\n*([\s\S]*)$/);
  if (!m) return { track: null, rest: message };
  return { track: m[1], rest: m[2].trim() };
}

function CareersPanel() {
  const [rows, setRows] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website-requests/careers', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRows(data.rows ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Section count={rows.length} loading={loading} error={error} emptyText="No careers submissions yet.">
      <ul className="divide-y divide-black/5 border border-black/10 rounded-xl bg-white overflow-hidden">
        {rows.map((r) => {
          const { track, rest } = trackFromMessage(r.message);
          const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '(no name)';
          return (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{fullName}</p>
                    {track && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-200">
                        {track}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    {r.email && <Link className="underline decoration-dotted" href={`mailto:${r.email}`}>{r.email}</Link>}
                  </p>
                  {rest && (
                    <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{rest}</p>
                  )}
                </div>
                <RowMeta status={r.status} ts={r.created_at} />
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// ------------- Shared bits -------------------------------------------------

function Section({
  count, loading, error, emptyText, children,
}: {
  count: number; loading: boolean; error: string | null;
  emptyText: string; children: React.ReactNode;
}) {
  if (loading) return <p className="text-sm text-foreground/50">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">Error: {error}</p>;
  if (count === 0) return <p className="text-sm text-foreground/50">{emptyText}</p>;
  return <>{children}</>;
}

function CardThumb({ url, label }: { url: string; label: string }) {
  // Render a small clickable thumbnail. Storage signed URLs include a
  // `?token=...` query string; PDFs (no image preview) get a generic
  // file glyph instead of a broken image.
  const isPdf = /\.pdf(\?|$)/i.test(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${label.toLowerCase()} of card`}
      className="group inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-1.5 py-1 text-[11px] font-medium text-foreground/70 hover:border-primary/40 hover:text-primary transition-colors"
    >
      {isPdf ? (
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4a1 1 0 001 1h4M5 21V5a2 2 0 012-2h8l5 5v13a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
        </svg>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${label} of insurance card`}
          className="w-8 h-6 rounded-sm object-cover bg-warm-bg"
          loading="lazy"
        />
      )}
      {label}
    </a>
  );
}

function RowMeta({ status, ts }: { status: string; ts: string }) {
  const tone = status === 'new'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : status === 'contacted' || status === 'verified'
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <div className="text-right flex-shrink-0">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${tone}`}>
        {status}
      </span>
      <p className="text-[11px] text-foreground/50 mt-1">
        {new Date(ts).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })}
      </p>
    </div>
  );
}
