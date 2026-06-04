'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// /app/admin/health — read-only operational dashboard for super
// admins. Surfaces the questions we previously only answered through
// user reports: is a campaign stuck? is any cron failing? how many
// contact submissions are pending? Useful for catching regressions
// before customers notice.

interface HealthPayload {
  stuck_campaigns: Array<{ id: string; generated_subject: string | null; status: string; updated_at: string; resend_broadcast_id: string | null }>;
  scheduled_campaigns: Array<{ id: string; generated_subject: string | null; scheduled_send_at: string }>;
  recent_cron_fails: Array<{ id: string; path: string; status: string; error: string | null; started_at: string; finished_at: string | null }>;
  cron_24h_total: number;
  cron_24h_error: number;
  failed_recipients_total: number;
  contact_submissions_last_7d: number;
  failed_campaigns_last_7d: Array<{ id: string; generated_subject: string | null; status: string; updated_at: string }>;
  generated_at: string;
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HealthContent() {
  const { session, isSuperAdmin } = useAuth();
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/health', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Could not load health snapshot.');
        return;
      }
      setData(json as HealthPayload);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);
  // Auto-refresh every 60s so the tab can stay open as a passive monitor.
  useEffect(() => {
    const id = window.setInterval(() => { void load(); }, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-sm text-foreground/60">Super admins only.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Super admin</p>
          <h1 className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: 'var(--font-display)' }}>Health</h1>
          <p className="mt-1 text-[13px] text-foreground/55">Operational snapshot — stuck pipelines, cron status, failed sends. Auto-refreshes every 60s.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh now'}
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}

      {data && (
        <div className="space-y-6">
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi
              label="Stuck campaigns"
              value={data.stuck_campaigns.length}
              tone={data.stuck_campaigns.length > 0 ? 'warn' : 'ok'}
              sub={data.stuck_campaigns.length === 0 ? 'All flowing' : 'Reconcile within 1 min'}
            />
            <Kpi
              label="Cron · 24h"
              value={data.cron_24h_error === 0 ? `${data.cron_24h_total} runs` : `${data.cron_24h_error}/${data.cron_24h_total}`}
              tone={data.cron_24h_error > 0 ? 'warn' : 'ok'}
              sub={data.cron_24h_error > 0 ? 'errors over total' : 'no failures'}
            />
            <Kpi
              label="Failed recipients"
              value={data.failed_recipients_total}
              tone={data.failed_recipients_total > 0 ? 'info' : 'ok'}
              sub="across all campaigns"
            />
            <Kpi
              label="Submissions · 7d"
              value={data.contact_submissions_last_7d}
              tone="info"
              sub="non-spam, last 7 days"
            />
          </div>

          {/* Stuck campaigns detail */}
          {data.stuck_campaigns.length > 0 && (
            <Card title="Stuck campaigns" subtitle="status='sending' for >10 min — auto-reconciler will resolve on next cron tick.">
              <ul className="divide-y divide-black/5">
                {data.stuck_campaigns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/app/email-campaigns/${c.id}/finalize`} className="text-[13px] font-semibold text-foreground truncate hover:underline">
                        {c.generated_subject || c.id}
                      </Link>
                      <p className="text-[11.5px] text-foreground/55">
                        Updated {relTime(c.updated_at)} · {c.resend_broadcast_id ? 'broadcast fired' : 'no broadcast yet'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recent cron failures */}
          <Card title="Cron failures · last 24h" subtitle={data.recent_cron_fails.length === 0 ? 'No failures in the last 24 hours.' : ''}>
            {data.recent_cron_fails.length > 0 && (
              <ul className="divide-y divide-black/5">
                {data.recent_cron_fails.map((r) => (
                  <li key={r.id} className="px-4 py-2.5">
                    <p className="text-[13px] font-semibold text-foreground">{r.path}</p>
                    <p className="text-[11.5px] text-foreground/55 mt-0.5 truncate">
                      {relTime(r.started_at)}{r.error ? ` · ${r.error.slice(0, 160)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Scheduled campaigns */}
          {data.scheduled_campaigns.length > 0 && (
            <Card title="Scheduled · next up" subtitle="Upcoming auto-fire campaigns ordered by send time.">
              <ul className="divide-y divide-black/5">
                {data.scheduled_campaigns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/app/email-campaigns/${c.id}/finalize?preview=1`} className="text-[13px] font-semibold text-foreground truncate hover:underline">
                        {c.generated_subject || c.id}
                      </Link>
                      <p className="text-[11.5px] text-foreground/55">
                        Sending {new Date(c.scheduled_send_at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recently failed campaigns */}
          {data.failed_campaigns_last_7d.length > 0 && (
            <Card title="Failed campaigns · last 7d" subtitle="Campaigns that finished in the 'failed' state.">
              <ul className="divide-y divide-black/5">
                {data.failed_campaigns_last_7d.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/app/email-campaigns/${c.id}/finalize`} className="text-[13px] font-semibold text-foreground truncate hover:underline">
                        {c.generated_subject || c.id}
                      </Link>
                      <p className="text-[11.5px] text-foreground/55">Failed {relTime(c.updated_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <p className="text-[10px] text-foreground/35 text-right">Generated {relTime(data.generated_at)}</p>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone, sub }: { label: string; value: string | number; tone: 'ok' | 'warn' | 'info'; sub?: string }) {
  const palette =
    tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900'
    : tone === 'info' ? 'border-black/10 bg-white text-foreground'
    : 'border-emerald-200 bg-emerald-50 text-emerald-900';
  return (
    <div className={`rounded-xl border ${palette} p-3.5`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-65">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] opacity-60">{sub}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
      <header className="px-4 py-3 border-b border-black/5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">{title}</p>
        {subtitle && <p className="text-[12px] text-foreground/55 mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
