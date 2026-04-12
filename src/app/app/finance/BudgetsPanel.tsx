'use client';

// ------------------------------------------------------------
// Budgets tab — set a monthly budget for each department and match
// it to a QuickBooks P&L expense account so we can show live actuals
// alongside the planned spend.
//
// Data flow:
//   1. Load departments (public.departments).
//   2. Load existing budgets for this realm (public.department_budgets).
//   3. Fetch P&L (ProfitAndLoss) from QBO to enumerate top-level
//      expense account groups and pull current-period totals.
//   4. Auto-detect the best-matching account for any department that
//      doesn't yet have a saved qbo_account_id.
//   5. Let admins tweak the monthly budget + override the account
//      mapping inline; saves upsert into department_budgets.
//
// Annual budget is always monthly × 12 for display — we don't store
// it because it's a derived value.
// ------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

// A top-level expense group pulled from QBO's P&L report. "id" is QBO's
// summary row id (e.g. "1"); "accountId" is the Intuit account id when
// available. We match on name but store both so we can cross-reference
// later if Intuit changes names.
interface PnLAccount {
  id: string;
  name: string;
  total: number;
}

// QBO P&L row shape — recursive.
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
  Rows?: { Row?: QboRow[] };
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtMoneyPrecise(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

// Strip numeric prefixes and non-alphanumeric chars so "6000 Admin" and
// "Admin" and "Admin Department" all normalize to the same comparison
// string.
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[0-9]/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

// Rank a candidate P&L account against a department name. Higher is
// better. 0 = no match. Mirrors the kind of "is substring or close to"
// check a human would do — we don't need a real fuzzy-string lib for
// the 6-ish departments we have.
function scoreMatch(deptName: string, accountName: string): number {
  const d = norm(deptName);
  const a = norm(accountName);
  if (!d || !a) return 0;
  if (d === a) return 1000;
  // Word-boundary containment: "admin" inside "admin personnel"
  const dWords = d.split(' ').filter(Boolean);
  const aWords = a.split(' ').filter(Boolean);
  const allIn = dWords.every((w) => aWords.includes(w));
  if (allIn) return 500 + (d.length === a.length ? 100 : 0);
  // Loose substring ("admin" in "administration")
  if (a.includes(d)) return 300;
  if (d.includes(a)) return 200;
  // Shared longest word
  const shared = dWords.filter((w) => aWords.includes(w)).join('').length;
  return shared * 10;
}

// Walk the P&L tree and return every top-level expense group. QBO's
// ProfitAndLoss report has an "Expenses" section whose direct children
// are per-account groups — those are what we want to match departments
// against.
function extractExpenseAccounts(report: QboReport): PnLAccount[] {
  const rows = report.Rows?.Row || [];
  const out: PnLAccount[] = [];

  // Find the Expenses section. QBO sets row.group = "Expenses" on it.
  // Fallback: any row with a child group whose name includes "expense".
  const expensesSection =
    rows.find((r) => r.group === 'Expenses') ||
    rows.find(
      (r) =>
        r.Summary?.ColData?.[0]?.value?.toLowerCase().includes('expense') ||
        r.Header?.ColData?.[0]?.value?.toLowerCase().includes('expense')
    );
  if (!expensesSection?.Rows?.Row) return out;

  for (const child of expensesSection.Rows.Row) {
    // Two shapes: a leaf row (ColData only — a single account with no
    // sub-accounts) or a group (Header + Rows + Summary).
    if (child.Header?.ColData && child.Summary?.ColData) {
      const name = child.Header.ColData[0]?.value || '';
      const id = child.Header.ColData[0]?.id || name;
      const last = child.Summary.ColData[child.Summary.ColData.length - 1]?.value || '0';
      const total = parseFloat(last.replace(/,/g, '')) || 0;
      if (name) out.push({ id, name, total });
    } else if (child.ColData) {
      const name = child.ColData[0]?.value || '';
      const id = child.ColData[0]?.id || name;
      const last = child.ColData[child.ColData.length - 1]?.value || '0';
      const total = parseFloat(last.replace(/,/g, '')) || 0;
      if (name) out.push({ id, name, total });
    }
  }
  return out;
}

interface Props {
  realmId: string;
  onUpdated?: () => void;
}

export default function BudgetsPanel({ realmId, onUpdated }: Props) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [budgets, setBudgets] = useState<Record<string, BudgetRow>>({});
  const [accounts, setAccounts] = useState<PnLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Editable draft values keyed by department_id so a user can type a
  // new number without firing a save on every keystroke.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Departments + saved budgets come from Supabase in parallel.
      const [deptRes, budgetRes, pnlRes] = await Promise.all([
        supabase.from('departments').select('id, name, color').order('name'),
        supabase.from('department_budgets').select('*').eq('realm_id', realmId),
        fetch(`/api/quickbooks/data?report=profit-loss&realm_id=${encodeURIComponent(realmId)}`, {
          credentials: 'include',
        }),
      ]);

      if (deptRes.error) throw new Error(`Departments: ${deptRes.error.message}`);
      if (budgetRes.error) throw new Error(`Budgets: ${budgetRes.error.message}`);

      const depts = (deptRes.data || []) as Department[];
      const saved = (budgetRes.data || []) as BudgetRow[];
      const byDept: Record<string, BudgetRow> = {};
      for (const b of saved) byDept[b.department_id] = b;

      let pnlAccounts: PnLAccount[] = [];
      if (pnlRes.ok) {
        const report = (await pnlRes.json()) as QboReport;
        pnlAccounts = extractExpenseAccounts(report);
      } else if (pnlRes.status !== 401) {
        // Non-auth errors shouldn't block budget editing — we still let
        // the admin set numbers, just without an actuals column.
        console.warn('P&L fetch failed', pnlRes.status);
      }

      setDepartments(depts);
      setBudgets(byDept);
      setAccounts(pnlAccounts);
      // Seed drafts from saved monthly values.
      setDrafts(
        depts.reduce<Record<string, string>>((acc, d) => {
          acc[d.id] = byDept[d.id]?.monthly_budget != null ? String(byDept[d.id].monthly_budget) : '';
          return acc;
        }, {})
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [realmId]);

  useEffect(() => { load(); }, [load]);

  // For each department, return the account the user has explicitly
  // saved OR the best auto-detected match from the P&L.
  const matched = useMemo(() => {
    const out: Record<string, PnLAccount | null> = {};
    for (const d of departments) {
      const saved = budgets[d.id];
      if (saved?.qbo_account_id) {
        // Prefer the live P&L account by id so totals stay fresh; fall
        // back to the cached name if the account has since disappeared.
        const live = accounts.find((a) => a.id === saved.qbo_account_id);
        out[d.id] =
          live ||
          (saved.qbo_account_name
            ? { id: saved.qbo_account_id, name: saved.qbo_account_name, total: 0 }
            : null);
        continue;
      }
      // Auto-detect by name similarity.
      let best: PnLAccount | null = null;
      let bestScore = 0;
      for (const a of accounts) {
        const s = scoreMatch(d.name, a.name);
        if (s > bestScore) { bestScore = s; best = a; }
      }
      out[d.id] = bestScore > 0 ? best : null;
    }
    return out;
  }, [departments, budgets, accounts]);

  async function saveBudget(deptId: string, monthly: number, account: PnLAccount | null) {
    setSavingId(deptId);
    try {
      const existing = budgets[deptId];
      const row = {
        department_id: deptId,
        realm_id: realmId,
        monthly_budget: monthly,
        qbo_account_id: account?.id || null,
        qbo_account_name: account?.name || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('department_budgets')
        .upsert(existing ? { ...row, id: existing.id } : row, {
          onConflict: 'department_id,realm_id',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setBudgets((prev) => ({ ...prev, [deptId]: data as BudgetRow }));
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  }

  function handleBlur(deptId: string) {
    const raw = drafts[deptId] ?? '';
    const parsed = parseFloat(raw.replace(/[^0-9.-]/g, ''));
    const monthly = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const current = budgets[deptId]?.monthly_budget ?? 0;
    const currentAccount = matched[deptId] ?? null;
    if (monthly === current && budgets[deptId]?.qbo_account_id === currentAccount?.id) return;
    saveBudget(deptId, monthly, currentAccount);
  }

  async function handleAccountOverride(deptId: string, accountId: string) {
    const account = accounts.find((a) => a.id === accountId) || null;
    const monthly = budgets[deptId]?.monthly_budget ?? parseFloat(drafts[deptId] || '0') ?? 0;
    await saveBudget(deptId, monthly, account);
  }

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
        No departments yet. Create some in the Departments page first.
      </p>
    );
  }

  const totalMonthly = departments.reduce(
    (sum, d) => sum + (parseFloat(drafts[d.id] || '0') || budgets[d.id]?.monthly_budget || 0),
    0
  );
  const totalAnnual = totalMonthly * 12;
  const totalActual = departments.reduce((sum, d) => sum + (matched[d.id]?.total || 0), 0);

  return (
    <div className="-m-6">
      {error && (
        <div className="m-6 mb-0 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        </div>
      )}

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-warm-bg/40">
            <th className="text-left px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Department</th>
            <th className="text-left px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>P&amp;L Account</th>
            <th className="text-right px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Monthly Budget</th>
            <th className="text-right px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Annual Budget</th>
            <th className="text-right px-6 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Current Period</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => {
            const draft = drafts[d.id] ?? '';
            const monthlyNum = parseFloat(draft.replace(/[^0-9.-]/g, ''));
            const monthly = Number.isFinite(monthlyNum) ? monthlyNum : 0;
            const annual = monthly * 12;
            const account = matched[d.id] || null;
            const hasSavedOverride = !!budgets[d.id]?.qbo_account_id;
            const isSaving = savingId === d.id;
            return (
              <tr key={d.id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/20 transition-colors group">
                <td className="px-6 py-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/app/finance/department/${d.id}?realm_id=${encodeURIComponent(realmId)}`)}
                    className="flex items-center gap-2 text-left hover:text-primary transition-colors"
                  >
                    {d.color && <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />}
                    <span className="text-sm font-medium text-foreground group-hover:text-primary underline-offset-2 group-hover:underline">{d.name}</span>
                    <svg className="w-3 h-3 text-foreground/30 group-hover:text-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
                <td className="px-6 py-3">
                  {accounts.length === 0 ? (
                    <span className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>No P&amp;L data</span>
                  ) : (
                    <select
                      value={account?.id || ''}
                      onChange={(e) => handleAccountOverride(d.id, e.target.value)}
                      className="w-full max-w-[260px] text-xs bg-transparent border border-gray-200 rounded-full px-3 py-1.5 hover:border-primary/40 focus:border-primary focus:outline-none transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                      disabled={isSaving}
                    >
                      <option value="">— no match —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                  {account && !hasSavedOverride && (
                    <p className="text-[10px] text-foreground/40 mt-1 ml-3" style={{ fontFamily: 'var(--font-body)' }}>
                      auto-matched
                    </p>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <span className="text-sm text-foreground/40">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      onBlur={() => handleBlur(d.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      placeholder="0"
                      disabled={isSaving}
                      className="w-28 text-right text-sm font-semibold text-foreground tabular-nums bg-transparent border border-gray-200 rounded-lg px-2 py-1 hover:border-primary/40 focus:border-primary focus:outline-none transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                  </div>
                </td>
                <td className="px-6 py-3 text-right text-sm text-foreground/70 tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                  {fmtMoney(annual)}
                  <div className="text-[10px] text-foreground/30">per year</div>
                </td>
                <td className="px-6 py-3 text-right text-sm tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                  {account ? (
                    <span className={account.total > monthly * 12 ? 'text-red-600 font-semibold' : 'text-foreground/70'}>
                      {fmtMoneyPrecise(account.total)}
                    </span>
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
            <td className="px-6 py-4 text-xs uppercase tracking-wider text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>Totals</td>
            <td className="px-6 py-4"></td>
            <td className="px-6 py-4 text-right text-sm text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(totalMonthly)}</td>
            <td className="px-6 py-4 text-right text-sm text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(totalAnnual)}</td>
            <td className="px-6 py-4 text-right text-sm text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoneyPrecise(totalActual)}</td>
          </tr>
        </tfoot>
      </table>

      {accounts.length === 0 && (
        <div className="m-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-800" style={{ fontFamily: 'var(--font-body)' }}>
            Couldn&apos;t pull any expense accounts from the P&amp;L report for this company. You can still set
            budgets, and account matching will re-run the next time the report is reachable.
          </p>
        </div>
      )}
    </div>
  );
}
