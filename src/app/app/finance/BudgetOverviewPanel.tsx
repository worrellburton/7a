'use client';

// Budget Overview — month-to-month comparison of each department's budget
// against actuals pulled from the QuickBooks P&L Monthly report.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface BudgetRow {
  department_id: string;
  realm_id: string;
  monthly_budget: number;
  qbo_account_id: string | null;
  qbo_account_name: string | null;
}

interface QboColData { value?: string; id?: string }
interface QboRow {
  ColData?: QboColData[];
  Header?: { ColData?: QboColData[] };
  Summary?: { ColData?: QboColData[] };
  Rows?: { Row?: QboRow[] };
  type?: string;
  group?: string;
}
interface QboReport {
  Header?: { StartPeriod?: string; EndPeriod?: string; ReportName?: string };
  Columns?: { Column?: Array<{ ColTitle?: string; ColType?: string }> };
  Rows?: { Row?: QboRow[] };
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtMoneyPrecise(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

// Walk the P&L tree to find a specific account by its id (the id QBO assigns
// to the header row). Returns the monthly column values for that account.
function findAccountMonthlyValues(report: QboReport, accountId: string): number[] {
  const cols = report.Columns?.Column || [];
  // Skip the first column (account name) — remaining are month columns + optional Total
  const monthCount = Math.max(0, cols.length - 1);
  const values: number[] = new Array(monthCount).fill(0);

  function walk(rows: QboRow[]) {
    for (const r of rows) {
      // Check Header rows (group headers have id matching account)
      if (r.Header?.ColData?.[0]?.id === accountId && r.Summary?.ColData) {
        // The Summary row has the monthly totals
        const sumCols = r.Summary.ColData;
        for (let i = 1; i < sumCols.length && i - 1 < monthCount; i++) {
          values[i - 1] = parseFloat((sumCols[i]?.value || '0').replace(/,/g, '')) || 0;
        }
        return true;
      }
      // Check leaf rows
      if (r.ColData && r.ColData[0]?.id === accountId) {
        for (let i = 1; i < r.ColData.length && i - 1 < monthCount; i++) {
          values[i - 1] = parseFloat((r.ColData[i]?.value || '0').replace(/,/g, '')) || 0;
        }
        return true;
      }
      if (r.Rows?.Row) {
        if (walk(r.Rows.Row)) return true;
      }
    }
    return false;
  }

  const expensesSection =
    report.Rows?.Row?.find((r) => r.group === 'Expenses') ||
    report.Rows?.Row?.find(
      (r) =>
        r.Summary?.ColData?.[0]?.value?.toLowerCase().includes('expense') ||
        r.Header?.ColData?.[0]?.value?.toLowerCase().includes('expense')
    );
  if (expensesSection?.Rows?.Row) {
    walk(expensesSection.Rows.Row);
  }

  return values;
}

interface Props {
  realmId: string;
}

export default function BudgetOverviewPanel({ realmId }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [budgets, setBudgets] = useState<Record<string, BudgetRow>>({});
  const [report, setReport] = useState<QboReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, budgetRes, pnlRes] = await Promise.all([
        supabase.from('departments').select('id, name, color').order('name'),
        supabase.from('department_budgets').select('*').eq('realm_id', realmId),
        fetch(`/api/quickbooks/data?report=profit-loss-monthly&realm_id=${encodeURIComponent(realmId)}`, {
          credentials: 'include',
        }),
      ]);

      if (deptRes.error) throw new Error(deptRes.error.message);
      if (budgetRes.error) throw new Error(budgetRes.error.message);

      setDepartments((deptRes.data || []) as Department[]);
      const saved = (budgetRes.data || []) as BudgetRow[];
      const byDept: Record<string, BudgetRow> = {};
      for (const b of saved) byDept[b.department_id] = b;
      setBudgets(byDept);

      if (pnlRes.ok) {
        const data = await pnlRes.json();
        setReport(data as QboReport);
      } else {
        setError('Could not fetch P&L Monthly report from QuickBooks.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [realmId]);

  useEffect(() => { load(); }, [load]);

  // Extract month column labels from the report
  const monthLabels = useMemo(() => {
    if (!report?.Columns?.Column) return [];
    return report.Columns.Column
      .slice(1) // skip account name column
      .map((c) => c.ColTitle || '')
      .filter((t) => t.toLowerCase() !== 'total');
  }, [report]);

  // For each department, compute monthly actuals
  const deptData = useMemo(() => {
    if (!report) return [];
    return departments.map((d) => {
      const budget = budgets[d.id];
      const monthlyBudget = budget?.monthly_budget || 0;
      const accountId = budget?.qbo_account_id;
      const monthlyActuals = accountId
        ? findAccountMonthlyValues(report, accountId).slice(0, monthLabels.length)
        : new Array(monthLabels.length).fill(0);

      return {
        department: d,
        budget: budget || null,
        monthlyBudget,
        monthlyActuals,
        totalActual: monthlyActuals.reduce((a: number, b: number) => a + b, 0),
        totalBudget: monthlyBudget * monthLabels.length,
      };
    });
  }, [departments, budgets, report, monthLabels]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
        No departments yet.
      </p>
    );
  }

  if (monthLabels.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-foreground/40 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
          No monthly P&L data available yet.
        </p>
        <p className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
          The overview compares budgets against the P&L Monthly report. Make sure the report has data for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="-m-6">
      {error && (
        <div className="m-6 mb-0 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-warm-bg/40">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider sticky left-0 bg-warm-bg/40 z-10" style={{ fontFamily: 'var(--font-body)' }}>
                Department
              </th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                Budget/mo
              </th>
              {monthLabels.map((m) => (
                <th key={m} className="text-center px-3 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider min-w-[100px]" style={{ fontFamily: 'var(--font-body)' }}>
                  {m}
                </th>
              ))}
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                Total Var.
              </th>
            </tr>
          </thead>
          <tbody>
            {deptData.map(({ department: d, budget, monthlyBudget, monthlyActuals, totalActual, totalBudget }) => {
              const totalVariance = totalBudget - totalActual;
              return (
                <tr key={d.id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/20 transition-colors">
                  <td className="px-5 py-3 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                      {d.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />}
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground block truncate">{d.name}</span>
                        {budget?.qbo_account_name && (
                          <span className="text-[10px] text-foreground/40 block truncate" style={{ fontFamily: 'var(--font-body)' }}>
                            {budget.qbo_account_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                    {fmtMoney(monthlyBudget)}
                  </td>
                  {monthlyActuals.map((actual: number, i: number) => {
                    const variance = monthlyBudget - actual;
                    const overBudget = actual > monthlyBudget && monthlyBudget > 0;
                    const underBudget = actual <= monthlyBudget && monthlyBudget > 0 && actual > 0;
                    return (
                      <td key={i} className="px-3 py-3 text-center">
                        <div className="text-xs font-semibold tabular-nums" style={{ fontFamily: 'var(--font-body)', color: overBudget ? '#dc2626' : '#1f2937' }}>
                          {actual > 0 ? fmtMoneyPrecise(actual) : '—'}
                        </div>
                        {actual > 0 && monthlyBudget > 0 && (
                          <div
                            className={`text-[10px] tabular-nums mt-0.5 ${overBudget ? 'text-red-500' : underBudget ? 'text-emerald-600' : 'text-foreground/40'}`}
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {variance >= 0 ? '+' : ''}{fmtMoney(variance)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 text-right">
                    {totalBudget > 0 ? (
                      <div className={`text-sm font-bold tabular-nums ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} style={{ fontFamily: 'var(--font-body)' }}>
                        {totalVariance >= 0 ? '+' : ''}{fmtMoney(totalVariance)}
                      </div>
                    ) : (
                      <span className="text-foreground/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-warm-bg/30 font-semibold">
              <td className="px-5 py-4 text-xs uppercase tracking-wider text-foreground/60 sticky left-0 bg-warm-bg/30 z-10" style={{ fontFamily: 'var(--font-body)' }}>
                Totals
              </td>
              <td className="px-4 py-4 text-right text-sm text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                {fmtMoney(deptData.reduce((s, d) => s + d.monthlyBudget, 0))}
              </td>
              {monthLabels.map((_, i) => {
                const colTotal = deptData.reduce((s, d) => s + (d.monthlyActuals[i] || 0), 0);
                const colBudget = deptData.reduce((s, d) => s + d.monthlyBudget, 0);
                const colVar = colBudget - colTotal;
                return (
                  <td key={i} className="px-3 py-4 text-center">
                    <div className="text-xs font-bold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                      {colTotal > 0 ? fmtMoneyPrecise(colTotal) : '—'}
                    </div>
                    {colTotal > 0 && colBudget > 0 && (
                      <div className={`text-[10px] tabular-nums mt-0.5 ${colVar >= 0 ? 'text-emerald-600' : 'text-red-500'}`} style={{ fontFamily: 'var(--font-body)' }}>
                        {colVar >= 0 ? '+' : ''}{fmtMoney(colVar)}
                      </div>
                    )}
                  </td>
                );
              })}
              <td className="px-5 py-4 text-right">
                {(() => {
                  const grandBudget = deptData.reduce((s, d) => s + d.totalBudget, 0);
                  const grandActual = deptData.reduce((s, d) => s + d.totalActual, 0);
                  const grandVar = grandBudget - grandActual;
                  return grandBudget > 0 ? (
                    <span className={`text-sm font-bold tabular-nums ${grandVar >= 0 ? 'text-emerald-600' : 'text-red-600'}`} style={{ fontFamily: 'var(--font-body)' }}>
                      {grandVar >= 0 ? '+' : ''}{fmtMoney(grandVar)}
                    </span>
                  ) : <span className="text-foreground/30">—</span>;
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
