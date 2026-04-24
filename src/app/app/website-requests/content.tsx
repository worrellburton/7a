'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

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

export default function OverviewContent() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) return;
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  if (!user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Website Requests
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Submissions from every form on the public site. Drill into a category to triage.
        </p>
      </header>

      {loading && <p className="text-sm text-foreground/50">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {data && (
        <div className="grid sm:grid-cols-2 gap-4">
          <CategoryCard
            title="VObs"
            href="/app/website-requests/vobs"
            description="Insurance verification requests from the admissions form."
            total={data.vobs.total}
            newCount={data.vobs.new}
            tone="amber"
            recent={data.vobs.recent.map((r) => ({
              id: r.id,
              line1: r.full_name,
              line2: r.insurance_provider ?? '(no insurance listed)',
              status: r.status,
              ts: r.received_at,
            }))}
          />
          <CategoryCard
            title="Forms"
            href="/app/website-requests/forms"
            description="Contact, footer, and exit-intent submissions from the public site."
            total={data.forms.total}
            newCount={data.forms.new}
            tone="blue"
            recent={data.forms.recent.map((r) => ({
              id: r.id,
              line1: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || '(no name)',
              line2: `${r.source ?? 'unknown source'}${r.email && (r.first_name || r.last_name) ? ` · ${r.email}` : ''}`,
              status: r.status,
              ts: r.created_at,
            }))}
          />
        </div>
      )}
    </div>
  );
}

interface RecentItem {
  id: string;
  line1: string;
  line2: string;
  status: string;
  ts: string;
}

function CategoryCard({
  title,
  href,
  description,
  total,
  newCount,
  recent,
  tone,
}: {
  title: string;
  href: string;
  description: string;
  total: number;
  newCount: number;
  recent: RecentItem[];
  tone: 'amber' | 'blue';
}) {
  const accent = tone === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200';
  return (
    <Link
      href={href}
      className="rounded-xl border border-black/10 bg-white p-5 hover:border-primary/40 transition-colors flex flex-col"
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
    </Link>
  );
}
