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

// Filled pill-style diff formatting for the Difference row cells —
// green background when under budget, red when over, white text.
function fmtDiffFilled(n: number): { label: string; cls: string } {
  if (!Number.isFinite(n) || n === 0) return { label: '—', cls: 'text-foreground/30' };
  const sign = n >= 0 ? '+' : '−';
  return {
    label: `${sign}${Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`,
    cls: n >= 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
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

// Pick a department icon by name. Matches common recovery-ops department
// keywords; falls back to a generic building. Icons are 16×16 stroke
// SVGs rendered inline so they inherit the department color via currentColor.
function DeptIcon({ name, className }: { name: string; className?: string }) {
  const n = name.toLowerCase();
  const cls = className || 'w-4 h-4';
  const props = {
    className: cls,
    fill: 'none' as const,
    stroke: 'currentColor' as const,
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (/admin|office|ops|operation/.test(n)) {
    // Briefcase
    return (
      <svg {...props}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
        <path d="M3 12h18" />
      </svg>
    );
  }
  if (/clinic|therap|counsel|behavior|mental|psych/.test(n)) {
    // Chat bubble with heart
    return (
      <svg {...props}>
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        <path d="M12 14s-2.5-1.5-2.5-3.2A1.5 1.5 0 0112 9.5a1.5 1.5 0 012.5 1.3C14.5 12.5 12 14 12 14z" />
      </svg>
    );
  }
  if (/medical|nurs|doctor|health|rx|pharm/.test(n)) {
    // Medical cross
    return (
      <svg {...props}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }
  if (/equine|horse|barn|stable|animal/.test(n)) {
    // Horse silhouette
    return (
      <svg {...props}>
        <path d="M5 21v-4a4 4 0 014-4h2l2-4 2 1 2-3 2 1-1 3 1 2v3l-2 2v3" />
        <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (/kitchen|food|chef|meal|dining|cook/.test(n)) {
    // Chef hat
    return (
      <svg {...props}>
        <path d="M6 14a4 4 0 01-1-7.9A5 5 0 0112 3a5 5 0 017 3.1A4 4 0 0118 14" />
        <path d="M6 14h12v5a2 2 0 01-2 2H8a2 2 0 01-2-2v-5z" />
      </svg>
    );
  }
  if (/market|admission|intake|sales|outreach|brand/.test(n)) {
    // Megaphone
    return (
      <svg {...props}>
        <path d="M3 11v2a1 1 0 001 1h2l6 4V6L6 10H4a1 1 0 00-1 1z" />
        <path d="M16 8a5 5 0 010 8" />
      </svg>
    );
  }
  if (/facilit|maint|housek|clean|janitor/.test(n)) {
    // Wrench
    return (
      <svg {...props}>
        <path d="M14.7 6.3a4 4 0 015.5 5.5l-2.3-2.3-2.1 2.1 2.3 2.3a4 4 0 01-5.5-5.5l-7.3 7.3a2 2 0 102.8 2.8l7.3-7.3" />
      </svg>
    );
  }
  if (/fleet|transport|driver|vehicle|car/.test(n)) {
    // Truck
    return (
      <svg {...props}>
        <rect x="2" y="7" width="12" height="9" rx="1" />
        <path d="M14 10h4l3 3v3h-7" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </svg>
    );
  }
  if (/billing|finance|account|revenue|rcm/.test(n)) {
    // Receipt
    return (
      <svg {...props}>
        <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }
  if (/hr|human|people|staff|recruit/.test(n)) {
    // Users
    return (
      <svg {...props}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0112 0" />
        <path d="M16 11a3 3 0 000-6" />
        <path d="M21 20a6 6 0 00-5-5.9" />
      </svg>
    );
  }
  if (/compli|legal|audit|risk/.test(n)) {
    // Shield check
    return (
      <svg {...props}>
        <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (/group|program|activit|recreation|rec /.test(n)) {
    // Sparkles
    return (
      <svg {...props}>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
      </svg>
    );
  }
  if (/call|phone|contact/.test(n)) {
    // Phone
    return (
      <svg {...props}>
        <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z" />
      </svg>
    );
  }

  // Default — building
  return (
    <svg {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
    </svg>
  );
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

  // How many months of the report year are "complete" for the purpose of
  // YTD totals / averages / projections.
  //
  // A month only counts as complete once we're at least 20 days into the
  // NEXT month — this gives QuickBooks time to have month-end entries
  // settled. So on 2026-04-13 only Jan & Feb count; on 2026-04-21 Jan–Mar
  // count. For past years this is 12, for future years 0.
  const { elapsedMonths, futureMonth } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const day = now.getDate();
    let elapsed = 12;
    if (year > currentYear) {
      elapsed = 0;
    } else if (year === currentYear) {
      // Last complete month is (currentMonth - 1) if we're past day 20 of
      // the current month, otherwise (currentMonth - 2).
      const lastCompleteIdx = day >= 20 ? currentMonth - 1 : currentMonth - 2;
      elapsed = Math.max(0, lastCompleteIdx + 1);
    }
    return {
      elapsedMonths: elapsed,
      futureMonth: (i: number) => i >= elapsed,
    };
  }, [year]);

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
            <th className="text-left px-3 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Metric</th>
            {monthSlots.map((s, i) => (
              <th key={i} className="text-right px-3 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                {s.label}
              </th>
            ))}
            <th className="text-right px-3 py-3 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider border-l border-gray-200 bg-warm-bg/60" style={{ fontFamily: 'var(--font-body)' }}>YTD</th>
            <th className="text-right px-3 py-3 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider bg-warm-bg/60" style={{ fontFamily: 'var(--font-body)' }}>Avg / Mo</th>
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

            // YTD totals — only sum months that have actually elapsed so
            // the number matches "what we've done so far", not a mix of
            // full-year budget vs partial-year spend.
            const budgetTotal = budgetRow.slice(0, elapsedMonths).reduce((s, v) => s + v, 0);
            const expenseTotal = expenseRow.slice(0, elapsedMonths).reduce((s, v) => s + v, 0);
            const diffTotal = budgetTotal - expenseTotal;

            // Averages are YTD / months elapsed — apples-to-apples.
            const budgetAvg = elapsedMonths > 0 ? budgetTotal / elapsedMonths : 0;
            const expenseAvg = elapsedMonths > 0 ? expenseTotal / elapsedMonths : 0;
            const diffAvg = budgetAvg - expenseAvg;

            // Projected = YTD run-rate × 12 (annualized).
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
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-lg shrink-0"
                        style={{
                          background: `${d.color || '#a0522d'}18`,
                          color: d.color || '#a0522d',
                        }}
                      >
                        <DeptIcon name={d.name} className="w-3.5 h-3.5" />
                      </span>
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
                  {expenseRow.map((v, i) => {
                    if (futureMonth(i)) {
                      return (
                        <td
                          key={i}
                          className="px-3 py-2 text-right tabular-nums text-foreground/30"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          —
                        </td>
                      );
                    }
                    return (
                      <td
                        key={i}
                        onClick={(e) => openInsight(e, 'Expense', i)}
                        className="px-3 py-2 text-right tabular-nums text-foreground/70 cursor-pointer hover:bg-primary/5"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {fmtMoney(v)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground border-l border-gray-200 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(expenseTotal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground/70 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(expenseAvg)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground/70 bg-warm-bg/20" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(expenseProj)}</td>
                </tr>
                <tr className={`hover:bg-warm-bg/10 ${groupBorder}`}>
                  <td className="px-3 py-2 text-[11px] font-semibold text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Difference</td>
                  {diffRow.map((v, i) => {
                    if (futureMonth(i)) {
                      return (
                        <td
                          key={i}
                          className="px-3 py-2 text-right tabular-nums text-foreground/30"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          —
                        </td>
                      );
                    }
                    const d2 = fmtDiffFilled(v);
                    return (
                      <td
                        key={i}
                        onClick={(e) => openInsight(e, 'Difference', i)}
                        className="px-2 py-1.5 text-right cursor-pointer"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <span className={`inline-block px-2 py-1 rounded-md tabular-nums font-semibold text-[11px] ${d2.cls}`}>
                          {d2.label}
                        </span>
                      </td>
                    );
                  })}
                  {[diffTotal, diffAvg, diffProj].map((v, i) => {
                    const d2 = fmtDiffFilled(v);
                    return (
                      <td
                        key={i}
                        className={`px-2 py-1.5 text-right bg-warm-bg/20 ${i === 0 ? 'border-l border-gray-200' : ''}`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <span className={`inline-block px-2 py-1 rounded-md tabular-nums font-semibold text-[11px] ${d2.cls}`}>
                          {d2.label}
                        </span>
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
