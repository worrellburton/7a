'use client';

// ------------------------------------------------------------
// Budget vs Actuals — month-to-month roll-up.
//
// Each department gets three rows:
//   Budget      – monthly_budget from department_budgets (flat each month)
//   Expense     – actuals from QBO ProfitAndLoss Monthly for the dept's
//                 mapped P&L account (already summed over sub-accounts)
//   Difference  – Budget − Expense (positive = under budget)
//
// Trailing columns on the right:
//   Totals      – sum across all displayed months
//   Averages    – Totals / monthsShown
//   Projected   – Averages × 12 (annualized run-rate)
// ------------------------------------------------------------

import { useAuth } from '@/lib/AuthProvider';
import {
  QuickBooksGettingStarted,
  QuickBooksHeader,
  QuickBooksRealmPicker,
  QuickBooksToast,
  useQuickBooksConnection,
} from '@/lib/QuickBooksConnection';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface BudgetRow {
  id?: string;
  department_id: string;
  realm_id: string;
  monthly_budget: number;
  qbo_account_id: string | null;
  qbo_account_name: string | null;
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
  Header?: { Time?: string; ReportName?: string; StartPeriod?: string; EndPeriod?: string };
  Columns?: { Column?: ReportColumn[] };
  Rows?: { Row?: ReportRow[] };
}

function fmtMoney(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtDiff(n: number): { label: string; cls: string } {
  if (!Number.isFinite(n) || n === 0) return { label: '—', cls: 'text-foreground/30' };
  const sign = n >= 0 ? '+' : '−';
  return {
    label: `${sign}${Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`,
    cls: n >= 0 ? 'text-emerald-600' : 'text-red-600',
  };
}

// Walk the P&L row tree and return every row that has an account id on
// its first cell, keyed by that id. QBO returns group totals on Summary
// rows, which we also pick up (they carry the id on Summary.ColData[0]).
function indexRowsById(rows: ReportRow[] | undefined, into: Map<string, number[]> = new Map()): Map<string, number[]> {
  if (!rows) return into;
  for (const r of rows) {
    // Leaf rows.
    if (r.ColData && r.ColData[0]?.id) {
      into.set(r.ColData[0].id, parseRow(r.ColData));
    }
    // Group summary rows carry the parent account id (same as the Header
    // ColData[0].id) with the rolled-up totals. Prefer Summary over leaf
    // if both exist for the same id, since Summary includes sub-accounts.
    if (r.Summary?.ColData && r.Header?.ColData?.[0]?.id) {
      into.set(r.Header.ColData[0].id, parseRow(r.Summary.ColData));
    }
    if (r.Rows?.Row) indexRowsById(r.Rows.Row, into);
  }
  return into;
}

function parseRow(cells: ReportColData[]): number[] {
  // Skip index 0 (account name) and the last cell if it's a "Total"
  // aggregate (we recompute totals). For simplicity we keep the full
  // numeric tail and let the caller pick only the month columns.
  const out: number[] = [];
  for (let i = 1; i < cells.length; i++) {
    const raw = (cells[i]?.value || '').replace(/[,\s$]/g, '').replace(/^\((.+)\)$/, '-$1');
    const n = parseFloat(raw);
    out.push(Number.isFinite(n) ? n : 0);
  }
  return out;
}

export default function BudgetVsActualsContent() {
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

  const [departments, setDepartments] = useState<Department[]>([]);
  const [budgets, setBudgets] = useState<Record<string, BudgetRow>>({});
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Admin gate
  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) router.replace('/app');
  }, [session, isAdmin, router]);

  const load = useCallback(async () => {
    if (!selectedRealm) return;
    setLoading(true);
    setError(null);
    try {
      const [deptRes, budgetRes, plRes] = await Promise.all([
        supabase.from('departments').select('id, name, color').order('name'),
        supabase.from('department_budgets').select('*').eq('realm_id', selectedRealm),
        fetch(
          `/api/quickbooks/data?report=profit-loss-monthly&realm_id=${encodeURIComponent(selectedRealm)}`,
          { credentials: 'include' }
        ),
      ]);

      if (deptRes.error) throw new Error(`Departments: ${deptRes.error.message}`);
      if (budgetRes.error) throw new Error(`Budgets: ${budgetRes.error.message}`);

      setDepartments((deptRes.data || []) as Department[]);
      const byDept: Record<string, BudgetRow> = {};
      for (const b of (budgetRes.data || []) as BudgetRow[]) byDept[b.department_id] = b;
      setBudgets(byDept);

      if (plRes.ok) {
        setReport((await plRes.json()) as ReportResponse);
      } else {
        const body = await plRes.json().catch(() => ({ error: 'Request failed' }));
        setError(body.error || `P&L request failed (${plRes.status})`);
      }
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedRealm, setError]);

  useEffect(() => { load(); }, [load]);

  // Slice the P&L columns down to just the month columns — drop the
  // first (account name) and any trailing "Total" column QBO adds.
  const { monthColumns, monthIndices } = useMemo(() => {
    const cols = report?.Columns?.Column || [];
    const months: ReportColumn[] = [];
    const indices: number[] = [];
    // parseRow starts at i=1 in the cell array so we record (ci-1) as
    // the position within the parsed numeric array.
    for (let ci = 1; ci < cols.length; ci++) {
      const c = cols[ci];
      const title = c.ColTitle || '';
      // "Total" column has ColType="Money" and title "Total" with no
      // StartDate metadata — easy to detect either way.
      const hasRange = !!c.MetaData?.find((m) => m.Name === 'StartDate');
      if (/^total$/i.test(title) && !hasRange) continue;
      months.push(c);
      indices.push(ci - 1);
    }
    return { monthColumns: months, monthIndices: indices };
  }, [report]);

  const rowsById = useMemo(() => indexRowsById(report?.Rows?.Row), [report]);

  if (!user || !isAdmin) return null;

  const monthsShown = monthColumns.length;

  return (
    <div className="p-6 lg:p-10">
      <QuickBooksHeader
        title="Budget vs Actuals"
        subtitle="Month-by-month budget vs. actual spend, with trailing totals, averages, and projected annual run rate."
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
              ) : departments.length === 0 ? (
                <p className="text-sm text-foreground/40 text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
                  No departments yet. Create some in the Departments page first.
                </p>
              ) : monthsShown === 0 ? (
                <p className="text-sm text-foreground/40 text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
                  No P&amp;L data available for this company.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-warm-bg/40">
                        <th className="sticky left-0 bg-warm-bg/40 z-10 text-left px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Department</th>
                        <th className="text-left px-3 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Row</th>
                        {monthColumns.map((c, i) => (
                          <th key={i} className="text-right px-3 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                            {c.ColTitle}
                          </th>
                        ))}
                        <th className="text-right px-3 py-3 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider border-l border-gray-200 bg-warm-bg/60" style={{ fontFamily: 'var(--font-body)' }}>Totals</th>
                        <th className="text-right px-3 py-3 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider bg-warm-bg/60" style={{ fontFamily: 'var(--font-body)' }}>Averages</th>
                        <th className="text-right px-3 py-3 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider bg-warm-bg/60" style={{ fontFamily: 'var(--font-body)' }}>Projected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((d, deptIdx) => {
                        const budget = budgets[d.id];
                        const monthly = budget?.monthly_budget ?? 0;
                        const expensesArr = budget?.qbo_account_id ? rowsById.get(budget.qbo_account_id) : undefined;

                        // Build the three row arrays aligned to monthIndices.
                        const budgetRow = monthIndices.map(() => monthly);
                        const expenseRow = monthIndices.map((idx) =>
                          expensesArr && Number.isFinite(expensesArr[idx]) ? expensesArr[idx] : 0
                        );
                        const diffRow = budgetRow.map((b, i) => b - expenseRow[i]);

                        const budgetTotal = budgetRow.reduce((s, v) => s + v, 0);
                        const expenseTotal = expenseRow.reduce((s, v) => s + v, 0);
                        const diffTotal = diffRow.reduce((s, v) => s + v, 0);

                        const budgetAvg = monthsShown > 0 ? budgetTotal / monthsShown : 0;
                        const expenseAvg = monthsShown > 0 ? expenseTotal / monthsShown : 0;
                        const diffAvg = monthsShown > 0 ? diffTotal / monthsShown : 0;

                        const budgetProj = budgetAvg * 12;
                        const expenseProj = expenseAvg * 12;
                        const diffProj = diffAvg * 12;

                        const groupBorder = deptIdx < departments.length - 1 ? 'border-b-2 border-gray-200' : '';

                        return (
                          <Fragment key={d.id}>
                            <tr className="border-b border-gray-50 hover:bg-warm-bg/10">
                              <td
                                rowSpan={3}
                                className={`sticky left-0 bg-white z-10 align-top px-4 py-3 ${groupBorder}`}
                              >
                                <div className="flex items-center gap-2">
                                  {d.color && <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />}
                                  <span className="text-sm font-semibold text-foreground">{d.name}</span>
                                </div>
                                {budget?.qbo_account_name && (
                                  <p className="text-[10px] text-foreground/40 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                                    {budget.qbo_account_name}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Budget</td>
                              {budgetRow.map((v, i) => (
                                <td key={i} className="px-3 py-2 text-right tabular-nums text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
                                  {fmtMoney(v)}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground border-l border-gray-200 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(budgetTotal)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-foreground/70 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(budgetAvg)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-foreground/70 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(budgetProj)}</td>
                            </tr>
                            <tr className="border-b border-gray-50 hover:bg-warm-bg/10">
                              <td className="px-3 py-2 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Expense</td>
                              {expenseRow.map((v, i) => (
                                <td key={i} className="px-3 py-2 text-right tabular-nums text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
                                  {fmtMoney(v)}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground border-l border-gray-200 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(expenseTotal)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-foreground/70 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(expenseAvg)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-foreground/70 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(expenseProj)}</td>
                            </tr>
                            <tr className={`hover:bg-warm-bg/10 ${groupBorder}`}>
                              <td className="px-3 py-2 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Difference</td>
                              {diffRow.map((v, i) => {
                                const d2 = fmtDiff(v);
                                return (
                                  <td key={i} className={`px-3 py-2 text-right tabular-nums font-medium ${d2.cls}`} style={{ fontFamily: 'var(--font-body)' }}>
                                    {d2.label}
                                  </td>
                                );
                              })}
                              {[diffTotal, diffAvg, diffProj].map((v, i) => {
                                const d2 = fmtDiff(v);
                                return (
                                  <td key={i} className={`px-3 py-2 text-right tabular-nums font-semibold ${d2.cls} bg-warm-bg/20 ${i === 0 ? 'border-l border-gray-200' : ''}`} style={{ fontFamily: 'var(--font-body)' }}>
                                    {d2.label}
                                  </td>
                                );
                              })}
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
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
