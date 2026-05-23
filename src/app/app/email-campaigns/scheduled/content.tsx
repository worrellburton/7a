'use client';

// Sending schedule view — every campaign in status='scheduled'
// listed in the order they'll fire. Each row shows the email
// (subject + iframe preview), the absolute send time, a live
// "sending in 3 hours…" countdown, the recipient count, the
// creator avatar, and inline controls to change the send time or
// cancel the schedule.
//
// The list refetches when the tab regains focus so a teammate
// scheduling from another tab shows up here without a manual
// reload, and the countdown ticks once per second.

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

interface Row {
  id: string;
  subject: string | null;
  html: string | null;
  scheduled_send_at: string | null;
  status: string;
  recipient_count: number;
  created_by: string | null;
  creator: { name: string; avatar_url: string | null } | null;
  created_at: string;
}

function fmtAbsolute(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// "sending in 3 hours… / 5 days… / 12 minutes…" with second-level
// resolution under a minute so the marketer sees the countdown move
// in real time.
function fmtCountdown(toIso: string, now: number): string {
  const diffMs = new Date(toIso).getTime() - now;
  if (diffMs <= 0) return 'sending now…';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `sending in ${sec} second${sec === 1 ? '' : 's'}…`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `sending in ${min} minute${min === 1 ? '' : 's'}…`;
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    const remMin = min - hours * 60;
    if (remMin === 0) return `sending in ${hours} hour${hours === 1 ? '' : 's'}…`;
    return `sending in ${hours}h ${remMin}m…`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours - days * 24;
  if (days < 7) {
    if (remHours === 0) return `sending in ${days} day${days === 1 ? '' : 's'}…`;
    return `sending in ${days}d ${remHours}h…`;
  }
  return `sending in ${days} day${days === 1 ? '' : 's'}…`;
}

function initialsOf(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

// Convert an ISO timestamp to a value that <input type="datetime-local">
// accepts (yyyy-MM-ddThh:mm in local time, no seconds).
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduledContent() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const scheduledForParam = searchParams?.get('scheduledFor') ?? null;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const tickRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/email-campaigns/scheduled', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { rows: Row[] };
      setRows(Array.isArray(json.rows) ? json.rows : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    function onFocus() { void refresh(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // 1-second ticker so the countdowns animate live. A single timer
  // updates `now` and every row re-derives its countdown from that
  // — cheaper than a timer per row.
  useEffect(() => {
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current);
    };
  }, []);

  const reschedule = async (id: string, sendAt: string) => {
    if (!session?.access_token) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/email-campaigns/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ campaignId: id, sendAt }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setEditingId(null);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const cancelSchedule = async (id: string) => {
    if (!session?.access_token) return;
    if (!window.confirm('Cancel this scheduled send? The campaign goes back to finalizing — you can still send it later.')) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/email-campaigns/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ campaignId: id, sendAt: null }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const totalRecipients = useMemo(
    () => rows.reduce((s, r) => s + r.recipient_count, 0),
    [rows],
  );

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Marketing · Email Campaigns
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Sending schedule
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground/55">
            Every scheduled campaign queued to go out automatically. Edit the send time, cancel the schedule, or open the campaign to make changes.
          </p>
        </div>
        <Link
          href="/app/email-campaigns"
          className="px-3 py-2 rounded-md border border-black/15 bg-white text-foreground/75 text-[11px] font-semibold uppercase tracking-wider hover:bg-warm-bg/60"
        >
          ← Back to campaigns
        </Link>
      </header>

      {scheduledForParam && !bannerDismissed && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start justify-between gap-3">
          <p className="text-[13px] text-emerald-900">
            Scheduled. Your message will be sent on{' '}
            <span className="font-semibold">{fmtAbsolute(scheduledForParam)}</span>.
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-emerald-900/60 hover:text-emerald-900 text-xl leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <KpiTile label="Scheduled" value={rows.length.toLocaleString()} />
        <KpiTile label="Recipients" value={totalRecipients.toLocaleString()} />
        <KpiTile
          label="Next send"
          value={rows[0]?.scheduled_send_at ? fmtCountdown(rows[0].scheduled_send_at, now).replace(/…$/, '') : '—'}
        />
        <KpiTile
          label="Furthest out"
          value={rows[rows.length - 1]?.scheduled_send_at ? fmtCountdown(rows[rows.length - 1].scheduled_send_at!, now).replace(/…$/, '') : '—'}
        />
      </section>

      <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
        <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Queued campaigns
          </p>
          <p className="text-[11px] tabular-nums text-foreground/45">{rows.length.toLocaleString()} queued</p>
        </header>
        {loading ? (
          <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center">Loading…</p>
        ) : error ? (
          <p className="px-4 py-10 text-[12.5px] text-rose-700 text-center">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center">
            Nothing scheduled. Use <span className="font-semibold text-foreground">Schedule send</span> on any campaign&apos;s finalize step to queue one here.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((r) => {
              const isEditing = editingId === r.id;
              const busy = busyId === r.id;
              const countdown = r.scheduled_send_at ? fmtCountdown(r.scheduled_send_at, now) : '—';
              return (
                <li key={r.id} className="px-4 py-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="md:w-72 lg:w-80 shrink-0">
                      <div className="rounded-xl border border-black/10 overflow-hidden bg-warm-bg/30">
                        <iframe
                          srcDoc={r.html ?? ''}
                          title={r.subject ?? 'Email preview'}
                          sandbox=""
                          className="w-full h-44 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <h3 className="text-[15px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-display)' }}>
                          {r.subject || '(no subject)'}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 bg-amber-50 text-amber-800 ring-amber-200 whitespace-nowrap uppercase tracking-wider">
                          Scheduled
                        </span>
                      </div>

                      <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                        <Stat label="Sending in" value={countdown.replace(/^sending in /, '').replace(/…$/, '')} live />
                        <Stat label="At" value={r.scheduled_send_at ? fmtAbsolute(r.scheduled_send_at) : '—'} />
                        <Stat label="Recipients" value={r.recipient_count.toLocaleString()} />
                        <Stat
                          label="Created by"
                          value={
                            r.creator?.name || '—'
                          }
                          avatar={r.creator?.avatar_url ?? null}
                          avatarFallback={r.creator?.name ? initialsOf(r.creator.name) : null}
                        />
                      </dl>

                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {!isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(r.id);
                                setEditingValue(r.scheduled_send_at ? isoToLocalInput(r.scheduled_send_at) : '');
                              }}
                              disabled={busy}
                              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/75 hover:bg-warm-bg/60 disabled:opacity-50"
                            >
                              Change time
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelSchedule(r.id)}
                              disabled={busy}
                              className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              Cancel schedule
                            </button>
                            <Link
                              href={`/app/email-campaigns/${r.id}/recipients`}
                              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/75 hover:bg-warm-bg/60"
                            >
                              Open
                            </Link>
                          </>
                        ) : (
                          <>
                            <input
                              type="datetime-local"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="px-2 py-1 rounded-md border border-black/15 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingValue) return;
                                const dt = new Date(editingValue);
                                if (Number.isNaN(dt.getTime())) return;
                                void reschedule(r.id, dt.toISOString());
                              }}
                              disabled={busy || !editingValue}
                              className="px-2.5 py-1 rounded-md bg-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
                            >
                              {busy ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={busy}
                              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground truncate" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  live,
  avatar,
  avatarFallback,
}: {
  label: string;
  value: string;
  live?: boolean;
  avatar?: string | null;
  avatarFallback?: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">{label}</p>
      <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="shrink-0 w-5 h-5 rounded-full object-cover border border-white shadow-sm" />
        ) : avatarFallback ? (
          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center border border-white shadow-sm">{avatarFallback}</span>
        ) : null}
        <p
          className={`text-[13px] font-semibold tabular-nums truncate ${live ? 'text-emerald-700' : 'text-foreground'}`}
          aria-live={live ? 'polite' : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
