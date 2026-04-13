'use client';

// ------------------------------------------------------------
// Budget vs Actuals panel — month-to-month roll-up, rendered as
// a section tab inside the Finance page.
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

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
// rows, which we also pick up (they carry the id on Header.ColData[0]).
function indexRowsById(rows: ReportRow[] | undefined, into: Map<string, number[]> = new Map()): Map<string, number[]> {
  if (!rows) return into;
  for (const r of rows) {
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
  const out: number[] = [];
  for (let i = 1; i < cells.length; i++) {
    const raw = (cells[i]?.value || '').replace(/[,\s$]/g, '').replace(/^\((.+)\)$/, '-$1');
    const n = parseFloat(raw);
    out.push(Number.isFinite(n) ? n : 0);
  }
  return out;
}

interface Props {
  realmId: string;
}

export default function BudgetVsActualsPanel({ realmId }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [budgets, setBudgets] = useState<Record<string, BudgetRow>>({});
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<null | {
    deptName: string;
    rowLabel: 'Budget' | 'Expense' | 'Difference';
    monthLabel: string;
    value: number;
    budget: number;
    expense: number;
    diff: number;
    pctOfBudget: number | null;
    ytdBudget: number;
    ytdExpense: number;
    ytdDiff: number;
    avgExpense: number;
    projectedExpense: number;
    projectedDiff: number;
    anchorRect: { x: number; y: number; w: number; h: number };
  }>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, budgetRes, plRes] = await Promise.all([
        supabase.from('departments').select('id, name, color').order('name'),
        supabase.from('department_budgets').select('*').eq('realm_id', realmId),
        fetch(
          `/api/quickbooks/data?report=profit-loss-monthly&realm_id=${encodeURIComponent(realmId)}`,
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [realmId]);

  useEffect(() => { load(); }, [load]);

  // Build a stable 12-month skeleton for the report's calendar year.
  // We always render all 12 months (future months render as zero for
  // expenses, budget for budget) so the table doesn't change shape
  // mid-year. Map QBO columns into the skeleton by month index.
  const { monthSlots, year } = useMemo(() => {
    const cols = report?.Columns?.Column || [];
    const headerYear = (() => {
      const sp = report?.Header?.StartPeriod;
      if (sp) {
        const m = /^(\d{4})-/.exec(sp);
        if (m) return parseInt(m[1], 10);
      }
      return new Date().getFullYear();
    })();

    // For each QBO column, figure out which month of headerYear it covers.
    // parseRow starts at i=1 so the numeric-array index is (ci - 1).
    const byMonth = new Map<number, number>(); // month (0-11) -> numeric index
    for (let ci = 1; ci < cols.length; ci++) {
      const c = cols[ci];
      const title = c.ColTitle || '';
      const startMeta = c.MetaData?.find((m) => m.Name === 'StartDate')?.Value;
      if (/^total$/i.test(title) && !startMeta) continue;
      if (startMeta) {
        const m = /^(\d{4})-(\d{2})-/.exec(startMeta);
        if (m && parseInt(m[1], 10) === headerYear) {
          byMonth.set(parseInt(m[2], 10) - 1, ci - 1);
        }
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const slots = monthNames.map((name, i) => ({
      label: `${name} ${String(headerYear).slice(-2)}`,
      numericIndex: byMonth.get(i),
    }));
    return { monthSlots: slots, year: headerYear };
  }, [report]);

  const rowsById = useMemo(() => indexRowsById(report?.Rows?.Row), [report]);

  const monthsShown = 12;
  void year;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 p-3 rounded-xl bg-red-50 border border-red-200">
        <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <p className="text-sm text-foreground/40 text-center py-8" style={{ fontFamily: 'var(--font-body)' }}>
        No departments yet. Create some in the Departments page first.
      </p>
    );
  }


  return (
    <div className="-m-6 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 bg-warm-bg/40">
            <th className="sticky left-0 bg-warm-bg/40 z-10 text-left px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Department</th>
            <th className="text-left px-3 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Row</th>
            {monthSlots.map((s, i) => (
              <th key={i} className="text-right px-3 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                {s.label}
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

            const budgetRow = monthSlots.map(() => monthly);
            const expenseRow = monthSlots.map((s) =>
              s.numericIndex !== undefined && expensesArr && Number.isFinite(expensesArr[s.numericIndex])
                ? expensesArr[s.numericIndex]
                : 0
            );
            const diffRow = budgetRow.map((b, i) => b - expenseRow[i]);

            const budgetTotal = budgetRow.reduce((s, v) => s + v, 0);
            const expenseTotal = expenseRow.reduce((s, v) => s + v, 0);
            const diffTotal = diffRow.reduce((s, v) => s + v, 0);

            // Averages/projection are based on months with actuals only so
            // future months don't drag the run-rate down to zero.
            const activeMonths = expenseRow.filter((v) => v !== 0).length || monthsShown;
            const budgetAvg = monthsShown > 0 ? budgetTotal / monthsShown : 0;
            const expenseAvg = activeMonths > 0 ? expenseTotal / activeMonths : 0;
            const diffAvg = budgetAvg - expenseAvg;

            const budgetProj = budgetAvg * 12;
            const expenseProj = expenseAvg * 12;
            const diffProj = budgetProj - expenseProj;

            const openInsight = (
              e: React.MouseEvent,
              rowLabel: 'Budget' | 'Expense' | 'Difference',
              monthIdx: number
            ) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const b = budgetRow[monthIdx];
              const x = expenseRow[monthIdx];
              const diff = diffRow[monthIdx];
              const value = rowLabel === 'Budget' ? b : rowLabel === 'Expense' ? x : diff;
              setInsight({
                deptName: d.name,
                rowLabel,
                monthLabel: monthSlots[monthIdx].label,
                value,
                budget: b,
                expense: x,
                diff,
                pctOfBudget: b > 0 ? (x / b) * 100 : null,
                ytdBudget: budgetRow.slice(0, monthIdx + 1).reduce((s, v) => s + v, 0),
                ytdExpense: expenseRow.slice(0, monthIdx + 1).reduce((s, v) => s + v, 0),
                ytdDiff: diffRow.slice(0, monthIdx + 1).reduce((s, v) => s + v, 0),
                avgExpense: expenseAvg,
                projectedExpense: expenseProj,
                projectedDiff: diffProj,
                anchorRect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
              });
            };

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
                    <td
                      key={i}
                      onClick={(e) => openInsight(e, 'Budget', i)}
                      className="px-3 py-2 text-right tabular-nums text-foreground/70 cursor-pointer hover:bg-primary/5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
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
                    <td
                      key={i}
                      onClick={(e) => openInsight(e, 'Expense', i)}
                      className="px-3 py-2 text-right tabular-nums text-foreground/70 cursor-pointer hover:bg-primary/5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
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
                      <td
                        key={i}
                        onClick={(e) => openInsight(e, 'Difference', i)}
                        className={`px-3 py-2 text-right tabular-nums font-medium cursor-pointer hover:bg-primary/5 ${d2.cls}`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
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

      {insight && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setInsight(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 p-4 animate-[fadeSlideUp_0.15s_ease-out]"
            style={{
              top: Math.min(
                insight.anchorRect.y + insight.anchorRect.h + 6,
                (typeof window !== 'undefined' ? window.innerHeight : 800) - 320
              ),
              left: Math.max(
                8,
                Math.min(
                  insight.anchorRect.x + insight.anchorRect.w / 2 - 144,
                  (typeof window !== 'undefined' ? window.innerWidth : 1200) - 296
                )
              ),
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
                  {insight.deptName} · {insight.monthLabel}
                </p>
                <p className="text-sm font-semibold text-foreground">{insight.rowLabel}</p>
              </div>
              <button
                onClick={() => setInsight(null)}
                className="text-foreground/30 hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
              <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-gray-100">
                <span className="text-foreground/50">Value</span>
                <span className="text-base font-bold text-foreground tabular-nums">{fmtMoney(insight.value)}</span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-foreground/50">Budget</span>
                <span className="text-foreground tabular-nums">{fmtMoney(insight.budget)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-foreground/50">Expense</span>
                <span className="text-foreground tabular-nums">{fmtMoney(insight.expense)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-foreground/50">Difference</span>
                <span className={`tabular-nums font-semibold ${fmtDiff(insight.diff).cls}`}>
                  {fmtDiff(insight.diff).label}
                </span>
              </div>
              {insight.pctOfBudget !== null && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground/50">% of budget spent</span>
                  <span className={`tabular-nums font-semibold ${
                    insight.pctOfBudget > 100 ? 'text-red-600' : insight.pctOfBudget > 90 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {insight.pctOfBudget.toFixed(0)}%
                  </span>
                </div>
              )}

              <div className="pt-2 mt-2 border-t border-gray-100 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold mb-1">Year to date</p>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground/50">Budget</span>
                  <span className="text-foreground tabular-nums">{fmtMoney(insight.ytdBudget)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground/50">Expense</span>
                  <span className="text-foreground tabular-nums">{fmtMoney(insight.ytdExpense)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground/50">Variance</span>
                  <span className={`tabular-nums font-semibold ${fmtDiff(insight.ytdDiff).cls}`}>
                    {fmtDiff(insight.ytdDiff).label}
                  </span>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-gray-100 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold mb-1">Projection</p>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground/50">Avg monthly spend</span>
                  <span className="text-foreground tabular-nums">{fmtMoney(insight.avgExpense)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground/50">Annual run-rate</span>
                  <span className="text-foreground tabular-nums">{fmtMoney(insight.projectedExpense)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground/50">Projected variance</span>
                  <span className={`tabular-nums font-semibold ${fmtDiff(insight.projectedDiff).cls}`}>
                    {fmtDiff(insight.projectedDiff).label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
