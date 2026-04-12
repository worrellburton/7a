'use client';

// ------------------------------------------------------------
// Accounts Receivables — lists every Income-classified account from
// QuickBooks for the selected realm. Think of it as the "revenue side"
// counterpart to the Finance page's expense-oriented budget table.
// ------------------------------------------------------------

import { useAuth } from '@/lib/AuthProvider';
import {
  QuickBooksGettingStarted,
  QuickBooksHeader,
  QuickBooksRealmPicker,
  QuickBooksToast,
  useQuickBooksConnection,
} from '@/lib/QuickBooksConnection';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface QboAccount {
  Id: string;
  Name: string;
  AcctNum?: string;
  AccountType?: string;
  AccountSubType?: string;
  Classification?: string;
  CurrentBalance?: number;
  Active?: boolean;
  ParentRef?: { value: string };
  FullyQualifiedName?: string;
}

interface AccountsResponse {
  QueryResponse?: { Account?: QboAccount[] };
}

function fmtMoney(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export default function AccountsReceivablesContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const {
    companies,
    selectedRealm,
    setSelectedRealm,
    loadingList,
    hasCompanies,
    error,
    setError,
    toast,
    handleConnect,
    handleDisconnect,
  } = useQuickBooksConnection();

  const [accounts, setAccounts] = useState<QboAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Admin gate
  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) router.replace('/app');
  }, [session, isAdmin, router]);

  const loadAccounts = useCallback(
    async (realmId: string) => {
      setLoading(true);
      setError(null);
      setAccounts([]);
      try {
        const res = await fetch(
          `/api/quickbooks/data?report=accounts&realm_id=${encodeURIComponent(realmId)}`,
          { credentials: 'include' }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }));
          setError(body.error || `Request failed (${res.status})`);
          return;
        }
        const data = (await res.json()) as AccountsResponse;
        setAccounts(data.QueryResponse?.Account || []);
        setLastUpdated(new Date().toISOString());
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [setError]
  );

  useEffect(() => {
    if (!selectedRealm) return;
    loadAccounts(selectedRealm);
  }, [selectedRealm, loadAccounts]);

  // Only Income-classified accounts. QBO uses Classification="Revenue"
  // for both Income and Other Income. We also include AccountType
  // Income / Other Income as a fallback for any charts of accounts where
  // Classification isn't populated.
  const incomeAccounts = useMemo(() => {
    const list = accounts.filter((a) => {
      const isIncomeType = a.AccountType === 'Income' || a.AccountType === 'Other Income';
      const isRevenue = a.Classification === 'Revenue';
      return (isIncomeType || isRevenue) && a.Active !== false;
    });
    // Sort by AcctNum (natural) then name.
    return [...list].sort((a, b) => {
      const an = a.AcctNum || '';
      const bn = b.AcctNum || '';
      if (an && bn) return an.localeCompare(bn, undefined, { numeric: true });
      if (an && !bn) return -1;
      if (!an && bn) return 1;
      return (a.Name || '').localeCompare(b.Name || '');
    });
  }, [accounts]);

  const total = incomeAccounts.reduce((s, a) => s + (a.CurrentBalance || 0), 0);

  if (!user || !isAdmin) return null;

  return (
    <div className="p-6 lg:p-10">
      <QuickBooksHeader
        title="Accounts Receivables"
        subtitle="Every income-classified account pulled live from QuickBooks."
        hasCompanies={hasCompanies}
        selectedRealm={selectedRealm}
        lastUpdated={lastUpdated}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {loadingList ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {hasCompanies && companies && (
            <QuickBooksRealmPicker
              companies={companies}
              selectedRealm={selectedRealm}
              onSelect={setSelectedRealm}
            />
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>
                {error}
              </p>
            </div>
          )}

          {!hasCompanies && !error && <QuickBooksGettingStarted />}

          {hasCompanies && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : incomeAccounts.length === 0 ? (
                <p className="text-sm text-foreground/40 text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
                  No income accounts found for this company.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-warm-bg/40">
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider w-24" style={{ fontFamily: 'var(--font-body)' }}>#</th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Account</th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Subtype</th>
                        <th className="text-right px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeAccounts.map((a) => (
                        <tr key={a.Id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/20 transition-colors">
                          <td className="px-6 py-3 text-xs font-mono text-foreground/60 tabular-nums">{a.AcctNum || '—'}</td>
                          <td className="px-6 py-3 text-sm font-medium text-foreground">{a.Name}</td>
                          <td className="px-6 py-3 text-xs text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{a.AccountType || '—'}</td>
                          <td className="px-6 py-3 text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{a.AccountSubType || '—'}</td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-foreground tabular-nums">{fmtMoney(a.CurrentBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-warm-bg/30 font-semibold">
                        <td className="px-6 py-4 text-xs uppercase tracking-wider text-foreground/60" style={{ fontFamily: 'var(--font-body)' }} colSpan={4}>
                          Total · {incomeAccounts.length} {incomeAccounts.length === 1 ? 'account' : 'accounts'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-foreground tabular-nums">{fmtMoney(total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <QuickBooksToast toast={toast} />
    </div>
  );
}
