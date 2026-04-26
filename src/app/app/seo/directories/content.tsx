'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

// Off-site directory tracker. Listings here are places Seven Arrows
// should claim, monitor, or submit to in order to grow domain
// authority + brand reach. The 100 entries are filled in across
// Phases 2-10 of this build; Phase 1 lays down the scaffolding so
// later phases can append entries without touching layout.
//
// Status is tracked per directory in localStorage so the team can
// share progress on a single laptop without us having to wire a DB
// table. The key is "sa-seo-directories:status" → Record<id, Status>.

export type DirectoryCategory =
  | 'national'        // SAMHSA, Psychology Today, etc.
  | 'insurance'       // BCBS, Aetna, Cigna provider directories
  | 'mental_health'   // GoodTherapy, NAMI
  | 'healthcare'      // Healthgrades, Vitals
  | 'review'          // Google Business, Yelp
  | 'arizona'         // AHCCCS, AZDHS, local
  | 'recovery'        // In The Rooms, Sober Recovery
  | 'specialty'       // LGBTQ, veterans, dual-dx
  | 'professional'    // NAATP, NAADAC, ASAM
  | 'business';       // LinkedIn, BBB, Crunchbase

export interface Directory {
  id: string;
  name: string;
  url: string;
  category: DirectoryCategory;
  /** Why this listing matters in one sentence. */
  why: string;
  /** Rough priority for sequencing the team's outreach. */
  priority: 'high' | 'medium' | 'low';
}

const CATEGORY_LABELS: Record<DirectoryCategory, string> = {
  national: 'National addiction treatment',
  insurance: 'Insurance provider networks',
  mental_health: 'Mental health directories',
  healthcare: 'Healthcare / clinician directories',
  review: 'Review platforms + local business',
  arizona: 'Arizona-specific',
  recovery: 'Recovery community + sober living',
  specialty: 'Specialty (LGBTQ, veterans, dual-dx)',
  professional: 'Professional + accreditation',
  business: 'General business + brand',
};

const CATEGORY_ORDER: DirectoryCategory[] = [
  'national',
  'insurance',
  'mental_health',
  'healthcare',
  'review',
  'arizona',
  'recovery',
  'specialty',
  'professional',
  'business',
];

// Filled across Phases 2-10. Each phase appends ~10 entries with
// real submission URLs, never placeholders.
export const DIRECTORIES: Directory[] = [
  // ── Phase 2: National addiction treatment ───────────────────────
  {
    id: 'samhsa-findtreatment',
    name: 'SAMHSA Treatment Locator',
    url: 'https://findtreatment.gov/',
    category: 'national',
    why: 'Federal directory used by hospitals, EAPs, and 211 referrals. Highest authority listing in the addiction space.',
    priority: 'high',
  },
  {
    id: 'psychology-today-rehab',
    name: 'Psychology Today — Treatment Centers',
    url: 'https://www.psychologytoday.com/us/treatment-rehab',
    category: 'national',
    why: 'High-traffic, paid listing. Generates qualified inquiries from people specifically searching for residential care.',
    priority: 'high',
  },
  {
    id: 'recovery-org',
    name: 'Recovery.org',
    url: 'https://www.recovery.org/treatment-centers/',
    category: 'national',
    why: 'AAC-owned but lets independent centers claim listings. Decent referral volume from organic search.',
    priority: 'high',
  },
  {
    id: 'rehab-com',
    name: 'Rehab.com',
    url: 'https://www.rehab.com/',
    category: 'national',
    why: 'High DA rehab finder with editor-reviewed listings; profile claim is free.',
    priority: 'high',
  },
  {
    id: 'addiction-center',
    name: 'AddictionCenter.com',
    url: 'https://www.addictioncenter.com/treatment/',
    category: 'national',
    why: 'Editorial-style directory. Backlinks from category and condition pages help topical authority.',
    priority: 'high',
  },
  {
    id: 'rehabs-com',
    name: 'Rehabs.com',
    url: 'https://www.rehabs.com/',
    category: 'national',
    why: 'AAC-owned. Free profile, paid premium. Strong organic visibility for state + condition queries.',
    priority: 'medium',
  },
  {
    id: 'detox-com',
    name: 'Detox.com',
    url: 'https://detox.com/',
    category: 'national',
    why: 'Niche directory targeting detox-stage searchers. Useful since we admit people coming off active use.',
    priority: 'medium',
  },
  {
    id: 'rehabcenter-net',
    name: 'RehabCenter.net',
    url: 'https://www.rehabcenter.net/',
    category: 'national',
    why: 'Long-running rehab directory with editorial reviews and state landing pages.',
    priority: 'medium',
  },
  {
    id: 'thefix',
    name: 'The Fix — Rehab Reviews',
    url: 'https://www.thefix.com/rehab-reviews',
    category: 'national',
    why: 'Trusted recovery-journalism brand. Reviews can drive qualified traffic and earn editorial backlinks.',
    priority: 'medium',
  },
  {
    id: 'rehabspot',
    name: 'RehabSpot',
    url: 'https://www.rehabspot.com/',
    category: 'national',
    why: 'Substance-specific landing pages plus state filters. Free claim available.',
    priority: 'medium',
  },
  {
    id: 'addiction-resource',
    name: 'AddictionResource.net',
    url: 'https://www.addictionresource.net/',
    category: 'national',
    why: 'Editorial directory with strong organic rankings on state-level rehab queries.',
    priority: 'medium',
  },
  {
    id: 'ncadd',
    name: 'NCADD Treatment Search',
    url: 'https://www.ncadd.org/get-help/find-help',
    category: 'national',
    why: 'National Council on Alcoholism and Drug Dependence. Lower traffic but high credibility for the field.',
    priority: 'low',
  },
];

// ── Status tracking ────────────────────────────────────────────────

type Status = 'todo' | 'pending' | 'listed' | 'skip';

const STATUS_KEY = 'sa-seo-directories:status';

const STATUS_LABELS: Record<Status, string> = {
  todo: 'To do',
  pending: 'Submitted',
  listed: 'Listed',
  skip: 'Skip',
};

const STATUS_TONE: Record<Status, string> = {
  todo: 'bg-warm-bg/60 text-foreground/65 border-black/10 hover:bg-warm-bg',
  pending: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
  listed: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
  skip: 'bg-foreground/5 text-foreground/40 border-black/10 line-through hover:bg-foreground/10',
};

const STATUS_CYCLE: Record<Status, Status> = {
  todo: 'pending',
  pending: 'listed',
  listed: 'skip',
  skip: 'todo',
};

function useStatusMap(): [Record<string, Status>, (id: string) => void] {
  const [map, setMap] = useState<Record<string, Status>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STATUS_KEY);
      if (raw) setMap(JSON.parse(raw));
    } catch {
      /* corrupt JSON — ignore, the team can just re-mark. */
    }
  }, []);

  const cycle = (id: string) => {
    setMap((prev) => {
      const current = prev[id] ?? 'todo';
      const next = STATUS_CYCLE[current];
      // Never persist the default — keeps localStorage tidy.
      const updated = { ...prev };
      if (next === 'todo') delete updated[id];
      else updated[id] = next;
      try {
        window.localStorage.setItem(STATUS_KEY, JSON.stringify(updated));
      } catch {
        /* quota — non-fatal. */
      }
      return updated;
    });
  };

  return [map, cycle];
}

// ── UI ─────────────────────────────────────────────────────────────

const PRIORITY_TONE: Record<Directory['priority'], string> = {
  high: 'bg-primary/10 text-primary border-primary/20',
  medium: 'bg-foreground/5 text-foreground/70 border-black/10',
  low: 'bg-foreground/5 text-foreground/45 border-black/5',
};

export default function DirectoriesContent() {
  const [statusMap, cycleStatus] = useStatusMap();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<DirectoryCategory | 'all'>('all');
  const [hideListed, setHideListed] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DIRECTORIES.filter((d) => {
      if (activeCategory !== 'all' && d.category !== activeCategory) return false;
      if (hideListed && (statusMap[d.id] === 'listed' || statusMap[d.id] === 'skip')) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.why.toLowerCase().includes(q) ||
        d.url.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory, hideListed, statusMap]);

  const grouped = useMemo(() => {
    const out: Partial<Record<DirectoryCategory, Directory[]>> = {};
    for (const d of filtered) {
      (out[d.category] ||= []).push(d);
    }
    return out;
  }, [filtered]);

  const total = DIRECTORIES.length;
  const listed = DIRECTORIES.filter((d) => statusMap[d.id] === 'listed').length;
  const pending = DIRECTORIES.filter((d) => statusMap[d.id] === 'pending').length;

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
            Directories
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Off-site listings the team should claim, monitor, or submit
            to. Each one builds domain authority, brand reach, or both.
            Click a status pill to cycle through To do → Submitted →
            Listed → Skip. Status saves locally in this browser.
          </p>
        </div>
      </header>

      <SeoSubNav />

      {/* Progress strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <ProgressCard label="Total" value={total} />
        <ProgressCard label="Listed" value={listed} accent="emerald" />
        <ProgressCard label="Submitted" value={pending} accent="amber" />
        <ProgressCard
          label="To do"
          value={Math.max(0, total - listed - pending - DIRECTORIES.filter((d) => statusMap[d.id] === 'skip').length)}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search directories…"
          className="text-sm rounded-md border border-black/10 bg-white px-3 py-2 w-72 max-w-full"
        />
        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value as DirectoryCategory | 'all')}
          className="text-sm rounded-md border border-black/10 bg-white px-3 py-2"
        >
          <option value="all">All categories</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-xs text-foreground/70">
          <input
            type="checkbox"
            checked={hideListed}
            onChange={(e) => setHideListed(e.target.checked)}
          />
          Hide Listed / Skip
        </label>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>No directories loaded yet.</strong> The list is being built
          out across phases — entries appear here as each phase ships.
        </div>
      ) : null}

      {CATEGORY_ORDER.map((cat) => {
        const rows = grouped[cat] ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={cat} className="mb-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/45 mb-3">
              {CATEGORY_LABELS[cat]}
              <span className="ml-2 font-normal tracking-normal normal-case text-foreground/35">
                · {rows.length}
              </span>
            </h2>
            <div className="overflow-hidden border border-black/10 rounded-xl bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/50 text-[11px] uppercase tracking-wider text-foreground/55">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10">Directory</th>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10">Why</th>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10 w-24">Priority</th>
                    <th className="text-right px-4 py-2.5 font-semibold border-b border-black/10 w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {rows.map((d) => {
                    const status = statusMap[d.id] ?? 'todo';
                    return (
                      <tr key={d.id} className="align-top">
                        <td className="px-4 py-3">
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-primary hover:underline"
                          >
                            {d.name}
                          </a>
                          <p className="text-[11px] text-foreground/40 truncate max-w-[280px]" title={d.url}>
                            {d.url.replace(/^https?:\/\//, '')}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-foreground/70 text-[13px] leading-relaxed">{d.why}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${PRIORITY_TONE[d.priority]}`}>
                            {d.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => cycleStatus(d.id)}
                            title="Cycle status"
                            className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${STATUS_TONE[status]}`}
                          >
                            {STATUS_LABELS[status]}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProgressCard({
  label, value, accent,
}: { label: string; value: number; accent?: 'emerald' | 'amber' }) {
  const color =
    accent === 'emerald' ? 'text-emerald-600'
    : accent === 'amber' ? 'text-amber-600'
    : 'text-foreground';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
    </div>
  );
}
