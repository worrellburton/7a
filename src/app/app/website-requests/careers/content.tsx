'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// Rows come from public.contact_submissions filtered to
// source='careers' (the OpenPositions form on /careers writes them).
// Message body is prefixed with the role/track ("[BHTs — always
// hiring.]" or similar), so admins can sort applications by that
// without a separate column.
interface Row {
  id: string;
  source: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  telephone: string | null;
  message: string | null;
  page_url: string | null;
  referrer: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

function trackFromMessage(message: string | null): { track: string | null; rest: string } {
  if (!message) return { track: null, rest: '' };
  const m = message.match(/^\[([^\]]+)\]\s*\n*([\s\S]*)$/);
  if (!m) return { track: null, rest: message };
  return { track: m[1], rest: m[2].trim() };
}

export default function CareersContent() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) return;
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
  }, [user, isAdmin]);

  if (!user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Website Requests</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Careers
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Job applications from the public careers page. {rows.length} total.
        </p>
      </header>

      {loading && <p className="text-sm text-foreground/50">Loading…</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-foreground/50">No careers submissions yet.</p>
      )}

      {rows.length > 0 && (
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
                      {r.email && <a href={`mailto:${r.email}`} className="underline decoration-dotted">{r.email}</a>}
                    </p>
                    {rest && (
                      <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{rest}</p>
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
                      {new Date(r.created_at).toLocaleString('en-US', {
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
