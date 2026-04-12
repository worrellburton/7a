'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BudgetsPanel from './BudgetsPanel';
import AccountsReceivablesPanel from './AccountsReceivablesPanel';
import BudgetVsActualsPanel from './BudgetVsActualsPanel';
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
interface ReportColumn {
  ColTitle?: string;
  ColType?: string;
  MetaData?: Array<{ Name: string; Value: string }>;
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
  Columns?: { Column?: ReportColumn[] };
  Rows?: { Row?: ReportRow[] };
}

type ReportTab =
  | 'company'
  | 'accounts'
  | 'profit-loss'
  | 'balance-sheet'
  | 'trial-balance'
  | 'general-ledger';

const REPORT_TABS: Array<{ id: ReportTab; label: string; report: string }> = [
  { id: 'company', label: 'Company', report: 'company-info' },
  { id: 'accounts', label: 'Accounts', report: 'accounts' },
  { id: 'profit-loss', label: 'P&L', report: 'profit-loss' },
  { id: 'balance-sheet', label: 'Balance Sheet', report: 'balance-sheet' },
  { id: 'trial-balance', label: 'Trial Balance', report: 'trial-balance' },
  { id: 'general-ledger', label: 'General Ledger', report: 'general-ledger' },
];

type PnLView = 'annual' | 'monthly';

function fmtMoney(n: number | undefined) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

// ─── Top-level page sections ─────────────────────────────────────

type Section = 'budget' | 'ar' | 'bva' | 'reports';

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
  const [reportTab, setReportTab] = useState<ReportTab>('company');
  const [reportData, setReportData] = useState<unknown>(null);
  const [fetching, setFetching] = useState(false);
  // P&L tab has two sub-views: summary for the default period (Annual)
  // and a month-by-month breakdown.
  const [plView, setPlView] = useState<PnLView>('annual');
  // Drill-down panel for cells in the monthly P&L — shows the
  // ProfitAndLossDetail scoped to a single account + single month.
  const [drillDown, setDrillDown] = useState<{
    accountId: string;
    accountName: string;
    startDate: string;
    endDate: string;
    periodLabel: string;
  } | null>(null);

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

  // When realm or report tab changes, fetch the matching report. P&L
  // fans out to two different QBO endpoints depending on the sub-view.
  useEffect(() => {
    if (section !== 'reports') return;
    if (!selectedRealm) return;
    const t = REPORT_TABS.find((x) => x.id === reportTab);
    if (!t) return;
    const reportName =
      reportTab === 'profit-loss' && plView === 'monthly'
        ? 'profit-loss-monthly'
        : t.report;
    loadReport(selectedRealm, reportName);
  }, [selectedRealm, reportTab, plView, section, loadReport]);

  if (!user || !isAdmin) return null;

  const subtitleMap: Record<Section, string> = {
    budget: 'Set a monthly budget for each department and match it to a QuickBooks P&L account for live actuals.',
    ar: 'Every income-classified account pulled live from QuickBooks.',
    bva: 'Month-by-month budget vs. actual spend, with trailing totals, averages, and projected annual run rate.',
    reports: 'Company, accounts, P&L, balance sheet, trial balance, and general ledger — pulled live from QuickBooks.',
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
          { id: 'ar' as Section, label: 'Accounts Receivables' },
          { id: 'bva' as Section, label: 'Budget vs Actuals' },
          { id: 'reports' as Section, label: 'Reports' },
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
              <div className="p-6 min-h-[200px]">
                {!selectedRealm ? (
                  <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
                    Connect a QuickBooks company to set budgets.
                  </p>
                ) : (
                  <BudgetsPanel
                    realmId={selectedRealm}
                    onUpdated={() => setLastUpdated(new Date().toISOString())}
                  />
                )}
              </div>
            </div>
          )}

          {/* ─── Accounts Receivables section ─── */}
          {section === 'ar' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 min-h-[200px]">
                {!selectedRealm ? (
                  <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
                    Connect a QuickBooks company to view income accounts.
                  </p>
                ) : (
                  <AccountsReceivablesPanel
                    realmId={selectedRealm}
                    onUpdated={() => setLastUpdated(new Date().toISOString())}
                  />
                )}
              </div>
            </div>
          )}

          {/* ─── Budget vs Actuals section ─── */}
          {section === 'bva' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 min-h-[200px]">
                {!selectedRealm ? (
                  <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
                    Connect a QuickBooks company to view budget vs. actuals.
                  </p>
                ) : (
                  <BudgetVsActualsPanel
                    realmId={selectedRealm}
                    onUpdated={() => setLastUpdated(new Date().toISOString())}
                  />
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

              {/* P&L sub-tabs */}
              {reportTab === 'profit-loss' && selectedRealm && (
                <div className="flex gap-1 px-4 py-2 border-b border-gray-100 bg-warm-bg/10">
                  {([
                    { id: 'annual' as PnLView, label: 'Annual' },
                    { id: 'monthly' as PnLView, label: 'Month to Month' },
                  ]).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setPlView(v.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                        plView === v.id
                          ? 'bg-foreground text-white'
                          : 'text-foreground/50 hover:bg-warm-bg'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}

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
                  <ReportBody
                    tab={reportTab}
                    data={reportData}
                    plView={plView}
                    onCellDrillDown={
                      reportTab === 'profit-loss' && plView === 'monthly'
                        ? (cell) => setDrillDown(cell)
                        : undefined
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <QuickBooksToast toast={toast} />

      {drillDown && selectedRealm && (
        <DrillDownModal
          realmId={selectedRealm}
          accountId={drillDown.accountId}
          accountName={drillDown.accountName}
          startDate={drillDown.startDate}
          endDate={drillDown.endDate}
          periodLabel={drillDown.periodLabel}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}

// ─── Report renderers (moved from /app/reports) ──────────────────

interface DrillDownCell {
  accountId: string;
  accountName: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
}

function ReportBody({
  tab,
  data,
  plView,
  onCellDrillDown,
}: {
  tab: ReportTab;
  data: unknown;
  plView?: PnLView;
  onCellDrillDown?: (cell: DrillDownCell) => void;
}) {
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
  return <GenericReport report={report} onCellDrillDown={onCellDrillDown} />;
}

// Parse a QBO report Column into a (start, end) date pair. First checks
// the Column's MetaData (QBO returns StartDate/EndDate for dated
// columns) and falls back to parsing the ColTitle ("Apr 2026" etc.).
function columnDateRange(col: ReportColumn): { start: string; end: string; label: string } | null {
  const meta = col.MetaData || [];
  const startMeta = meta.find((m) => m.Name === 'StartDate')?.Value;
  const endMeta = meta.find((m) => m.Name === 'EndDate')?.Value;
  if (startMeta && endMeta) {
    return { start: startMeta, end: endMeta, label: col.ColTitle || `${startMeta} – ${endMeta}` };
  }
  // Fallback: parse "MMM YYYY" column titles. Only works for month/year
  // formats produced by summarize_column_by=Month.
  const title = col.ColTitle || '';
  const m = title.match(/^([A-Za-z]{3,})\s+(\d{4})$/);
  if (!m) return null;
  const month = new Date(`${m[1]} 1, ${m[2]}`).getMonth();
  const year = parseInt(m[2], 10);
  if (!Number.isFinite(year) || Number.isNaN(month)) return null;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    label: title,
  };
}

function EmptyState() {
  return (
    <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
      No data for this report yet.
    </p>
  );
}

function GenericReport({
  report,
  onCellDrillDown,
}: {
  report: ReportResponse;
  onCellDrillDown?: (cell: DrillDownCell) => void;
}) {
  const cols = report.Columns?.Column || [];
  const rows = report.Rows?.Row || [];
  if (cols.length === 0 && rows.length === 0) {
    return <EmptyState />;
  }
  const headerTitles = cols.map((c) => c.ColTitle || '');
  // Pre-resolve each column's date range once. Only columns with a
  // resolvable range are drill-down targets (excludes "Total" column).
  const colRanges = cols.map((c) => columnDateRange(c));

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
        {onCellDrillDown && (
          <p className="text-[11px] text-primary mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Click any cell to see the underlying transactions.
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
            // First cell holds the account name + id on leaf rows. Only
            // those rows are drillable — header/summary rows roll up
            // multiple accounts so there's no single account to filter.
            const accountId = !isHeader && !isSummary ? cells[0]?.id : undefined;
            const accountName = cells[0]?.value || '';
            return (
              <tr
                key={idx}
                className={`border-b border-gray-100 last:border-b-0 ${
                  isSummary ? 'font-semibold bg-warm-bg/30' : isHeader ? 'font-semibold bg-warm-bg/20' : ''
                }`}
              >
                {cells.map((c, i) => {
                  const range = colRanges[i];
                  const drillable =
                    !!onCellDrillDown &&
                    !!accountId &&
                    i > 0 &&
                    !!range &&
                    !!c.value;
                  const base = `${i === 0 ? 'text-left' : 'text-right tabular-nums'} px-6 py-2.5 text-xs text-foreground/80`;
                  return (
                    <td
                      key={i}
                      className={`${base} ${drillable ? 'cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors' : ''}`}
                      style={{
                        fontFamily: i === 0 ? undefined : 'var(--font-body)',
                        paddingLeft: i === 0 ? `${24 + f.depth * 16}px` : undefined,
                      }}
                      onClick={
                        drillable
                          ? () =>
                              onCellDrillDown!({
                                accountId: accountId!,
                                accountName,
                                startDate: range!.start,
                                endDate: range!.end,
                                periodLabel: range!.label,
                              })
                          : undefined
                      }
                      title={drillable ? `Show ${accountName} transactions for ${range!.label}` : undefined}
                    >
                      {c.value || (i === 0 ? '\u00A0' : '')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Drill-down modal ────────────────────────────────────────────
//
// Loads ProfitAndLossDetail filtered to a single account + date range,
// then renders the transaction rows. Rendered via a fixed overlay.

function DrillDownModal({
  realmId,
  accountId,
  accountName,
  startDate,
  endDate,
  periodLabel,
  onClose,
}: {
  realmId: string;
  accountId: string;
  accountName: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = `/api/quickbooks/data?report=profit-loss-detail&realm_id=${encodeURIComponent(realmId)}&account_list=${encodeURIComponent(accountId)}&start_date=${startDate}&end_date=${endDate}`;
    fetch(url, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(body.error || `Request failed (${r.status})`);
        }
        return r.json();
      })
      .then((d) => setData(d as ReportResponse))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [realmId, accountId, startDate, endDate]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cols = data?.Columns?.Column || [];
  const rows = data?.Rows?.Row || [];
  const flat: ReportRow[] = [];
  function walk(list: ReportRow[]) {
    for (const r of list) {
      if (r.ColData) flat.push(r);
      if (r.Rows?.Row) walk(r.Rows.Row);
      if (r.Summary?.ColData) flat.push({ ColData: r.Summary.ColData });
    }
  }
  walk(rows);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-foreground">{accountName}</h3>
            <p className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              {periodLabel} · {startDate} → {endDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-foreground/40 hover:bg-warm-bg hover:text-foreground flex items-center justify-center"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="m-5 p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
            </div>
          ) : flat.length === 0 ? (
            <p className="text-sm text-foreground/40 text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
              No transactions in this period.
            </p>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100 bg-warm-bg/30">
                  {cols.map((c, i) => (
                    <th
                      key={i}
                      className={`${i === 0 ? 'text-left' : 'text-right'} px-4 py-2 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {c.ColTitle || ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flat.map((r, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/20">
                    {(r.ColData || []).map((c, i) => (
                      <td
                        key={i}
                        className={`${i === 0 ? 'text-left' : 'text-right tabular-nums'} px-4 py-2 text-xs text-foreground/80`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {c.value || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
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
