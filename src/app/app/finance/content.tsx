'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BudgetsPanel from './BudgetsPanel';
import BudgetViewPanel from './BudgetViewPanel';
import BudgetOverviewPanel from './BudgetOverviewPanel';
import {
  useQuickBooksConnection,
  QuickBooksHeader,
  QuickBooksRealmPicker,
  QuickBooksGettingStarted,
  QuickBooksToast,
} from '@/lib/QuickBooksConnection';

// ─── Types (QBO report shape) ────────────────────────────────────

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
  AcctNum?: string;
  AccountType?: string;
  AccountSubType?: string;
  Classification?: string;
  CurrentBalance?: number;
  Active?: boolean;
}

interface AccountsResponse {
  QueryResponse?: { Account?: Account[] };
}

interface ReportColData { value?: string; id?: string }
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

type ReportTab =
  | 'profit-loss'
  | 'profit-loss-monthly'
  | 'balance-sheet'
  | 'trial-balance'
  | 'general-ledger';

const REPORT_TABS: Array<{ id: ReportTab; label: string; report: string }> = [
  { id: 'profit-loss', label: 'P&L', report: 'profit-loss' },
  { id: 'profit-loss-monthly', label: 'P&L Monthly', report: 'profit-loss-monthly' },
  { id: 'balance-sheet', label: 'Balance Sheet', report: 'balance-sheet' },
  { id: 'trial-balance', label: 'Trial Balance', report: 'trial-balance' },
  { id: 'general-ledger', label: 'General Ledger', report: 'general-ledger' },
];

function fmtMoney(n: number | undefined) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

// ─── Top-level page sections ─────────────────────────────────────

type Section = 'budget' | 'reports' | 'company' | 'accounts';

export default function FinanceContent() {
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

  const [section, setSection] = useState<Section>('budget');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Reports sub-state
  const [reportTab, setReportTab] = useState<ReportTab>('profit-loss');
  type BudgetTab = 'set' | 'view' | 'overview';
  const [budgetTab, setBudgetTab] = useState<BudgetTab>('set');
  const [reportData, setReportData] = useState<unknown>(null);
  const [fetching, setFetching] = useState(false);

  // Re-render trigger so "3 min ago" in the header keeps ticking.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Admin gate
  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) router.replace('/app');
  }, [session, isAdmin, router]);

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
    [setError]
  );

  // When realm or report tab changes, fetch the matching report.
  useEffect(() => {
    if (!selectedRealm) return;
    if (section === 'company') {
      loadReport(selectedRealm, 'company-info');
    } else if (section === 'accounts') {
      loadReport(selectedRealm, 'accounts');
    } else if (section === 'reports') {
      const t = REPORT_TABS.find((x) => x.id === reportTab);
      if (!t) return;
      loadReport(selectedRealm, t.report);
    }
  }, [selectedRealm, reportTab, section, loadReport]);

  if (!user || !isAdmin) return null;

  const budgetSubtitles: Record<BudgetTab, string> = {
    set: 'Set a monthly budget for each department and match it to a QuickBooks P&L account.',
    view: 'View department budgets with team members at a glance.',
    overview: 'Month-to-month budget vs. actuals comparison pulled live from QuickBooks.',
  };
  const subtitleMap: Record<Section, string> = {
    budget: budgetSubtitles[budgetTab],
    reports: 'P&L, balance sheet, trial balance, and general ledger — pulled live from QuickBooks.',
    company: 'Company info pulled live from QuickBooks.',
    accounts: 'Chart of accounts pulled live from QuickBooks.',
  };

  return (
    <div className="p-6 lg:p-10">
      <QuickBooksHeader
        title="Finance"
        subtitle={subtitleMap[section]}
        hasCompanies={hasCompanies}
        selectedRealm={selectedRealm}
        lastUpdated={lastUpdated}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {/* Section tabs */}
      <div className="flex gap-1 mb-5">
        {([
          { id: 'budget' as Section, label: 'Budget' },
          { id: 'reports' as Section, label: 'Reports' },
          { id: 'company' as Section, label: 'Company' },
          { id: 'accounts' as Section, label: 'Accounts' },
        ]).map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              section === s.id
                ? 'bg-foreground text-white'
                : 'text-foreground/50 hover:bg-warm-bg'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loadingList ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {hasCompanies && (
            <QuickBooksRealmPicker
              companies={companies!}
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

          {/* ─── Budget section ─── */}
          {section === 'budget' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 bg-warm-bg/20">
                {([
                  { id: 'set' as BudgetTab, label: 'Set Budgets' },
                  { id: 'view' as BudgetTab, label: 'View Budgets' },
                  { id: 'overview' as BudgetTab, label: 'Overview' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setBudgetTab(t.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                      budgetTab === t.id
                        ? 'bg-primary text-white'
                        : 'text-foreground/60 hover:bg-warm-bg'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="p-6 min-h-[200px]">
                {!selectedRealm ? (
                  <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
                    Connect a QuickBooks company to set budgets.
                  </p>
                ) : budgetTab === 'set' ? (
                  <BudgetsPanel
                    realmId={selectedRealm}
                    onUpdated={() => setLastUpdated(new Date().toISOString())}
                  />
                ) : budgetTab === 'view' ? (
                  <BudgetViewPanel realmId={selectedRealm} />
                ) : (
                  <BudgetOverviewPanel realmId={selectedRealm} />
                )}
              </div>
            </div>
          )}

          {/* ─── Reports section ─── */}
          {section === 'reports' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 bg-warm-bg/20">
                {REPORT_TABS.map((t) => {
                  const disabled = !selectedRealm;
                  return (
                    <button
                      key={t.id}
                      onClick={() => !disabled && setReportTab(t.id)}
                      disabled={disabled}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                        reportTab === t.id
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
                {!selectedRealm ? (
                  <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
                    Connect a QuickBooks company to view this report.
                  </p>
                ) : fetching ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ReportBody tab={reportTab} data={reportData} />
                )}
              </div>
            </div>
          )}

          {/* ─── Company section ─── */}
          {section === 'company' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 min-h-[200px]">
                {!selectedRealm ? (
                  <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
                    Connect a QuickBooks company to view company info.
                  </p>
                ) : fetching ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ReportBody tab="company" data={reportData} />
                )}
              </div>
            </div>
          )}

          {/* ─── Accounts section ─── */}
          {section === 'accounts' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 min-h-[200px]">
                {!selectedRealm ? (
                  <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
                    Connect a QuickBooks company to view accounts.
                  </p>
                ) : fetching ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ReportBody tab="accounts" data={reportData} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <QuickBooksToast toast={toast} />
    </div>
  );
}

// ─── Report renderers (moved from /app/reports) ──────────────────

function ReportBody({ tab, data }: { tab: ReportTab | 'company' | 'accounts'; data: unknown }) {
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
    const accounts = [...(d.QueryResponse?.Account || [])].sort((a, b) => {
      const an = a.AcctNum || '';
      const bn = b.AcctNum || '';
      if (an && bn) return an.localeCompare(bn, undefined, { numeric: true });
      if (an && !bn) return -1;
      if (!an && bn) return 1;
      return (a.Name || '').localeCompare(b.Name || '');
    });
    if (accounts.length === 0) return <EmptyState />;
    return (
      <div className="overflow-x-auto -m-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-warm-bg/40">
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider w-20" style={{ fontFamily: 'var(--font-body)' }}>#</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Account</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Classification</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.Id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors">
                <td className="px-6 py-3.5 text-xs font-mono text-foreground/60 tabular-nums">{a.AcctNum || '—'}</td>
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
