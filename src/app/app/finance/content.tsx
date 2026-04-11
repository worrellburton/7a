'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BudgetSheet from './BudgetSheet';

// ------------------------------------------------------------
// Multi-tenant QuickBooks finance page.
//
// `quickbooks_tokens` holds one row per connected Intuit company. This page:
//   1. Lists connected companies via /api/quickbooks/data?report=list
//   2. Lets an admin pick one, or Connect another via OAuth
//   3. Fetches reports for the selected realm via
//      /api/quickbooks/data?report=<type>&realm_id=<id>
//
// Reports use QBO's generic {Header, Columns, Rows} shape; we render them
// with a single recursive table component that flattens nested row groups
// into visually indented sections.
// ------------------------------------------------------------

interface Company {
  realm_id: string;
  expires_at: string;
  updated_at: string;
}

interface CompanyInfo {
  CompanyInfo?: {
    CompanyName: string;
    LegalName?: string;
    CompanyAddr?: { Line1?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string };
    PrimaryPhone?: { FreeFormNumber?: string };
    Email?: { Address?: string };
    Country?: string;
    FiscalYearStartMonth?: string;
  };
}

interface Account {
  Id: string;
  Name: string;
  AccountType?: string;
  AccountSubType?: string;
  Classification?: string;
  CurrentBalance?: number;
  Active?: boolean;
}

interface AccountsResponse {
  QueryResponse?: { Account?: Account[] };
}

// QBO report shape — recursive rows.
interface ReportColData {
  value?: string;
  id?: string;
}
interface ReportRow {
  ColData?: ReportColData[];
  Rows?: { Row?: ReportRow[] };
  Summary?: { ColData?: ReportColData[] };
  Header?: { ColData?: ReportColData[] };
  type?: string;
  group?: string;
}
interface ReportResponse {
  Header?: { Time?: string; ReportName?: string; DateMacro?: string; StartPeriod?: string; EndPeriod?: string };
  Columns?: { Column?: Array<{ ColTitle?: string; ColType?: string }> };
  Rows?: { Row?: ReportRow[] };
}

type Tab =
  | 'budget'
  | 'company'
  | 'accounts'
  | 'profit-loss'
  | 'profit-loss-monthly'
  | 'balance-sheet'
  | 'trial-balance'
  | 'general-ledger';

// `report: null` marks tabs that don't hit QuickBooks (pure client-side views).
const TABS: Array<{ id: Tab; label: string; report: string | null }> = [
  { id: 'budget', label: 'Budget', report: null },
  { id: 'company', label: 'Company', report: 'company-info' },
  { id: 'accounts', label: 'Accounts', report: 'accounts' },
  { id: 'profit-loss', label: 'P&L', report: 'profit-loss' },
  { id: 'profit-loss-monthly', label: 'P&L Monthly', report: 'profit-loss-monthly' },
  { id: 'balance-sheet', label: 'Balance Sheet', report: 'balance-sheet' },
  { id: 'trial-balance', label: 'Trial Balance', report: 'trial-balance' },
  { id: 'general-ledger', label: 'General Ledger', report: 'general-ledger' },
];

// Human-readable relative time for the "last updated" indicator.
function fmtRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtMoney(n: number | undefined) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export default function FinanceContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useModal();

  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [selectedRealm, setSelectedRealm] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('budget');
  const [reportData, setReportData] = useState<unknown>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Timestamp of the last successful QuickBooks data fetch for the current
  // realm + tab. Shown in the header so admins can tell how stale the
  // report is at a glance.
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  // Re-render trigger so "3 min ago" keeps ticking without another fetch.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Surface OAuth callback feedback
  useEffect(() => {
    const err = searchParams.get('error');
    const connected = searchParams.get('connected');
    const justConnectedRealm = searchParams.get('realm_id');
    if (err) {
      setError(decodeURIComponent(err));
    } else if (connected) {
      showToast('QuickBooks connected successfully');
      if (justConnectedRealm) setSelectedRealm(justConnectedRealm);
    }
  }, [searchParams]);

  // Admin gate
  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) {
      router.replace('/app');
    }
  }, [session, isAdmin, router]);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/quickbooks/data?report=list', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403) setError('Admin access required');
        else if (res.status === 401) setError('Please sign in');
        return;
      }
      const body = (await res.json()) as { companies?: Company[] };
      const list = body.companies || [];
      setCompanies(list);
      // Auto-select first if nothing chosen yet
      setSelectedRealm((cur) => cur ?? (list[0]?.realm_id ?? null));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    if (!session?.access_token || !isAdmin) return;
    loadCompanies();
  }, [session, isAdmin, loadCompanies]);

  const loadReport = useCallback(
    async (realmId: string, reportName: string) => {
      setFetching(true);
      setError(null);
      setReportData(null);
      try {
        const res = await fetch(
          `/api/quickbooks/data?report=${reportName}&realm_id=${encodeURIComponent(realmId)}`,
          { credentials: 'include' }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }));
          setError(body.error || `Request failed (${res.status})`);
          return;
        }
        const data = await res.json();
        setReportData(data);
        setLastUpdated(new Date().toISOString());
      } catch (e) {
        setError(String(e));
      } finally {
        setFetching(false);
      }
    },
    []
  );

  // When realm or tab changes, fetch the matching report. Tabs with a null
  // `report` field are client-rendered (Budget sheet) and skip the fetch.
  useEffect(() => {
    if (!selectedRealm) return;
    const t = TABS.find((x) => x.id === tab);
    if (!t || !t.report) return;
    loadReport(selectedRealm, t.report);
  }, [selectedRealm, tab, loadReport]);

  function handleConnect() {
    window.location.href = '/api/quickbooks/auth';
  }

  async function handleDisconnect() {
    if (!selectedRealm) return;
    const ok = await confirm('Disconnect this QuickBooks company?', {
      message: `Realm ${selectedRealm} will be revoked at Intuit. You can reconnect at any time.`,
      confirmLabel: 'Disconnect',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(
      `/api/quickbooks/disconnect?realm_id=${encodeURIComponent(selectedRealm)}`,
      { method: 'POST', credentials: 'include' }
    );
    if (res.ok) {
      showToast('Disconnected');
      setSelectedRealm(null);
      setReportData(null);
      loadCompanies();
    } else {
      showToast('Failed to disconnect');
    }
  }

  if (!user || !isAdmin) return null;

  const loadingList = companies === null;
  const hasCompanies = !!companies && companies.length > 0;

  return (
    <div className="p-6 lg:p-10">
      {/* Header row: title left, connection status + actions right */}
      <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Finance</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Connect QuickBooks Online companies to pull reports, balances, and transactions.
          </p>
        </div>
        <div className="flex items-start gap-3">
          {hasCompanies ? (
            <div className="flex flex-col items-end gap-1.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
                  Connected to QuickBooks
                </span>
              </div>
              {lastUpdated && (
                <p className="text-[11px] text-foreground/40 tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                  Updated {fmtRelativeTime(lastUpdated)}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={handleConnect}
                  className="px-3.5 py-1.5 bg-[#2ca01c] text-white rounded-full text-[11px] font-semibold uppercase tracking-wider hover:bg-[#248a17] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Connect another
                </button>
                {selectedRealm && (
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 text-red-600 rounded-full text-[11px] font-semibold uppercase tracking-wider hover:bg-red-50 transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-5 py-2.5 bg-[#2ca01c] text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#248a17] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Connect to QuickBooks
            </button>
          )}
        </div>
      </div>

      {loadingList ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Realm picker — only when multiple companies are connected */}
          {hasCompanies && companies!.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {companies!.map((c) => (
                <button
                  key={c.realm_id}
                  onClick={() => setSelectedRealm(c.realm_id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedRealm === c.realm_id
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-warm-bg/50 border-gray-200 text-foreground/60 hover:bg-warm-bg'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Realm {c.realm_id}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>
                {error}
              </p>
            </div>
          )}

          {!hasCompanies && !error && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                Getting started
              </p>
              <p className="text-xs text-amber-800" style={{ fontFamily: 'var(--font-body)' }}>
                Click <strong>Connect to QuickBooks</strong> to authorize an Intuit company. Make sure{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded">QUICKBOOKS_CLIENT_ID</code> and{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded">QUICKBOOKS_CLIENT_SECRET</code> are set
                in the deployment env, and the redirect URI{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/quickbooks/callback
                </code>{' '}
                is registered on Intuit&apos;s developer portal.
              </p>
            </div>
          )}

          {/* Tabs + body. Budget tab is client-rendered and always
              available; other tabs require a selected realm. */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 bg-warm-bg/20">
              {TABS.map((t) => {
                const disabled = t.report !== null && !selectedRealm;
                return (
                  <button
                    key={t.id}
                    onClick={() => !disabled && setTab(t.id)}
                    disabled={disabled}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                      tab === t.id
                        ? 'bg-primary text-white'
                        : disabled
                        ? 'text-foreground/25 cursor-not-allowed'
                        : 'text-foreground/60 hover:bg-warm-bg'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="p-6 min-h-[200px]">
              {tab === 'budget' ? (
                <BudgetSheet />
              ) : fetching ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedRealm ? (
                <ReportBody tab={tab} data={reportData} />
              ) : (
                <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
                  Connect a QuickBooks company to view this report.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Report renderers
// ------------------------------------------------------------

function ReportBody({ tab, data }: { tab: Tab; data: unknown }) {
  if (!data) {
    return (
      <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
        No data
      </p>
    );
  }

  if (tab === 'company') {
    const d = data as CompanyInfo;
    const c = d.CompanyInfo;
    if (!c) return <EmptyState />;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" value={c.CompanyName} />
        <Field label="Legal name" value={c.LegalName} />
        <Field
          label="Address"
          value={
            c.CompanyAddr
              ? [
                  c.CompanyAddr.Line1,
                  [c.CompanyAddr.City, c.CompanyAddr.CountrySubDivisionCode].filter(Boolean).join(', '),
                  c.CompanyAddr.PostalCode,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : undefined
          }
        />
        <Field label="Phone" value={c.PrimaryPhone?.FreeFormNumber} />
        <Field label="Email" value={c.Email?.Address} />
        <Field label="Country" value={c.Country} />
        <Field label="Fiscal year start" value={c.FiscalYearStartMonth} />
      </div>
    );
  }

  if (tab === 'accounts') {
    const d = data as AccountsResponse;
    const accounts = d.QueryResponse?.Account || [];
    if (accounts.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto -m-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-warm-bg/40">
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Account</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Classification</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.Id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors">
                <td className="px-6 py-3.5 text-sm font-medium text-foreground">{a.Name}</td>
                <td className="px-6 py-3.5 text-xs text-foreground/60">{[a.AccountType, a.AccountSubType].filter(Boolean).join(' · ')}</td>
                <td className="px-6 py-3.5 text-xs text-foreground/50">{a.Classification || '—'}</td>
                <td className="px-6 py-3.5 text-right text-sm font-semibold text-foreground tabular-nums">{fmtMoney(a.CurrentBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // All remaining tabs are QBO generic reports.
  const report = data as ReportResponse;
  return <GenericReport report={report} />;
}

function EmptyState() {
  return (
    <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
      No data for this report yet.
    </p>
  );
}

function GenericReport({ report }: { report: ReportResponse }) {
  const cols = report.Columns?.Column || [];
  const rows = report.Rows?.Row || [];
  if (cols.length === 0 && rows.length === 0) {
    return <EmptyState />;
  }
  const headerTitles = cols.map((c) => c.ColTitle || '');

  const flat: Array<{ row: ReportRow; depth: number; kind: 'row' | 'summary' | 'header' }> = [];
  function walk(list: ReportRow[], depth: number) {
    for (const r of list) {
      if (r.Header?.ColData) flat.push({ row: r, depth, kind: 'header' });
      if (r.ColData) flat.push({ row: r, depth, kind: 'row' });
      if (r.Rows?.Row) walk(r.Rows.Row, depth + 1);
      if (r.Summary?.ColData) flat.push({ row: r, depth, kind: 'summary' });
    }
  }
  walk(rows, 0);

  return (
    <div className="overflow-x-auto -m-6">
      <div className="px-6 pt-0 pb-2">
        {report.Header?.ReportName && (
          <h3 className="text-sm font-semibold text-foreground mb-0.5">{report.Header.ReportName}</h3>
        )}
        {(report.Header?.StartPeriod || report.Header?.EndPeriod) && (
          <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
            {report.Header?.StartPeriod} — {report.Header?.EndPeriod}
          </p>
        )}
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-warm-bg/40">
            {headerTitles.map((t, i) => (
              <th
                key={i}
                className={`${i === 0 ? 'text-left' : 'text-right'} px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {t || '\u00A0'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flat.map((f, idx) => {
            const cells =
              f.kind === 'summary' ? f.row.Summary?.ColData || [] :
              f.kind === 'header' ? f.row.Header?.ColData || [] :
              f.row.ColData || [];
            const isSummary = f.kind === 'summary';
            const isHeader = f.kind === 'header';
            return (
              <tr
                key={idx}
                className={`border-b border-gray-100 last:border-b-0 ${
                  isSummary ? 'font-semibold bg-warm-bg/30' : isHeader ? 'font-semibold bg-warm-bg/20' : ''
                }`}
              >
                {cells.map((c, i) => (
                  <td
                    key={i}
                    className={`${i === 0 ? 'text-left' : 'text-right tabular-nums'} px-6 py-2.5 text-xs text-foreground/80`}
                    style={{
                      fontFamily: i === 0 ? undefined : 'var(--font-body)',
                      paddingLeft: i === 0 ? `${24 + f.depth * 16}px` : undefined,
                    }}
                  >
                    {c.value || (i === 0 ? '\u00A0' : '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>
        {label}
      </p>
      <p className={`text-sm ${value ? 'text-foreground/80' : 'text-foreground/30'}`} style={{ fontFamily: 'var(--font-body)' }}>
        {value || '—'}
      </p>
    </div>
  );
}
