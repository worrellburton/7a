'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface Row {
  id: string;
  source: 'contact_page' | 'footer' | 'exit_intent' | 'other';
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  payment_method: string | null;
  consent: boolean;
  page_url: string | null;
  status: string;
  notes: string | null;
  received_at: string;
  updated_at: string;
}

type SourceFilter = 'all' | Row['source'];

const SOURCE_LABELS: Record<Row['source'], string> = {
  contact_page: 'Contact Page',
  footer: 'Footer',
  exit_intent: 'Exit Intent',
  other: 'Other',
};

export default function FormsContent() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SourceFilter>('all');

  useEffect(() => {
    if (!user || !isAdmin) return;
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
  }, [user, isAdmin]);

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.source === filter)),
    [rows, filter],
  );

  if (!user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Website Requests</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Forms
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Contact, lead, and exit-intent submissions from the public site. {rows.length} total.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5 items-center">
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
            {v === 'all' ? 'All' : SOURCE_LABELS[v]}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-foreground/50">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && visible.length === 0 && (
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
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-200">
                        {SOURCE_LABELS[r.source]}
                      </span>
                      {r.payment_method && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200">
                          {r.payment_method}
                        </span>
                      )}
                      {!r.consent && r.source === 'footer' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-red-50 text-red-700 border-red-200">
                          No consent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      {r.phone && <span>{r.phone}</span>}
                      {r.phone && r.email && <span> · </span>}
                      {r.email && <span>{r.email}</span>}
                    </p>
                    {r.message && (
                      <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{r.message}</p>
                    )}
                    {r.page_url && (
                      <p className="text-[11px] text-foreground/40 mt-1 truncate">From: {r.page_url}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                      r.status === 'new'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : r.status === 'contacted'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {r.status}
                    </span>
                    <p className="text-[11px] text-foreground/50 mt-1">
                      {new Date(r.received_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
