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
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { toAvatarThumb } from '@/lib/avatarThumb';

interface CampaignRow {
  id: string;
  prompt: string;
  generated_subject: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  created_by: string | null;
  scheduled_send_at: string | null;
  resend_broadcast_id: string | null;
  // Hydrated client-side from a second select on public.users keyed
  // by created_by. Done as a separate query (rather than a PostgREST
  // embed) because email_campaigns has TWO FKs to users — created_by
  // and featured_employee_id — and the embed-by-FK-name syntax is
  // brittle if the constraint is renamed.
  creator?: { full_name: string | null; avatar_url: string | null } | null;
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

interface AutopilotActivity {
  id: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  campaignCount: number;
  campaigns: Array<{ id: string; label: string }>;
  createdAt: string;
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
        .select('id, prompt, generated_subject, status, sent_at, created_at, created_by, scheduled_send_at, resend_broadcast_id')
        .order('created_at', { ascending: false })
        .limit(500);
      if (cancelled) return;
      const baseRows = (data ?? []) as CampaignRow[];
      // Resolve creator names in a single follow-up select so each
      // row in the list shows "by <name>". Falls back gracefully when
      // the users table is unreachable or the creator was deleted.
      const creatorIds = Array.from(new Set(baseRows.map((r) => r.created_by).filter((v): v is string => !!v)));
      if (creatorIds.length > 0) {
        const { data: userRows } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', creatorIds);
        if (cancelled) return;
        const userById = new Map(
          (userRows ?? []).map((u: { id: string; full_name: string | null; avatar_url: string | null }) => [u.id, u]),
        );
        for (const r of baseRows) {
          if (r.created_by) {
            const u = userById.get(r.created_by);
            r.creator = u ? { full_name: u.full_name, avatar_url: u.avatar_url } : null;
          }
        }
      }
      setRows(baseRows);
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
        <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
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
          <Link
            href="/app/email-campaigns/scheduled"
            className="px-3 py-2 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-semibold uppercase tracking-wider hover:bg-amber-100"
            style={{ fontFamily: 'var(--font-body)' }}
            title="See every campaign queued to send automatically, with live countdowns and reschedule controls."
          >
            Sending schedule
          </Link>
          <Link
            href="/app/email-campaigns/recipients"
            className="px-3 py-2 rounded-md border border-black/15 bg-white text-foreground/75 text-[11px] font-semibold uppercase tracking-wider hover:bg-warm-bg/60"
            style={{ fontFamily: 'var(--font-body)' }}
            title="One row per contact ever emailed — open / click / response rates, sortable like a spreadsheet."
          >
            View by recipient
          </Link>
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

      <AutopilotPanel canManage={canManage} />

      <SendQueuePanel rows={rows} />

      {(() => {
        // Three-way split:
        //   - Send queue panel (above) owns scheduled + sending +
        //     stuck. Scheduled campaigns live ONLY there so they
        //     don't double-list with the queue countdown.
        //   - 'Campaigns in progress' (middle card) is the
        //     working set — drafts, recipients, finalizing, sending,
        //     failed. Anything the marketer is actively touching.
        //   - 'Sent campaigns' (bottom card) is the archive.
        const activeRows = rows.filter((r) => r.status !== 'sent' && r.status !== 'scheduled');
        const sentRows = rows.filter((r) => r.status === 'sent');
        const showEmpty = !loading && activeRows.length === 0 && sentRows.length === 0;
        return (
          <>
            <section className="rounded-2xl border border-black/10 bg-white">
              <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
                  Campaigns in progress
                </p>
                {!loading && activeRows.length > 0 && (
                  <span className="text-[11px] text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>
                    {activeRows.length} {activeRows.length === 1 ? 'campaign' : 'campaigns'}
                  </span>
                )}
              </header>
              {loading ? (
                <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center" style={{ fontFamily: 'var(--font-body)' }}>
                  Loading…
                </p>
              ) : showEmpty ? (
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
              ) : activeRows.length === 0 ? (
                <p className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center" style={{ fontFamily: 'var(--font-body)' }}>
                  Nothing in progress — scheduled campaigns live in the Send queue above; sent ones live below.
                </p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {activeRows.map((c) => (
                    <CampaignRowItem
                      key={c.id}
                      c={c}
                      expanded={expanded === c.id}
                      onToggle={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
                      canManage={canManage}
                      onDeleted={(id) => {
                        setRows((prev) => prev.filter((r) => r.id !== id));
                        setExpanded((prev) => (prev === id ? null : prev));
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>

            {!loading && sentRows.length > 0 && (
              <section className="mt-5 rounded-2xl border border-black/10 bg-white">
                <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between">
                  <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
                    Sent campaigns
                  </p>
                  <span className="text-[11px] text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>
                    {sentRows.length} {sentRows.length === 1 ? 'campaign' : 'campaigns'}
                  </span>
                </header>
                <ul className="divide-y divide-black/5">
                  {sentRows.map((c) => (
                    <CampaignRowItem
                      key={c.id}
                      c={c}
                      expanded={expanded === c.id}
                      onToggle={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
                      canManage={canManage}
                      onDeleted={(id) => {
                        setRows((prev) => prev.filter((r) => r.id !== id));
                        setExpanded((prev) => (prev === id ? null : prev));
                      }}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        );
      })()}
    </div>
  );
}

// Always-on autopilot indicator + activity feed. The actual work
// happens in a Postgres trigger (contacts_autopilot_scheduled): every
// new contact with a valid, non-unsubscribed email is added to every
// currently-scheduled campaign whose recipients were locked before the
// contact existed, and the event is written to
// email_campaign_autopilot_log. This panel just surfaces that it's on
// and shows the recent log. The "Catch up now" affordance re-runs the
// historical sweep for contacts that predate the trigger.
function AutopilotPanel({ canManage }: { canManage: boolean }) {
  const { session } = useAuth();
  const [items, setItems] = useState<AutopilotActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/email-campaigns/autopilot-activity?limit=25', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setItems(((json as { items?: AutopilotActivity[] }).items ?? []));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void loadActivity(); }, [loadActivity]);

  // Historical sweep for contacts that were created BEFORE the trigger
  // existed (or before a campaign was scheduled). The trigger handles
  // everything from here forward; this is the one-shot backfill.
  async function runCatchUp() {
    if (!session?.access_token) return;
    if (!confirm(
      'Add every existing contact created since each scheduled campaign was locked to that campaign\'s recipient list?\n\n' +
      'Going forward this happens automatically — this only backfills contacts that predate autopilot. Unsubscribed contacts and contacts already on the list are skipped.'
    )) return;
    setSyncState('running');
    setSyncMessage(null);
    try {
      const res = await fetch('/api/email-campaigns/sync-scheduled-recipients', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
      const j = json as { scheduledCampaigns?: number; totalAdded?: number };
      setSyncState('done');
      setSyncMessage(
        `Caught up ${j.scheduledCampaigns ?? 0} scheduled campaign${(j.scheduledCampaigns ?? 0) === 1 ? '' : 's'} · added ${j.totalAdded ?? 0} recipient${(j.totalAdded ?? 0) === 1 ? '' : 's'}.`,
      );
      void loadActivity();
    } catch (e) {
      setSyncState('error');
      setSyncMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-white overflow-hidden">
      <header className="px-4 py-3 border-b border-emerald-100/80 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Glowing "on" pill — pulsing halo + ping dot signal it's live. */}
          <div className="relative inline-flex shrink-0">
            <span aria-hidden className="absolute -inset-1 rounded-full bg-emerald-400/30 blur-md animate-pulse" />
            <span
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-900 text-[11px] font-bold uppercase tracking-[0.14em] shadow-[0_0_14px_rgba(16,185,129,0.45)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Autopilot · On
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-800/70" style={{ fontFamily: 'var(--font-body)' }}>
              New contacts → scheduled campaigns
            </p>
            <p className="text-[12px] text-foreground/60 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              Every new contact is automatically added to each scheduled campaign whose recipients were locked before they existed.
            </p>
          </div>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={runCatchUp}
            disabled={syncState === 'running'}
            className="shrink-0 px-3 py-1.5 rounded-md border border-emerald-300 bg-white text-emerald-800 text-[11px] font-semibold uppercase tracking-wider hover:bg-emerald-50 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
            title="One-shot backfill for contacts created before autopilot existed. New contacts are already handled automatically."
          >
            {syncState === 'running' ? 'Catching up…' : 'Catch up now'}
          </button>
        )}
      </header>

      {syncMessage && (
        <p
          className={`px-4 pt-3 text-[11.5px] ${syncState === 'error' ? 'text-red-700' : 'text-emerald-800'}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {syncMessage}
        </p>
      )}

      {/* Recent activity is collapsed by default — most page loads
          don't need the per-contact detail, just the headline that
          autopilot is on. Using <details> for native disclosure
          semantics (keyboard + screen reader) without needing a
          new state hook. */}
      <details className="group border-t border-emerald-100/80">
        <summary className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer list-none select-none hover:bg-emerald-50/40 transition-colors">
          <div className="flex items-baseline gap-3">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
              Recent activity
            </p>
            {!loading && (
              <span className="text-[11px] text-foreground/45 tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                {items.length === 0 ? 'none yet' : `${items.length} most recent`}
              </span>
            )}
          </div>
          <span
            aria-hidden
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md border border-black/10 bg-white text-foreground/55 transition-transform group-open:rotate-180"
          >
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
          </span>
        </summary>

        <div className="px-4 pb-3">
          {loading ? (
            <p className="text-[12px] text-foreground/50 italic" style={{ fontFamily: 'var(--font-body)' }}>
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="text-[12px] text-foreground/50 italic" style={{ fontFamily: 'var(--font-body)' }}>
              No contacts added yet. As new contacts come in, they&apos;ll show up here automatically.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start gap-2.5 rounded-lg border border-black/5 bg-white/70 px-3 py-2"
                >
                  <span aria-hidden className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] shrink-0">
                    +
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                      <span className="font-semibold">{it.contactName || it.contactEmail || 'New contact'}</span>
                      {' '}added to{' '}
                      <span className="font-semibold">{it.campaignCount}</span>
                      {' '}scheduled campaign{it.campaignCount === 1 ? '' : 's'}
                    </p>
                    {it.campaigns.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {it.campaigns.map((c) => (
                          <span
                            key={c.id}
                            className="inline-block max-w-[220px] truncate px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50/60 text-emerald-800 text-[10.5px]"
                            style={{ fontFamily: 'var(--font-body)' }}
                            title={c.label}
                          >
                            {c.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-foreground/45 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                    {formatRelative(it.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}

function CampaignRowItem({
  c, expanded, onToggle, canManage, onDeleted,
}: {
  c: CampaignRow;
  expanded: boolean;
  onToggle: () => void;
  /** Admins see the delete button — non-admins don't. */
  canManage: boolean;
  /** Parent updater so the row + its expanded analytics disappear
   *  immediately when the DELETE succeeds, no extra refetch. */
  onDeleted: (id: string) => void;
}) {
  const { session } = useAuth();
  const [deleting, setDeleting] = useState(false);
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

  // Delete handler. Confirms with a hard warning since the DB-level
  // cascade wipes the recipient list, send log, and per-event
  // analytics in one shot — there's no undo from the UI side.
  const onDelete = async () => {
    if (deleting) return;
    const confirmMsg = c.status === 'sent' || c.status === 'failed' || c.status === 'sending'
      ? `Delete "${subject}"?\n\nThis permanently removes the campaign AND every analytic that goes with it (recipient list, send log, opens, clicks, bounces). The contact_logs entries that were already written to each recipient stay in place. This cannot be undone.`
      : `Delete "${subject}"?\n\nThis permanently removes the draft and any recipients you've picked. Cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/email-campaigns/${c.id}`, {
        method: 'DELETE',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        window.alert(`Couldn't delete: ${json.error ?? `HTTP ${res.status}`}`);
        return;
      }
      onDeleted(c.id);
    } catch (err) {
      window.alert(`Couldn't delete: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleting(false);
    }
  };

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
          <p className="text-[11.5px] text-foreground/55 truncate mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ fontFamily: 'var(--font-body)' }}>
            <span>
              {c.sent_at
                ? `Sent ${formatExact(c.sent_at)} · ${formatRelative(c.sent_at)}`
                : `Started ${formatRelative(c.created_at)}`}
            </span>
            {c.creator?.full_name && (
              <>
                <span aria-hidden className="text-foreground/30">·</span>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  {c.creator.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toAvatarThumb(c.creator.avatar_url, 200) ?? c.creator.avatar_url}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover bg-warm-bg shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span aria-hidden className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold shrink-0">
                      {c.creator.full_name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate">by {c.creator.full_name}</span>
                </span>
              </>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${tone}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {STATUS_LABELS[c.status] ?? c.status}
        </span>
        {/* Preview opens the built email with iterate enabled but the
            Send + Schedule controls hidden, so a marketer can tweak
            wording on a scheduled campaign without touching the
            schedule. Skipped for drafts that haven't been built yet
            (status='draft' has no generated_html to preview). */}
        {c.status !== 'draft' && (
          <Link
            href={`/app/email-campaigns/${c.id}/finalize?preview=1`}
            className="shrink-0 px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            Preview
          </Link>
        )}
        <Link
          href={resumeHref}
          className="shrink-0 px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          Open
        </Link>
        {canManage && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Delete campaign "${subject}"`}
            title="Delete campaign + every analytic that goes with it. Cannot be undone."
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/10 bg-white text-foreground/55 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? (
              <span aria-hidden className="inline-block w-3 h-3 border-2 border-foreground/30 border-t-foreground/70 rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            )}
          </button>
        )}
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

// ============================================================================
// SendQueuePanel — visible queue of in-flight + scheduled campaigns.
//
// Three buckets, only renders the row if at least one campaign falls
// into that bucket so a fully-drained queue collapses to nothing:
//
//   - "Sending now" — campaigns currently in status='sending'. With
//     the cron+idempotency guards in place these should be rare and
//     short-lived (the broadcast fires in ~2 min for a 500-recipient
//     send and then flips to 'sent'). A row that's been sitting in
//     'sending' for >10 min is auto-reconciled by the cron — until
//     that happens we surface it here so it's visible, not hidden.
//
//   - "Scheduled" — status='scheduled' with a future scheduled_send_at.
//     Links out to the dedicated /scheduled view for reschedule /
//     cancel controls (which already exist there).
//
//   - "Stuck" — status='sending' for >10 minutes. Shown in amber so
//     the operator can audit them. The cron's stuck-row reconciliation
//     will flip these to 'sent' (if broadcast fired) or 'failed' (if
//     it didn't) on the next tick.
// ============================================================================
function SendQueuePanel({ rows }: { rows: CampaignRow[] }) {
  // Live tick so countdowns advance without a refetch. One second is
  // overkill at the day/hour scale we mostly show — clamp the
  // re-render via an integer "minutes since mount" rather than a
  // full Date.now() in state.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  // tick is intentionally read to force re-render at each interval.
  void tick;

  const now = Date.now();
  const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

  const sending: CampaignRow[] = [];
  const stuck: CampaignRow[] = [];
  const scheduled: CampaignRow[] = [];
  for (const r of rows) {
    if (r.status === 'sending') {
      const startedMs = Date.parse(r.created_at);
      const ageMs = Number.isFinite(startedMs) ? now - startedMs : 0;
      if (ageMs > STUCK_THRESHOLD_MS) stuck.push(r);
      else sending.push(r);
    } else if (r.status === 'scheduled') {
      scheduled.push(r);
    }
  }
  // Sort scheduled by scheduled_send_at ascending so the next one to
  // fire is on top.
  scheduled.sort((a, b) => {
    const at = a.scheduled_send_at ? Date.parse(a.scheduled_send_at) : Number.POSITIVE_INFINITY;
    const bt = b.scheduled_send_at ? Date.parse(b.scheduled_send_at) : Number.POSITIVE_INFINITY;
    return at - bt;
  });

  if (sending.length + stuck.length + scheduled.length === 0) return null;

  return (
    <section
      className="mt-4 mb-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-warm-bg/30 to-white overflow-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
      aria-label="Send queue"
    >
      <header className="px-4 py-3 border-b border-primary/15 flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-primary">
          Send queue
        </p>
        <div className="flex items-center gap-3 text-[11px] text-foreground/55">
          {sending.length > 0 && (
            <span><strong className="text-emerald-700">{sending.length}</strong> sending</span>
          )}
          {scheduled.length > 0 && (
            <span><strong className="text-foreground/80">{scheduled.length}</strong> scheduled</span>
          )}
          {stuck.length > 0 && (
            <span><strong className="text-amber-700">{stuck.length}</strong> stuck</span>
          )}
          <Link href="/app/email-campaigns/scheduled" className="text-primary font-semibold hover:underline">
            Manage →
          </Link>
        </div>
      </header>
      <ul className="divide-y divide-primary/10">
        {sending.map((r) => (
          <QueueRow key={r.id} row={r} kind="sending" />
        ))}
        {stuck.map((r) => (
          <QueueRow key={r.id} row={r} kind="stuck" />
        ))}
        {scheduled.slice(0, 3).map((r) => (
          <QueueRow key={r.id} row={r} kind="scheduled" now={now} />
        ))}
        {scheduled.length > 3 && (
          <li className="px-4 py-2 text-[11.5px] text-foreground/55">
            +{scheduled.length - 3} more scheduled — open <Link href="/app/email-campaigns/scheduled" className="text-primary font-semibold hover:underline">Sending schedule</Link> for the full list.
          </li>
        )}
      </ul>
    </section>
  );
}

function QueueRow({
  row,
  kind,
  now,
}: {
  row: CampaignRow;
  kind: 'sending' | 'scheduled' | 'stuck';
  now?: number;
}) {
  const subject = row.generated_subject?.trim() || row.prompt?.trim().slice(0, 80) || 'Untitled';
  const meta = (() => {
    if (kind === 'sending') {
      return row.resend_broadcast_id
        ? 'Broadcast fired · finalizing'
        : 'Building audience · uploading contacts';
    }
    if (kind === 'stuck') {
      return row.resend_broadcast_id
        ? 'Broadcast fired but never flipped to sent — cron will reconcile within 1 min'
        : 'Never reached the broadcast step — will be marked failed within 1 min';
    }
    if (!row.scheduled_send_at) return 'Scheduled (no time set)';
    const ms = Date.parse(row.scheduled_send_at) - (now ?? Date.now());
    if (ms <= 0) return 'Sending now…';
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `Sending in ${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `Sending in ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `Sending in ${hr}h ${min - hr * 60}m`;
    const days = Math.floor(hr / 24);
    return `Sending in ${days}d ${hr - days * 24}h`;
  })();
  const accent =
    kind === 'sending' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : kind === 'stuck' ? 'bg-amber-100 text-amber-900 border-amber-300'
    : 'bg-foreground/[0.06] text-foreground/75 border-foreground/10';
  const label = kind === 'sending' ? 'SENDING' : kind === 'stuck' ? 'STUCK' : 'SCHEDULED';
  return (
    <li className="px-4 py-3 flex items-center gap-3">
      <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${accent}`}>
        {kind === 'sending' && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate">{subject}</p>
        <p className="text-[11.5px] text-foreground/55 truncate">{meta}</p>
      </div>
      <Link
        href={`/app/email-campaigns/${row.id}/finalize${kind === 'scheduled' ? '?preview=1' : ''}`}
        className="shrink-0 px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
      >
        Open
      </Link>
    </li>
  );
}
