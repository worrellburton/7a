'use client';

// Billing — accounts receivable. Shows every INCOMING payment
// (amount > 0) from the Mercury DB mirror (mercury_transactions,
// synced hourly by /api/cron/mercury/sync and on demand from
// /feather/mercury). Super admin only — the runtime guard mirrors
// Mercury / Kaizen / Social Media: the page registers as adminOnly +
// superAdminOnly in PagePermissions, this effect bounces non-super
// admins who navigate in directly, and the backing
// /api/billing/receivables route enforces requireSuperAdmin
// server-side.
//
// The Stedi claims surface that used to live here (patients → claims
// → pipeline) survives at /feather/rcm-pipeline; this page is now
// purely the money-in view.

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  note: string | null;
  external_memo: string | null;
  dashboard_link: string | null;
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

export default function BillingContent() {
  const { session, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Super-admin gate.
  useEffect(() => {
    if (authLoading) return;
    if (!session?.access_token) return;
    if (!isSuperAdmin) router.replace('/feather');
  }, [authLoading, session?.access_token, isSuperAdmin, router]);

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
  }, [session?.access_token, accountFilter, debouncedQuery, offset]);

  // Reload when filters change (resets pagination).
  useEffect(() => {
    if (!isSuperAdmin) return;
    refresh(true);
    // Intentionally omit refresh itself — including it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, accountFilter, debouncedQuery]);

  // Reload when page changes (no reset).
  useEffect(() => {
    if (!isSuperAdmin) return;
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

  const currency = accounts[0]?.currency ?? 'USD';
  const hasNextPage = offset + receivables.length < total;
  const hasPrevPage = offset > 0;

  if (!isSuperAdmin) {
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
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Memo</th>
                <th className="text-right font-semibold px-4 py-3">Amount</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && receivables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-foreground/50">
                    Loading receivables…
                  </td>
                </tr>
              )}
              {!loading && receivables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-foreground/50">
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
                const memo = r.note || r.external_memo;
                return (
                  <tr key={r.id} className="border-t border-foreground/5 hover:bg-foreground/[0.025] transition-colors">
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
                    <td className="px-4 py-3 text-foreground/55 max-w-[280px] hidden lg:table-cell">
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
                  </tr>
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
