'use client';

// Email Campaigns — index page. Lists past campaigns so a marketer
// can pick up where they left off or audit recent sends, and offers
// a single "Start a new campaign" entry point that drops them into
// the build flow at /app/email-campaigns/new.
//
// Each row is expandable: clicking the chevron pulls live Resend
// analytics (delivered / opened / clicked rates) plus the per-
// recipient list (name, email, opened?, when sent) so the marketer
// can audit a send without leaving the index page. The Resume link
// (rightmost on the row) still routes to the appropriate page
// based on campaign status.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface CampaignRow {
  id: string;
  prompt: string;
  generated_subject: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface RecipientAnalytics {
  recipientId: string;
  contactId: string;
  contactName: string;
  email: string;
  sendStatus: string;
  sendError: string | null;
  sentAt: string | null;
  providerMessageId: string | null;
  lastEvent: string | null;
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
  bounced: boolean;
}

interface AnalyticsResponse {
  totals: {
    recipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  recipients: RecipientAnalytics[];
  simulated: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  recipients: 'Choosing recipients',
  finalizing: 'Ready to send',
  sending: 'Sending…',
  sent: 'Sent',
  failed: 'Failed',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-warm-bg/60 text-foreground/70 border-black/10',
  recipients: 'bg-amber-50 text-amber-800 border-amber-200',
  finalizing: 'bg-amber-50 text-amber-800 border-amber-200',
  sending: 'bg-sky-50 text-sky-800 border-sky-200',
  sent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

export default function EmailCampaignsContent() {
  const { session, isAdmin, isSuperAdmin } = useAuth();
  // The "Super Admin" toggle on /app/admin/user-permissions writes
  // users.is_admin (not is_super_admin), so admin-only affordances on
  // this page (Backfill analytics button) accept either column.
  const canManage = isAdmin || isSuperAdmin;
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [backfillState, setBackfillState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('email_campaigns')
        .select('id, prompt, generated_subject, status, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      setRows((data ?? []) as CampaignRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Super-admin tool: one-shot seed of the events table for every
  // already-sent recipient. Useful right after pointing Resend at the
  // webhook so the pre-webhook campaigns get retroactive open/click
  // counts instead of an all-zero card.
  async function runBackfill() {
    if (!session?.access_token) return;
    setBackfillState('running');
    setBackfillMessage(null);
    try {
      const res = await fetch('/api/email-campaigns/backfill-events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
      const j = json as { polled?: number; seeded?: number; skipped?: number; errors?: Array<{ reason: string }> };
      setBackfillState('done');
      setBackfillMessage(
        `Polled ${j.polled ?? 0}, seeded ${j.seeded ?? 0}, skipped ${j.skipped ?? 0}${(j.errors?.length ?? 0) > 0 ? `, ${j.errors!.length} errors` : ''}.`,
      );
    } catch (e) {
      setBackfillState('error');
      setBackfillMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Marketing · Email Campaigns
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Build outbound campaigns
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            Describe what you want to say, drop in images, optionally feature a blog or staff member, and Claude builds a polished HTML email you can iterate before picking recipients.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <button
              type="button"
              onClick={runBackfill}
              disabled={backfillState === 'running'}
              className="px-3 py-2 rounded-md border border-black/15 bg-white text-foreground/75 text-[11px] font-semibold uppercase tracking-wider hover:bg-warm-bg/60 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
              title="Pull current state from Resend for every already-sent recipient and seed the events table. Idempotent — safe to re-run."
            >
              {backfillState === 'running' ? 'Backfilling…' : 'Backfill analytics'}
            </button>
          )}
          <Link
            href="/app/email-campaigns/new"
            className="px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            + Start a new campaign
          </Link>
        </div>
      </header>
      {backfillMessage && (
        <p
          className={`mb-3 text-[11.5px] ${backfillState === 'error' ? 'text-red-700' : 'text-foreground/70'}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {backfillMessage}
        </p>
      )}

      <section className="rounded-2xl border border-black/10 bg-white">
        <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Recent campaigns
          </p>
          {!loading && (
            <span className="text-[11px] text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>
              {rows.length} {rows.length === 1 ? 'campaign' : 'campaigns'}
            </span>
          )}
        </header>
        {loading ? (
          <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center" style={{ fontFamily: 'var(--font-body)' }}>
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] text-foreground/55 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
              No campaigns yet. Build the first one.
            </p>
            <Link
              href="/app/email-campaigns/new"
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-primary text-[11.5px] font-semibold hover:bg-primary/10"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              + Start a new campaign
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((c) => (
              <CampaignRowItem
                key={c.id}
                c={c}
                expanded={expanded === c.id}
                onToggle={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CampaignRowItem({
  c, expanded, onToggle,
}: {
  c: CampaignRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const subject = c.generated_subject?.trim() || c.prompt?.trim().slice(0, 80) || 'Untitled campaign';
  const tone = STATUS_TONE[c.status] ?? STATUS_TONE.draft;
  const resumeHref =
    c.status === 'sent'
      ? `/app/email-campaigns/${c.id}/finalize`
      : c.status === 'finalizing' || c.status === 'sending' || c.status === 'failed'
      ? `/app/email-campaigns/${c.id}/finalize`
      : c.status === 'recipients'
      ? `/app/email-campaigns/${c.id}/recipients`
      : `/app/email-campaigns/new?id=${c.id}`;

  // Only campaigns that actually went out (sent or failed) get the
  // analytics expansion. A draft has no Resend data to show.
  const expandable = c.status === 'sent' || c.status === 'failed' || c.status === 'sending';

  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-warm-bg/40 transition-colors">
        {expandable ? (
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md border border-black/10 bg-white text-foreground/60 hover:bg-warm-bg/60"
            aria-label={expanded ? 'Hide analytics' : 'Show analytics'}
          >
            <span aria-hidden className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
          </button>
        ) : (
          <span aria-hidden className="shrink-0 w-6 h-6" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>
            {subject}
          </p>
          <p className="text-[11.5px] text-foreground/55 truncate mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            {c.sent_at
              ? `Sent ${formatExact(c.sent_at)} · ${formatRelative(c.sent_at)}`
              : `Started ${formatRelative(c.created_at)}`}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${tone}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {STATUS_LABELS[c.status] ?? c.status}
        </span>
        <Link
          href={resumeHref}
          className="shrink-0 px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          Open
        </Link>
      </div>
      {expanded && expandable && <CampaignAnalyticsDropdown campaignId={c.id} />}
    </li>
  );
}

function CampaignAnalyticsDropdown({ campaignId }: { campaignId: string }) {
  const { session } = useAuth();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/email-campaigns/${campaignId}/analytics`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json) {
          setError((json && json.error) || `HTTP ${res.status}`);
          return;
        }
        setData(json as AnalyticsResponse);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [campaignId, session?.access_token]);

  if (loading) {
    return (
      <div className="px-12 py-4 bg-warm-bg/30 text-[12px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
        Loading analytics from Resend…
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-12 py-4 bg-red-50 text-[12px] text-red-700" style={{ fontFamily: 'var(--font-body)' }}>
        Could not load analytics: {error}
      </div>
    );
  }
  if (!data) return null;

  const t = data.totals;
  return (
    <div className="px-12 py-4 bg-warm-bg/30 border-t border-black/5">
      {data.simulated && (
        <p className="text-[11px] text-amber-900 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
          No Resend webhook events have arrived for this campaign yet. Add a webhook in
          {' '}<a className="underline" href="https://resend.com/webhooks" target="_blank" rel="noopener">resend.com/webhooks</a>{' '}
          pointing at <code className="font-mono">/api/email-campaigns/webhook</code>, copy the
          Signing Secret into the <code className="font-mono">RESEND_WEBHOOK_SECRET</code> env var,
          and make sure Open + Click tracking are turned on for your sending domain in Resend → Domains.
        </p>
      )}

      {/* Rate cards */}
      <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-3">
        <Stat label="Recipients" value={t.recipients} />
        <Stat label="Sent" value={t.sent} />
        <Stat label="Delivered" value={`${t.deliveryRate}%`} sub={`${t.delivered} / ${t.sent}`} />
        <Stat label="Opened" value={`${t.openRate}%`} sub={`${t.opened} / ${t.sent}`} />
        <Stat label="Clicked" value={`${t.clickRate}%`} sub={`${t.clicked} / ${t.sent}`} />
        <Stat label={t.failed > 0 ? 'Failed' : 'Bounced'} value={t.failed > 0 ? t.failed : `${t.bounceRate}%`} sub={t.failed > 0 ? '' : `${t.bounced} / ${t.sent}`} tone={t.failed > 0 || t.bounced > 0 ? 'warn' : undefined} />
      </ul>

      {/* Per-recipient table */}
      <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
        <header className="px-3 py-2 border-b border-black/5 flex items-baseline justify-between">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Recipients · {data.recipients.length}
          </p>
        </header>
        <ul className="divide-y divide-black/5 max-h-[40vh] overflow-y-auto">
          {data.recipients.map((r) => {
            let event = r.lastEvent || (r.sendStatus === 'sent' ? 'sent' : r.sendStatus);
            event = event.replace(/_/g, ' ');
            const tone = r.clicked
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : r.opened
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : r.delivered
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : r.bounced
              ? 'bg-red-50 text-red-700 border-red-200'
              : r.sendStatus === 'failed'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-warm-bg/60 text-foreground/70 border-black/10';
            return (
              <li key={r.recipientId} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>
                    {r.contactName || r.email}
                  </p>
                  <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                    {r.email}
                    {r.sentAt && ` · ${formatExact(r.sentAt)}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${tone}`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {event}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'warn' }) {
  const valueClass = tone === 'warn' ? 'text-red-700' : 'text-foreground';
  return (
    <li className="rounded-xl border border-black/10 bg-white px-3 py-2">
      <p className="text-[9.5px] font-bold tracking-[0.22em] uppercase text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
        {label}
      </p>
      <p className={`mt-0.5 text-[18px] font-semibold ${valueClass}`} style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-[10.5px] text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>{sub}</p>
      )}
    </li>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diffMs = Date.now() - t;
  const m = Math.round(diffMs / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

function formatExact(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  return t.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
