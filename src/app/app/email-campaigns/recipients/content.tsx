'use client';

// Recipient-centric view of every email campaign that's ever
// shipped. Reads the join of email_campaign_recipients +
// email_campaign_events from /api/email-campaigns/recipients-
// analytics and lays them out as a sortable spreadsheet so a
// marketer can ask "who actually opens our stuff?" in one glance.
//
// Each column header is a click target; first click sorts desc,
// second flips to asc, third returns to default (last_sent_at
// desc). Numeric and date columns use tabular-nums so percentages
// + counts line up.

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface Row {
  contact_id: string;
  name: string;
  email: string;
  role: string | null;
  company: string | null;
  location: string | null;
  unsubscribed_at: string | null;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  last_sent_at: string | null;
  open_rate: number;
  click_rate: number;
  click_through: number;
}

type SortKey =
  | 'name'
  | 'company'
  | 'sent_count'
  | 'opened_count'
  | 'clicked_count'
  | 'bounced_count'
  | 'open_rate'
  | 'click_rate'
  | 'click_through'
  | 'last_sent_at';
type SortDir = 'asc' | 'desc';

const DEFAULT_SORT: { key: SortKey; dir: SortDir } = { key: 'last_sent_at', dir: 'desc' };

export default function RecipientsAnalyticsContent() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT.key);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT.dir);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/email-campaigns/recipients-analytics', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { rows: Row[] };
        if (cancelled) return;
        setRows(Array.isArray(json.rows) ? json.rows : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sort + filter. Sort tries the chosen key, falls back to name
  // on ties so order is stable across re-renders.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) =>
          r.name.toLowerCase().includes(q)
          || r.email.toLowerCase().includes(q)
          || (r.company ?? '').toLowerCase().includes(q)
          || (r.role ?? '').toLowerCase().includes(q)
          || (r.location ?? '').toLowerCase().includes(q),
        )
      : rows;
    const dirMul = sortDir === 'asc' ? 1 : -1;
    const cmpString = (a: string | null, b: string | null) =>
      (a ?? '').localeCompare(b ?? '');
    const cmpNum = (a: number, b: number) => a - b;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':          cmp = cmpString(a.name, b.name); break;
        case 'company':       cmp = cmpString(a.company, b.company); break;
        case 'sent_count':    cmp = cmpNum(a.sent_count, b.sent_count); break;
        case 'opened_count':  cmp = cmpNum(a.opened_count, b.opened_count); break;
        case 'clicked_count': cmp = cmpNum(a.clicked_count, b.clicked_count); break;
        case 'bounced_count': cmp = cmpNum(a.bounced_count, b.bounced_count); break;
        case 'open_rate':     cmp = cmpNum(a.open_rate, b.open_rate); break;
        case 'click_rate':    cmp = cmpNum(a.click_rate, b.click_rate); break;
        case 'click_through': cmp = cmpNum(a.click_through, b.click_through); break;
        case 'last_sent_at':  cmp = cmpString(a.last_sent_at, b.last_sent_at); break;
      }
      if (cmp === 0) cmp = cmpString(a.name, b.name);
      return cmp * dirMul;
    });
    return sorted;
  }, [rows, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      // First click on a new column: sort desc (most common
      // 'see the biggest numbers first' intent).
      setSortKey(key);
      setSortDir('desc');
      return;
    }
    // Same column: flip direction; if already at the default
    // direction for that column, swing back to the default sort.
    setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  // ─── KPI strip across the top ──────────────────────────────────
  const totals = useMemo(() => {
    let sent = 0, opened = 0, clicked = 0;
    for (const r of rows) {
      sent += r.sent_count;
      opened += r.opened_count;
      clicked += r.clicked_count;
    }
    return {
      recipients: rows.length,
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? opened / sent : 0,
      clickRate: sent > 0 ? clicked / sent : 0,
    };
  }, [rows]);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Marketing · Email Campaigns
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            By recipient
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground/55">
            One row per contact who&apos;s ever been sent an email-campaign send. Click any column header to sort; click again to flip the direction.
          </p>
        </div>
        <Link
          href="/app/email-campaigns"
          className="px-3 py-2 rounded-md border border-black/15 bg-white text-foreground/75 text-[11px] font-semibold uppercase tracking-wider hover:bg-warm-bg/60"
        >
          ← Back to campaigns
        </Link>
      </header>

      {/* KPI strip */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <KpiTile label="Recipients" value={totals.recipients.toLocaleString()} />
        <KpiTile label="Sends" value={totals.sent.toLocaleString()} />
        <KpiTile label="Opens" value={totals.opened.toLocaleString()} />
        <KpiTile label="Clicks" value={totals.clicked.toLocaleString()} />
        <KpiTile label="Open rate" value={`${Math.round(totals.openRate * 100)}%`} />
        <KpiTile label="Click rate" value={`${Math.round(totals.clickRate * 100)}%`} />
      </section>

      <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
        <header className="px-4 py-3 border-b border-black/5 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, company, role, location…"
            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md border border-black/10 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[11px] text-foreground/55 tabular-nums shrink-0">
            {visible.length.toLocaleString()} of {rows.length.toLocaleString()}
          </p>
        </header>

        {loading ? (
          <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center">Loading…</p>
        ) : error ? (
          <p className="px-4 py-10 text-[12.5px] text-rose-700 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center">
            {rows.length === 0
              ? 'No campaign sends recorded yet.'
              : 'No recipients match that search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead className="bg-warm-bg/40 text-left text-[10.5px] uppercase tracking-wider text-foreground/55">
                <tr>
                  <Th label="Recipient" sortKey="name" currentKey={sortKey} dir={sortDir} onClick={toggleSort} sticky />
                  <Th label="Company" sortKey="company" currentKey={sortKey} dir={sortDir} onClick={toggleSort} />
                  <Th label="Sends" sortKey="sent_count" currentKey={sortKey} dir={sortDir} onClick={toggleSort} numeric />
                  <Th label="Opens" sortKey="opened_count" currentKey={sortKey} dir={sortDir} onClick={toggleSort} numeric />
                  <Th label="Clicks" sortKey="clicked_count" currentKey={sortKey} dir={sortDir} onClick={toggleSort} numeric />
                  <Th label="Open %" sortKey="open_rate" currentKey={sortKey} dir={sortDir} onClick={toggleSort} numeric />
                  <Th label="Click %" sortKey="click_rate" currentKey={sortKey} dir={sortDir} onClick={toggleSort} numeric />
                  <Th label="CTR" sortKey="click_through" currentKey={sortKey} dir={sortDir} onClick={toggleSort} numeric />
                  <Th label="Bounced" sortKey="bounced_count" currentKey={sortKey} dir={sortDir} onClick={toggleSort} numeric />
                  <Th label="Last sent" sortKey="last_sent_at" currentKey={sortKey} dir={sortDir} onClick={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  // Unsubscribed contacts get a strikethrough on the
                  // name + email plus a small red UNSUBSCRIBED pill so
                  // the marketer sees at a glance that future sends
                  // will skip this row. The line-through is applied
                  // via `text-decoration` so the strikethrough color
                  // matches the foreground text color (Tailwind's
                  // line-through utility on parent + child).
                  const unsubscribed = !!r.unsubscribed_at;
                  return (
                    <tr key={r.contact_id} className={`border-t border-black/5 hover:bg-warm-bg/30 ${unsubscribed ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <p className={`font-semibold truncate max-w-[240px] ${unsubscribed ? 'text-foreground/45 line-through' : 'text-foreground'}`}>
                              {r.name}
                            </p>
                            <p className={`text-[11px] truncate max-w-[240px] ${unsubscribed ? 'text-foreground/40 line-through' : 'text-foreground/55'}`}>
                              {r.email}
                            </p>
                          </div>
                          {unsubscribed && (
                            <span
                              className="shrink-0 mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.12em] bg-rose-100 text-rose-700 ring-1 ring-rose-200 whitespace-nowrap"
                              title={`Unsubscribed ${fmtDate(r.unsubscribed_at)}`}
                            >
                              Unsubscribed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-2 align-top truncate max-w-[200px] ${unsubscribed ? 'text-foreground/40 line-through' : 'text-foreground/75'}`}>{r.company ?? '—'}</td>
                      <td className={`px-3 py-2 text-right tabular-nums align-top ${unsubscribed ? 'text-foreground/40' : ''}`}>{r.sent_count}</td>
                      <td className={`px-3 py-2 text-right tabular-nums align-top ${unsubscribed ? 'text-foreground/40' : ''}`}>{r.opened_count}</td>
                      <td className={`px-3 py-2 text-right tabular-nums align-top ${unsubscribed ? 'text-foreground/40' : ''}`}>{r.clicked_count}</td>
                      <td className={`px-3 py-2 text-right tabular-nums align-top ${unsubscribed ? 'text-foreground/40' : ''}`}>{fmtPct(r.open_rate)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums align-top ${unsubscribed ? 'text-foreground/40' : ''}`}>{fmtPct(r.click_rate)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums align-top ${unsubscribed ? 'text-foreground/40' : ''}`}>{fmtPct(r.click_through)}</td>
                      <td className="px-3 py-2 text-right tabular-nums align-top text-foreground/55">{r.bounced_count > 0 ? r.bounced_count : '—'}</td>
                      <td className={`px-3 py-2 align-top tabular-nums ${unsubscribed ? 'text-foreground/40 line-through' : 'text-foreground/65'}`}>{fmtDate(r.last_sent_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2.5">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  );
}

function Th({
  label,
  sortKey,
  currentKey,
  dir,
  onClick,
  numeric,
  sticky,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  numeric?: boolean;
  sticky?: boolean;
}) {
  const active = sortKey === currentKey;
  return (
    <th
      className={`px-3 py-2 font-semibold ${numeric ? 'text-right' : 'text-left'} ${sticky ? 'sticky left-0 bg-warm-bg/40' : ''}`}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? 'text-foreground' : ''}`}
      >
        {label}
        <span aria-hidden="true" className={`text-[9px] ${active ? 'opacity-90' : 'opacity-30'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

function fmtPct(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '—';
  return `${Math.round(v * 100)}%`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
