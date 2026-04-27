'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

// Admin-only diagnostic surface for the Google APIs the dashboard
// depends on (GA4 Data, Realtime, Business Profile reviews, etc.).
// Reads /api/google/diagnose, which probes each surface in parallel
// with a tiny request and reports per-endpoint status. Surfaces the
// raw GoogleApiError fields so an admin can answer "what broke?"
// without needing Vercel log access.

interface ProbeResult {
  id: string;
  label: string;
  configured: boolean;
  ok: boolean;
  status: number | null;
  errorCode: string | null;
  error: string | null;
  endpoint: string | null;
  durationMs: number;
}

interface DiagnoseResponse {
  ranAt: string;
  env: {
    GOOGLE_OAUTH_CLIENT_ID: boolean;
    GOOGLE_OAUTH_CLIENT_SECRET: boolean;
    GA4_PROPERTY_ID: string | null;
    GBP_CONFIGURED: boolean;
  };
  results: ProbeResult[];
}

export default function GoogleStatusContent() {
  const [data, setData] = useState<DiagnoseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/google/diagnose', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setData(json as DiagnoseResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Google API Status
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Diagnostic ping of every Google service the dashboard
            depends on. Each row is a real, smallest-possible request
            against that endpoint — green means the OAuth token + scope
            + property access all line up.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
            loading
              ? 'bg-foreground/40 text-white cursor-wait'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          {loading ? 'Probing…' : 'Re-run probe'}
        </button>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">
          <strong>Probe failed:</strong> {error}
        </div>
      ) : null}

      {/* Env summary — quick sanity check that the server has the
          minimum required configuration before we even talk to
          Google. A red row here means "fix Vercel env vars." */}
      <section className="mb-5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/45 mb-3">
          Environment
        </h2>
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <EnvRow label="GOOGLE_OAUTH_CLIENT_ID" present={data?.env.GOOGLE_OAUTH_CLIENT_ID ?? null} />
          <EnvRow label="GOOGLE_OAUTH_CLIENT_SECRET" present={data?.env.GOOGLE_OAUTH_CLIENT_SECRET ?? null} secret />
          <EnvRow
            label="GA4_PROPERTY_ID"
            present={data ? !!data.env.GA4_PROPERTY_ID : null}
            value={data?.env.GA4_PROPERTY_ID ?? null}
          />
          <EnvRow label="Business Profile" present={data?.env.GBP_CONFIGURED ?? null} />
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/45 mb-3">
          Endpoints
        </h2>
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          {(data?.results ?? []).length === 0 && !loading ? (
            <p className="p-6 text-sm text-foreground/55 text-center">No probes ran.</p>
          ) : (data?.results ?? []).length === 0 ? (
            <p className="p-6 text-sm text-foreground/55 text-center">Probing…</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {(data?.results ?? []).map((r) => (
                <ProbeRow key={r.id} r={r} />
              ))}
            </ul>
          )}
        </div>
        {data?.ranAt ? (
          <p className="text-[11px] text-foreground/45 mt-3">
            Last probe {new Date(data.ranAt).toLocaleString()}.
          </p>
        ) : null}
      </section>

      <p className="mt-8 text-[12px] text-foreground/55">
        Need to refresh the OAuth token?{' '}
        <Link className="font-semibold text-primary hover:underline" href="/app/analytics">
          Reconnect Google →
        </Link>
      </p>
    </div>
  );
}

function EnvRow({
  label,
  present,
  value,
  secret,
}: {
  label: string;
  present: boolean | null;
  value?: string | null;
  secret?: boolean;
}) {
  const tone =
    present === true ? 'text-emerald-700' : present === false ? 'text-red-600' : 'text-foreground/40';
  const dot =
    present === true ? 'bg-emerald-500' : present === false ? 'bg-red-500' : 'bg-foreground/30';
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="font-mono text-foreground/70">{label}</span>
      <span className={`inline-flex items-center gap-2 ${tone}`}>
        <span className={`inline-block w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
        {present == null ? '—' : present ? (secret ? 'set' : value ?? 'set') : 'missing'}
      </span>
    </div>
  );
}

function ProbeRow({ r }: { r: ProbeResult }) {
  const tone =
    !r.configured
      ? 'text-foreground/45'
      : r.ok
        ? 'text-emerald-700'
        : 'text-red-700';
  const dot =
    !r.configured ? 'bg-foreground/30' : r.ok ? 'bg-emerald-500' : 'bg-red-500';
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
          <span className="font-semibold text-foreground truncate">{r.label}</span>
          {r.errorCode ? (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-50 border border-red-100 text-red-700 font-bold ml-1">
              {r.errorCode}
            </span>
          ) : null}
        </div>
        <span className={`text-[12px] tabular-nums ${tone}`}>
          {!r.configured ? 'Not configured' : r.ok ? `OK · ${r.durationMs}ms` : `HTTP ${r.status ?? '?'}`}
        </span>
      </div>
      {r.error ? (
        <p className="mt-1.5 text-[12px] text-foreground/60 break-words font-mono">
          {r.error}
        </p>
      ) : null}
      {r.endpoint ? (
        <p className="mt-0.5 text-[10.5px] text-foreground/40 font-mono truncate">
          {r.endpoint}
        </p>
      ) : null}
    </li>
  );
}
