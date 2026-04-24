'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface Row {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  insurance_provider: string | null;
  status: string;
  notes: string | null;
  received_at: string;
  updated_at: string;
  card_front_url: string | null;
  card_back_url: string | null;
}

export default function VobsContent() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) return;
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
  }, [user, isAdmin]);

  if (!user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Website Requests</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          VOBs
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Insurance verification requests from the public site&apos;s admissions forms. {rows.length} total.
        </p>
      </header>

      {loading && <p className="text-sm text-foreground/50">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-foreground/50">No VOB requests yet.</p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-black/5 border border-black/10 rounded-xl bg-white overflow-hidden">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{r.full_name}</p>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    {r.phone && <span>{r.phone}</span>}
                    {r.phone && r.email && <span> · </span>}
                    {r.email && <span>{r.email}</span>}
                  </p>
                  {r.insurance_provider && (
                    <p className="text-sm text-foreground/80 mt-1">
                      Insurance: <span className="font-medium">{r.insurance_provider}</span>
                    </p>
                  )}
                  {r.notes && <p className="text-sm text-foreground/70 mt-1">{r.notes}</p>}
                  {(r.card_front_url || r.card_back_url) && (
                    <div className="mt-3 flex items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                        Insurance Card
                      </p>
                      {r.card_front_url && (
                        <CardThumb url={r.card_front_url} label="Front" />
                      )}
                      {r.card_back_url && (
                        <CardThumb url={r.card_back_url} label="Back" />
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${
                    r.status === 'new'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : r.status === 'verified'
                      ? 'bg-green-50 text-green-700 border-green-200'
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
          ))}
        </ul>
      )}
    </div>
  );
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
