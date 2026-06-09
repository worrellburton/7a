'use client';

// Mercury — raw bank-account + transaction mirror. Read-only phase
// of the build-our-own-bookkeeping arc; subsequent waves layer
// chart-of-accounts + categorization on top of this table. Super
// admin only; the runtime guard mirrors Kaizen / Levers / Social
// Media (page registered as adminOnly in PagePermissions, this
// effect bounces non-super admins who navigate in directly).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

interface AccountRow {
  id: string;
  nickname: string | null;
  name: string;
  kind: string | null;
  type: string | null;
  account_number_last4: string | null;
  status: string | null;
  balance: number | null;
  available_balance: number | null;
  currency: string | null;
  dashboard_link: string | null;
  last_synced_at: string;
  sync_transactions: boolean;
}

interface TxnRow {
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

interface SyncResult {
  ok: true;
  duration_ms: number;
  accounts_synced: number;
  accounts_pruned?: number;
  transactions_upserted: number;
  results: Array<{
    account_id: string;
    name: string;
    transactions_fetched: number;
    transactions_upserted: number;
    error?: string;
  }>;
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

function fmtDateTime(iso: string | null): string {
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

export default function MercuryContent() {
  const { session, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TxnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Super-admin gate.
  useEffect(() => {
    if (authLoading) return;
    if (!session?.access_token) return;
    if (!isSuperAdmin) router.replace('/app');
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
      const res = await fetch(`/api/mercury/data?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        accounts: AccountRow[];
        transactions: TxnRow[];
        total: number;
      };
      setAccounts(json.accounts);
      setTransactions(json.transactions);
      setTotal(json.total);
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

  const toggleSync = useCallback(async (accountId: string, next: boolean) => {
    if (!session?.access_token) return;
    // Optimistic update so the toggle feels immediate.
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, sync_transactions: next } : a)));
    try {
      const res = await fetch(`/api/mercury/accounts/${encodeURIComponent(accountId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sync_transactions: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      // Revert on failure.
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, sync_transactions: !next } : a)));
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [session?.access_token]);

  const runSync = useCallback(async () => {
    if (!session?.access_token || syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/mercury/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const json = (await res.json()) as SyncResult | { error: string };
      if (!res.ok || 'error' in json) {
        const msg = 'error' in json ? json.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const prunedNote =
        json.accounts_pruned && json.accounts_pruned > 0
          ? ` · pruned ${json.accounts_pruned}`
          : '';
      setSyncMessage(
        `Synced ${json.accounts_synced} account${json.accounts_synced === 1 ? '' : 's'}${prunedNote} · ${json.transactions_upserted.toLocaleString()} transactions in ${(json.duration_ms / 1000).toFixed(1)}s`,
      );
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }, [session?.access_token, syncing, refresh]);

  const visibleAccount = accountFilter
    ? accounts.find((a) => a.id === accountFilter) ?? null
    : null;
  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0),
    [accounts],
  );
  const lastSyncAt = useMemo(() => {
    if (accounts.length === 0) return null;
    const max = accounts.reduce((acc, a) => {
      const t = new Date(a.last_synced_at).getTime();
      return t > acc ? t : acc;
    }, 0);
    return max > 0 ? new Date(max).toISOString() : null;
  }, [accounts]);

  const hasNextPage = offset + transactions.length < total;
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
            Mercury
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            {accounts.length === 0
              ? 'No accounts synced yet. Click Sync to pull from Mercury.'
              : `${accounts.length} account${accounts.length === 1 ? '' : 's'} · ${fmtMoney(totalBalance, accounts[0]?.currency ?? 'USD')} total · last sync ${relativeTime(lastSyncAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncMessage && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
              {syncMessage}
            </span>
          )}
          <button
            type="button"
            onClick={runSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-foreground text-white text-sm font-semibold shadow-sm hover:bg-foreground/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {syncing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Sync from Mercury
              </>
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((a) => {
            const active = accountFilter === a.id;
            const tracked = a.sync_transactions !== false;
            return (
              <div
                key={a.id}
                onClick={() => setAccountFilter(active ? null : a.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAccountFilter(active ? null : a.id);
                  }
                }}
                className={`relative text-left p-4 rounded-xl border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  active
                    ? 'bg-foreground text-white border-foreground shadow-md'
                    : tracked
                      ? 'bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border-white/80 hover:border-primary/45'
                      : 'bg-white/40 supports-[backdrop-filter]:bg-white/30 backdrop-blur-md border-white/60 hover:border-primary/30 opacity-70'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 pr-16">
                  <span className="text-sm font-semibold truncate">
                    {a.nickname || a.name}
                  </span>
                  {a.account_number_last4 && (
                    <span className={`text-[10px] tabular-nums ${active ? 'text-white/70' : 'text-foreground/45'}`}>
                      ··{a.account_number_last4}
                    </span>
                  )}
                </div>
                <div className={`mt-2 text-xl font-bold tabular-nums ${active ? 'text-white' : 'text-foreground'}`} style={{ fontFamily: 'var(--font-display)' }}>
                  {fmtMoney(a.balance ?? 0, a.currency)}
                </div>
                <div className={`text-[11px] ${active ? 'text-white/70' : 'text-foreground/55'}`}>
                  {a.type || a.kind || 'account'}{a.status ? ` · ${a.status}` : ''}
                  {!tracked && (
                    <span className={`ml-2 ${active ? 'text-white/85' : 'text-amber-700'}`}>· not synced</span>
                  )}
                </div>
                {/* Track toggle — pill in the top-right. Stops
                    propagation so clicking it doesn't also fire the
                    card's filter click. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSync(a.id, !tracked);
                  }}
                  title={tracked ? 'Click to stop syncing this account\'s transactions' : 'Click to start syncing this account\'s transactions'}
                  aria-pressed={tracked}
                  className={`absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-1 rounded-full border transition-colors ${
                    tracked
                      ? active
                        ? 'bg-white/15 border-white/40 text-white hover:bg-white/25'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : active
                        ? 'bg-white/10 border-white/30 text-white/80 hover:bg-white/20'
                        : 'bg-foreground/5 border-foreground/15 text-foreground/55 hover:bg-foreground/10'
                  }`}
                >
                  {tracked ? 'Synced' : 'Paused'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search counterparty or memo…"
          className="flex-1 min-w-[200px] h-10 px-4 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
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
                <th className="text-left font-semibold px-4 py-3">Counterparty</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Kind</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Memo</th>
                <th className="text-right font-semibold px-4 py-3">Amount</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-foreground/45">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-foreground/45">
                    {accounts.length === 0
                      ? 'Run Sync to pull transactions from Mercury.'
                      : 'No transactions match.'}
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-foreground/5 hover:bg-foreground/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap text-foreground/75 tabular-nums">
                    {fmtDateTime(t.posted_at ?? t.created_at_mercury)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {t.dashboard_link ? (
                      <a
                        href={t.dashboard_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline underline-offset-2"
                      >
                        {t.counterparty_name || '(no counterparty)'}
                      </a>
                    ) : (
                      t.counterparty_name || '(no counterparty)'
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground/55 hidden md:table-cell text-[12px]">
                    {t.kind || '—'}
                  </td>
                  <td className="px-4 py-3 text-foreground/55 hidden lg:table-cell text-[12px] max-w-[260px] truncate">
                    {t.note || t.external_memo || ''}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${t.amount < 0 ? 'text-foreground' : 'text-emerald-700'}`}>
                    {fmtMoney(t.amount, t.currency)}
                  </td>
                  <td className="px-4 py-3 text-[11px]">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${
                      t.status === 'sent' || t.status === 'posted'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : t.status === 'pending'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : t.status === 'failed' || t.status === 'cancelled'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-foreground/5 text-foreground/55 border border-foreground/10'
                    }`}>
                      {t.status || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-foreground/5 text-xs text-foreground/55">
            <span>
              {visibleAccount ? visibleAccount.nickname || visibleAccount.name : 'All accounts'}
              {' · '}
              Showing {offset + 1}-{offset + transactions.length} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={!hasPrevPage || loading}
                className="h-8 px-3 rounded-full bg-white border border-foreground/10 text-foreground hover:bg-foreground/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={!hasNextPage || loading}
                className="h-8 px-3 rounded-full bg-white border border-foreground/10 text-foreground hover:bg-foreground/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
