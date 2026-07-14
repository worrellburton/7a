'use client';

// Billing — accounts receivable. Shows every INCOMING payment
// (amount > 0) from the Mercury DB mirror (mercury_transactions,
// synced hourly by /api/cron/mercury/sync and on demand from
// /feather/mercury).
//
// Access matches the sidebar + permissions modal exactly: admins,
// plus anyone a super admin explicitly granted /feather/billing to
// in /feather/admin/user-permissions (the eye toggle is the source
// of truth — same pattern as the Content page). The server decides:
// /api/billing/receivables gates via requirePageAccess, and a 403
// here bounces the visitor back to /feather. No duplicate
// client-side role check — that's what once let the modal say
// "visible" while the page bounced the user anyway.
//
// Every row expands (click it) into a detail panel that renders the
// FULL Mercury transaction object — bank description, GL
// allocations, check number, estimated delivery, attachments,
// counterparty ids, receipt flags — plus a raw-JSON fallback so
// nothing Mercury adds later can hide. The header's Download CSV
// button exports every matching row with the same fields.
//
// The Stedi claims surface that used to live here (patients → claims
// → pipeline) survives at /feather/rcm-pipeline; this page is now
// purely the money-in view.

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';

interface AccountRow {
  id: string;
  nickname: string | null;
  name: string;
  account_number_last4: string | null;
  currency: string | null;
  last_synced_at: string;
}

type RawTxn = Record<string, unknown>;

interface ReceivableRow {
  id: string;
  account_id: string;
  posted_at: string | null;
  created_at_mercury: string;
  amount: number;
  currency: string | null;
  status: string | null;
  kind: string | null;
  counterparty_name: string | null;
  counterparty_id: string | null;
  note: string | null;
  external_memo: string | null;
  dashboard_link: string | null;
  fetched_at: string | null;
  raw: RawTxn | null;
}

interface Summary {
  total_sum: number;
  total_count: number;
  pending_sum: number;
  pending_count: number;
  month_sum: number;
  month_count: number;
  truncated: boolean;
}

const PAGE_SIZE = 100;

function fmtMoney(amount: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || ''}`.trim();
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Raw Mercury payload readers ─────────────────────────────────
// The `raw` column is Mercury's whole transaction object. These
// narrow unknown values so the detail panel can render every field
// without trusting the shape.

function rawStr(raw: RawTxn | null, key: string): string | null {
  const v = raw?.[key];
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function rawBool(raw: RawTxn | null, key: string): boolean | null {
  const v = raw?.[key];
  return typeof v === 'boolean' ? v : null;
}

function rawArray(raw: RawTxn | null, key: string): unknown[] {
  const v = raw?.[key];
  return Array.isArray(v) ? v : [];
}

interface GlAllocation {
  amount?: number;
  glCodeName?: string;
}

function glAllocationsOf(raw: RawTxn | null): GlAllocation[] {
  return rawArray(raw, 'glAllocations').filter(
    (g): g is GlAllocation => !!g && typeof g === 'object',
  );
}

// The row's bookkeeping category — GL allocation code(s), falling
// back to Mercury's own category fields.
function categoryOf(r: ReceivableRow): string | null {
  const gl = glAllocationsOf(r.raw)
    .map((g) => g.glCodeName)
    .filter((n): n is string => typeof n === 'string' && n !== '');
  if (gl.length > 0) return Array.from(new Set(gl)).join(' · ');
  return rawStr(r.raw, 'generalLedgerCodeName') ?? rawStr(r.raw, 'mercuryCategory');
}

// Status pill colors. Mercury statuses: pending (in flight — the
// truest "receivable"), sent (settled), cancelled / failed (dead).
function statusPill(status: string | null): string {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'sent':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelled':
    case 'failed':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-foreground/5 text-foreground/55 border-foreground/15';
  }
}

// Expanded-row detail panel: every field Mercury gives us for the
// transaction, labelled and formatted, empties skipped, with the raw
// JSON underneath as the catch-all for anything not covered above.
function ReceivableDetail({ r, accountLabel }: { r: ReceivableRow; accountLabel: string | null }) {
  const raw = r.raw;
  const gl = glAllocationsOf(raw);
  const attachments = rawArray(raw, 'attachments');
  const related = rawArray(raw, 'relatedTransactions');
  const cx = raw?.currencyExchangeInfo;
  const yesNo = (v: boolean | null) => (v === null ? null : v ? 'Yes' : 'No');

  const fields: Array<{ label: string; value: string | null }> = [
    { label: 'Account', value: accountLabel },
    { label: 'Kind', value: r.kind },
    { label: 'Posted', value: fmtDateTime(r.posted_at) },
    { label: 'Created', value: fmtDateTime(r.created_at_mercury) },
    { label: 'Estimated delivery', value: fmtDateTime(rawStr(raw, 'estimatedDeliveryDate')) },
    { label: 'Bank description', value: rawStr(raw, 'bankDescription') },
    { label: 'Note', value: r.note },
    { label: 'External memo', value: r.external_memo },
    {
      label: 'GL allocations',
      value:
        gl.length > 0
          ? gl
              .map((g) => `${g.glCodeName || '—'} — ${fmtMoney(typeof g.amount === 'number' ? g.amount : 0, r.currency)}`)
              .join(' · ')
          : null,
    },
    { label: 'GL code', value: rawStr(raw, 'generalLedgerCodeName') },
    { label: 'Mercury category', value: rawStr(raw, 'mercuryCategory') },
    { label: 'Check number', value: rawStr(raw, 'checkNumber') },
    { label: 'Tracking number', value: rawStr(raw, 'trackingNumber') },
    { label: 'Merchant', value: rawStr(raw, 'merchant') },
    { label: 'Failed at', value: fmtDateTime(rawStr(raw, 'failedAt')) },
    { label: 'Failure reason', value: rawStr(raw, 'reasonForFailure') },
    { label: 'Currency', value: r.currency },
    { label: 'Currency exchange', value: cx && typeof cx === 'object' ? JSON.stringify(cx) : null },
    { label: 'Attachments', value: attachments.length > 0 ? String(attachments.length) : null },
    { label: 'Related transactions', value: related.length > 0 ? String(related.length) : null },
    { label: 'Receipt generated', value: yesNo(rawBool(raw, 'hasGeneratedReceipt')) },
    { label: 'Receipt policy compliant', value: yesNo(rawBool(raw, 'compliantWithReceiptPolicy')) },
    { label: 'Counterparty nickname', value: rawStr(raw, 'counterpartyNickname') },
    { label: 'Counterparty ID', value: r.counterparty_id },
    { label: 'Fee ID', value: rawStr(raw, 'feeId') },
    { label: 'Request ID', value: rawStr(raw, 'requestId') },
    { label: 'Credit account period', value: rawStr(raw, 'creditAccountPeriodId') },
    { label: 'Transaction ID', value: r.id },
    { label: 'Last synced', value: r.fetched_at ? relativeTime(r.fetched_at) : null },
  ].filter((f): f is { label: string; value: string } => f.value !== null && f.value !== '');

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45 font-semibold">
              {f.label}
            </div>
            <div className="text-sm text-foreground/80 break-words">{f.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {r.dashboard_link && (
          <a
            href={r.dashboard_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80"
          >
            Open in Mercury ↗
          </a>
        )}
        <details onClick={(e) => e.stopPropagation()}>
          <summary className="text-xs text-foreground/45 cursor-pointer hover:text-foreground/70">
            Raw Mercury JSON
          </summary>
          <pre className="mt-2 text-[11px] bg-foreground/[0.04] rounded-lg p-3 overflow-auto max-h-72 text-foreground/70">
            {JSON.stringify(raw ?? r, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default function BillingContent() {
  const { session } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const refresh = useCallback(async (resetOffset = false) => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (accountFilter) params.set('account_id', accountFilter);
      if (debouncedQuery) params.set('q', debouncedQuery);
      const nextOffset = resetOffset ? 0 : offset;
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(nextOffset));
      if (resetOffset && offset !== 0) setOffset(0);
      const res = await fetch(`/api/billing/receivables?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 403) {
        // Not granted — the server gate is the single source of
        // truth for who sees this page. Send them home.
        router.replace('/feather');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        accounts: AccountRow[];
        receivables: ReceivableRow[];
        total: number;
        summary: Summary;
      };
      setAccounts(json.accounts);
      setReceivables(json.receivables);
      setTotal(json.total);
      setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, accountFilter, debouncedQuery, offset, router]);

  // Reload when filters change (resets pagination).
  useEffect(() => {
    refresh(true);
    // Intentionally omit refresh itself — including it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, accountFilter, debouncedQuery]);

  // Reload when page changes (no reset).
  useEffect(() => {
    refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const accountLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) {
      map.set(a.id, a.nickname || a.name);
    }
    return map;
  }, [accounts]);

  const lastSyncAt = useMemo(() => {
    if (accounts.length === 0) return null;
    const max = accounts.reduce((acc, a) => {
      const t = new Date(a.last_synced_at).getTime();
      return t > acc ? t : acc;
    }, 0);
    return max > 0 ? new Date(max).toISOString() : null;
  }, [accounts]);

  // CSV export honours the active filters (same params as the table).
  const csvHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (accountFilter) params.set('account_id', accountFilter);
    if (debouncedQuery) params.set('q', debouncedQuery);
    return `/api/billing/receivables?${params.toString()}`;
  }, [accountFilter, debouncedQuery]);

  const currency = accounts[0]?.currency ?? 'USD';
  const hasNextPage = offset + receivables.length < total;
  const hasPrevPage = offset > 0;

  // First load (or access check) still in flight — hold a quiet
  // loading state instead of flashing an empty dashboard.
  if (loading && !summary) {
    return (
      <div className="p-8 text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/45 font-semibold">
            Bookkeeping
          </p>
          <h1
            className="text-2xl lg:text-3xl font-bold text-foreground leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Billing · Accounts receivable
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            {accounts.length === 0
              ? 'No Mercury data yet — run a sync from the Mercury page first.'
              : `Incoming payments across ${accounts.length} account${accounts.length === 1 ? '' : 's'} · last sync ${relativeTime(lastSyncAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={csvHref}
            download
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-foreground/15 text-sm font-semibold text-foreground shadow-sm hover:border-primary/45 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M4 21h16" />
            </svg>
            Download CSV
          </a>
          <Link
            href="/feather/mercury"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-foreground text-white text-sm font-semibold shadow-sm hover:bg-foreground/85 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Sync on Mercury page
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Summary tiles — whole-book numbers for the selected account
          (or all accounts), independent of the text search below. */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border-white/80">
            <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-semibold">
              Pending incoming
            </div>
            <div className="mt-2 text-xl font-bold tabular-nums text-amber-700" style={{ fontFamily: 'var(--font-display)' }}>
              {fmtMoney(summary.pending_sum, currency)}
            </div>
            <div className="text-[11px] text-foreground/55">
              {summary.pending_count} payment{summary.pending_count === 1 ? '' : 's'} in flight
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border-white/80">
            <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-semibold">
              Received this month
            </div>
            <div className="mt-2 text-xl font-bold tabular-nums text-emerald-700" style={{ fontFamily: 'var(--font-display)' }}>
              {fmtMoney(summary.month_sum, currency)}
            </div>
            <div className="text-[11px] text-foreground/55">
              {summary.month_count} payment{summary.month_count === 1 ? '' : 's'}
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border-white/80">
            <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-semibold">
              All-time incoming
            </div>
            <div className="mt-2 text-xl font-bold tabular-nums text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              {fmtMoney(summary.total_sum, currency)}
            </div>
            <div className="text-[11px] text-foreground/55">
              {summary.total_count} payment{summary.total_count === 1 ? '' : 's'}
              {summary.truncated ? ' · summary truncated' : ''}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search payer or memo…"
          className="flex-1 min-w-[200px] h-10 px-4 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        {accounts.length > 1 && (
          <select
            value={accountFilter ?? ''}
            onChange={(e) => setAccountFilter(e.target.value || null)}
            className="h-10 pl-4 pr-8 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.nickname || a.name) + (a.account_number_last4 ? ` ··${a.account_number_last4}` : '')}
              </option>
            ))}
          </select>
        )}
        {(accountFilter || query) && (
          <button
            type="button"
            onClick={() => { setAccountFilter(null); setQuery(''); }}
            className="text-xs text-foreground/55 hover:text-foreground underline-offset-2 hover:underline px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="rounded-xl bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-foreground/55 text-[11px] uppercase tracking-[0.14em]">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Date</th>
                <th className="text-left font-semibold px-4 py-3">From</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Account</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Category</th>
                <th className="text-left font-semibold px-4 py-3 hidden xl:table-cell">Memo</th>
                <th className="text-right font-semibold px-4 py-3">Amount</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {loading && receivables.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-foreground/50">
                    Loading receivables…
                  </td>
                </tr>
              )}
              {!loading && receivables.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-foreground/50">
                    No incoming receivables{debouncedQuery || accountFilter ? ' match the current filters' : ' yet'}.{' '}
                    {!debouncedQuery && !accountFilter && (
                      <>
                        Run a sync from the{' '}
                        <Link href="/feather/mercury" className="text-primary underline underline-offset-2">
                          Mercury page
                        </Link>{' '}
                        to pull them in.
                      </>
                    )}
                  </td>
                </tr>
              )}
              {receivables.map((r) => {
                // Memo prefers the human-entered note, then Mercury's
                // external memo, then the bank statement line — the
                // screenshot rows that looked empty usually DO carry a
                // bankDescription (e.g. "PAY PLUS; HCCLAIMPMT; …").
                const memo = r.note || r.external_memo || rawStr(r.raw, 'bankDescription');
                const category = categoryOf(r);
                const expanded = expandedId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                      className="border-t border-foreground/5 hover:bg-foreground/[0.025] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-foreground/70 tabular-nums">
                        {fmtDate(r.posted_at ?? r.created_at_mercury)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[220px]">
                        <span className="block truncate" title={r.counterparty_name ?? undefined}>
                          {r.counterparty_name || '—'}
                        </span>
                        {r.kind && (
                          <span className="block text-[11px] font-normal text-foreground/45">{r.kind}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/60 whitespace-nowrap hidden md:table-cell">
                        {accountLabelById.get(r.account_id) || '—'}
                      </td>
                      <td className="px-4 py-3 text-foreground/60 max-w-[220px] hidden lg:table-cell">
                        <span className="block truncate" title={category ?? undefined}>{category || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground/55 max-w-[280px] hidden xl:table-cell">
                        <span className="block truncate" title={memo ?? undefined}>{memo || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700 whitespace-nowrap">
                        +{fmtMoney(r.amount, r.currency)}
                      </td>
                      <td className="px-4 py-3">
                        {r.dashboard_link ? (
                          <a
                            href={r.dashboard_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Mercury"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium hover:opacity-80 ${statusPill(r.status)}`}
                          >
                            {r.status || '—'}
                          </a>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusPill(r.status)}`}>
                            {r.status || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <svg
                          className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-foreground/5 bg-foreground/[0.02]">
                        <td colSpan={8}>
                          <ReceivableDetail r={r} accountLabel={accountLabelById.get(r.account_id) ?? null} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {(hasPrevPage || hasNextPage) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-foreground/5 text-xs text-foreground/55">
            <span>
              {total === 0
                ? '0 receivables'
                : `${offset + 1}–${offset + receivables.length} of ${total.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={!hasPrevPage || loading}
                className="px-3 py-1.5 rounded-full border border-foreground/15 font-medium hover:bg-foreground/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={!hasNextPage || loading}
                className="px-3 py-1.5 rounded-full border border-foreground/15 font-medium hover:bg-foreground/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
