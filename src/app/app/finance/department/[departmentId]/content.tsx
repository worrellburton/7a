'use client';

// ------------------------------------------------------------
// Department budget detail page.
//
// Reached by clicking a row in BudgetsPanel. The URL carries ?realm_id=X
// identifying which connected QuickBooks company to pull data from.
//
// Layout: header (dept name + budget summary) + four tabs:
//   - Overview  – budget vs. actuals + account list
//   - Personnel – roster CRUD (department_personnel table)
//   - Expenses  – P&L detail filtered to this dept's accounts
//   - Ledger    – General Ledger filtered to this dept's accounts
// ------------------------------------------------------------

import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────

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
  SubAccount?: boolean;
  FullyQualifiedName?: string;
}

interface AccountsResponse {
  QueryResponse?: { Account?: QboAccount[] };
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
  Header?: { ReportName?: string; StartPeriod?: string; EndPeriod?: string };
  Columns?: { Column?: Array<{ ColTitle?: string; ColType?: string }> };
  Rows?: { Row?: ReportRow[] };
}

interface Personnel {
  id: string;
  department_id: string;
  employment_type: string | null;
  name: string;
  title: string | null;
  pay_type: string | null;
  estimated_weekly_hours: number | null;
  total_annual_employer_cost: number | null;
  total_monthly_employer_cost: number | null;
  sort_order: number;
}

type Tab = 'overview' | 'personnel' | 'expenses' | 'ledger';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'ledger', label: 'Ledger' },
];

// ─── Helpers ─────────────────────────────────────────────────────

function fmtMoney(n: number | null | undefined, precise = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: precise ? 2 : 0,
  });
}

// Flatten a report's row tree down to leaf rows so we can render a
// simple table. QBO reports nest rows under Header/Rows/Summary groups;
// we keep the summary rows so section totals still show.
function flattenReportRows(rows: ReportRow[] | undefined, depth = 0, out: Array<{ row: ReportRow; depth: number; kind: 'leaf' | 'header' | 'summary' }> = []): Array<{ row: ReportRow; depth: number; kind: 'leaf' | 'header' | 'summary' }> {
  if (!rows) return out;
  for (const r of rows) {
    if (r.Header?.ColData) {
      out.push({ row: { ColData: r.Header.ColData }, depth, kind: 'header' });
    }
    if (r.ColData && !r.Rows && !r.Summary) {
      out.push({ row: r, depth, kind: 'leaf' });
    }
    if (r.Rows?.Row) {
      flattenReportRows(r.Rows.Row, depth + 1, out);
    }
    if (r.Summary?.ColData) {
      out.push({ row: { ColData: r.Summary.ColData }, depth, kind: 'summary' });
    }
  }
  return out;
}

// ─── Component ───────────────────────────────────────────────────

export default function DepartmentBudgetContent() {
  const params = useParams<{ departmentId: string }>();
  const searchParams = useSearchParams();
  return (
    <DepartmentBudgetBody
      departmentId={params?.departmentId}
      realmId={searchParams.get('realm_id')}
    />
  );
}

// Renders the department's budget/personnel/expenses/ledger surface.
// Passing `embedded` drops the outer page chrome (breadcrumb + padding)
// so Finance can inline this under its Budget section.
export function DepartmentBudgetBody({
  departmentId,
  realmId,
  embedded = false,
}: {
  departmentId: string | undefined;
  realmId: string | null;
  embedded?: boolean;
}) {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('overview');
  const [department, setDepartment] = useState<Department | null>(null);
  const [budget, setBudget] = useState<BudgetRow | null>(null);
  const [qboAccounts, setQboAccounts] = useState<QboAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin gate
  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) router.replace('/app');
  }, [session, isAdmin, router]);

  // Load department + saved budget + QBO accounts in parallel.
  const load = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    setError(null);
    try {
      const [deptRes, budgetRes, acctsRes] = await Promise.all([
        supabase.from('departments').select('id, name, color').eq('id', departmentId).maybeSingle(),
        realmId
          ? supabase.from('department_budgets').select('*').eq('realm_id', realmId).eq('department_id', departmentId).maybeSingle()
          : Promise.resolve({ data: null, error: null as null | { message: string } }),
        realmId
          ? fetch(`/api/quickbooks/data?report=accounts&realm_id=${encodeURIComponent(realmId)}`, { credentials: 'include' })
          : Promise.resolve(null),
      ]);

      if (deptRes.error) throw new Error(deptRes.error.message);
      if (!deptRes.data) throw new Error('Department not found');
      setDepartment(deptRes.data as Department);

      if (budgetRes && 'error' in budgetRes && budgetRes.error) {
        throw new Error(budgetRes.error.message);
      }
      setBudget(budgetRes?.data as BudgetRow | null);

      if (acctsRes && acctsRes.ok) {
        const body = (await acctsRes.json()) as AccountsResponse;
        setQboAccounts(body.QueryResponse?.Account || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [departmentId, realmId]);

  useEffect(() => { load(); }, [load]);

  // Every account that rolls up under this dept's mapped parent — the
  // parent itself plus any descendant at any depth. QBO chart of
  // accounts can nest arbitrarily (e.g. 6000 Admin → 6080 Admin
  // Personnel → 6081 Admin Salaries & Wages), so we walk the whole
  // subtree rather than stopping at two levels.
  const deptAccounts = useMemo<QboAccount[]>(() => {
    if (!budget?.qbo_account_id || qboAccounts.length === 0) return [];

    // Index children by parent id for O(1) lookup during the walk.
    const byId = new Map<string, QboAccount>();
    const byParent = new Map<string, QboAccount[]>();
    for (const a of qboAccounts) {
      byId.set(a.Id, a);
      const p = a.ParentRef?.value;
      if (!p) continue;
      const list = byParent.get(p);
      if (list) list.push(a);
      else byParent.set(p, [a]);
    }

    const out: QboAccount[] = [];
    const seen = new Set<string>();
    const stack: string[] = [budget.qbo_account_id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const a = byId.get(id);
      if (a) out.push(a);
      for (const child of byParent.get(id) || []) stack.push(child.Id);
    }
    return out;
  }, [budget, qboAccounts]);

  const accountListParam = useMemo(
    () => deptAccounts.map((a) => a.Id).join(','),
    [deptAccounts]
  );

  if (!user || !isAdmin) return null;

  if (loading) {
    return (
      <div className={`${embedded ? 'p-6' : 'p-6 lg:p-10'} flex items-center justify-center min-h-[200px]`}>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !department) {
    return (
      <div className={embedded ? 'p-6' : 'p-6 lg:p-10'}>
        {!embedded && (
          <Link href="/app/finance" className="text-xs font-semibold text-primary hover:underline">← Back to Finance</Link>
        )}
        <div className={`${embedded ? '' : 'mt-4'} p-4 rounded-xl bg-red-50 border border-red-200`}>
          <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>
            {error || 'Department not found'}
          </p>
        </div>
      </div>
    );
  }

  const monthly = budget?.monthly_budget ?? 0;
  const annual = monthly * 12;

  const body = (
    <>
      {!embedded && (
        <>
          {/* Breadcrumb */}
          <Link href="/app/finance" className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/50 hover:text-primary transition-colors mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Finance
          </Link>

          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                {department.color && (
                  <span className="w-3 h-3 rounded-full" style={{ background: department.color }} />
                )}
                <h1 className="text-lg font-semibold text-foreground tracking-tight">{department.name}</h1>
              </div>
              <p className="text-sm text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                Department budget, personnel, expenses, and general ledger.
              </p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Monthly</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{fmtMoney(monthly)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Annual</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{fmtMoney(annual)}</p>
              </div>
              {budget?.qbo_account_name && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>P&amp;L Account</p>
                  <p className="text-sm font-semibold text-foreground">{budget.qbo_account_name}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className={`flex gap-1 ${embedded ? 'px-4 py-2 border-b border-gray-100 bg-warm-bg/10 overflow-x-auto' : 'mb-5'}`}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              embedded
                ? `px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    tab === t.id
                      ? 'bg-foreground text-white'
                      : 'text-foreground/50 hover:bg-warm-bg'
                  }`
                : `px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    tab === t.id
                      ? 'bg-foreground text-white'
                      : 'text-foreground/50 hover:bg-warm-bg'
                  }`
            }
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!realmId && !embedded && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-5">
          <p className="text-xs text-amber-800" style={{ fontFamily: 'var(--font-body)' }}>
            No QuickBooks company selected. Return to <Link href="/app/finance" className="font-semibold underline">Finance</Link> and pick a realm to see live account data.
          </p>
        </div>
      )}

      <div className={embedded ? '' : 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'}>
        {tab === 'overview' && (
          <OverviewTab
            budget={budget}
            deptAccounts={deptAccounts}
          />
        )}
        {tab === 'personnel' && (
          <PersonnelTab departmentId={department.id} />
        )}
        {tab === 'expenses' && (
          <ExpensesTab
            realmId={realmId}
            accountListParam={accountListParam}
            hasAccounts={deptAccounts.length > 0}
          />
        )}
        {tab === 'ledger' && (
          <LedgerTab
            realmId={realmId}
            accountListParam={accountListParam}
            hasAccounts={deptAccounts.length > 0}
          />
        )}
      </div>
    </>
  );

  if (embedded) return body;

  return <div className="p-6 lg:p-10">{body}</div>;
}

// ─── Overview Tab ────────────────────────────────────────────────

function OverviewTab({
  budget,
  deptAccounts,
}: {
  budget: BudgetRow | null;
  deptAccounts: QboAccount[];
}) {
  const totalBalance = deptAccounts.reduce((sum, a) => sum + (a.CurrentBalance || 0), 0);
  const monthly = budget?.monthly_budget ?? 0;
  const annual = monthly * 12;

  return (
    <div className="p-6 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Monthly Budget" value={fmtMoney(monthly)} />
        <Card label="Annual Budget" value={fmtMoney(annual)} />
        <Card
          label="Current Balance"
          value={fmtMoney(totalBalance, true)}
          tone={totalBalance > annual ? 'danger' : 'default'}
        />
      </div>

      {/* Accounts list */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">P&amp;L Accounts</h2>
        {deptAccounts.length === 0 ? (
          <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
            No QuickBooks account is mapped to this department yet. Set one on the Finance page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/30">
                  <th className="text-left px-4 py-2 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Name</th>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
                  <th className="text-left px-4 py-2 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Subtype</th>
                  <th className="text-right px-4 py-2 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {deptAccounts.map((a) => (
                  <tr key={a.Id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/20">
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground">
                      {a.AcctNum && <span className="text-foreground/40 mr-2 tabular-nums">{a.AcctNum}</span>}
                      {a.Name}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{a.AccountType || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{a.AccountSubType || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-right tabular-nums text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
                      {fmtMoney(a.CurrentBalance, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: 'default' | 'danger' }) {
  return (
    <div className={`p-4 rounded-xl border ${tone === 'danger' ? 'bg-red-50 border-red-200' : 'bg-warm-bg/30 border-gray-100'}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-1 ${tone === 'danger' ? 'text-red-700' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

// ─── Personnel Tab ───────────────────────────────────────────────

function PersonnelTab({ departmentId }: { departmentId: string }) {
  const [rows, setRows] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('department_personnel')
      .select('*')
      .eq('department_id', departmentId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) setError(error.message);
    else setRows((data || []) as Personnel[]);
    setLoading(false);
  }, [departmentId]);

  useEffect(() => { load(); }, [load]);

  async function addRow() {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { data, error } = await supabase
      .from('department_personnel')
      .insert({
        department_id: departmentId,
        name: '',
        sort_order: maxOrder + 1,
      })
      .select()
      .single();
    if (error) { setError(error.message); return; }
    setRows((prev) => [...prev, data as Personnel]);
  }

  async function updateRow(id: string, patch: Partial<Personnel>) {
    setSavingId(id);
    // Recompute monthly from annual if annual changes and monthly isn't
    // explicitly set in the same patch.
    if (patch.total_annual_employer_cost != null && patch.total_monthly_employer_cost === undefined) {
      const annual = Number(patch.total_annual_employer_cost);
      if (Number.isFinite(annual)) patch.total_monthly_employer_cost = +(annual / 12).toFixed(2);
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase
      .from('department_personnel')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setError(error.message);
    setSavingId(null);
  }

  async function deleteRow(id: string) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from('department_personnel').delete().eq('id', id);
    if (error) { setError(error.message); setRows(prev); }
  }

  const totalWeekly = rows.reduce((s, r) => s + (Number(r.estimated_weekly_hours) || 0), 0);
  const totalAnnual = rows.reduce((s, r) => s + (Number(r.total_annual_employer_cost) || 0), 0);
  const totalMonthly = rows.reduce((s, r) => s + (Number(r.total_monthly_employer_cost) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="m-6 mb-0 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-warm-bg/40">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Title</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Pay Type</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Est. Weekly Hrs</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Annual Employer Cost</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Monthly Employer Cost</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                  No personnel yet. Add a row below.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <PersonnelEditableRow
                  key={r.id}
                  row={r}
                  onUpdate={(patch) => updateRow(r.id, patch)}
                  onDelete={() => deleteRow(r.id)}
                  saving={savingId === r.id}
                />
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-warm-bg/30 font-semibold">
                <td className="px-4 py-3 text-xs uppercase tracking-wider text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>Totals</td>
                <td colSpan={3} />
                <td className="px-4 py-3 text-right text-sm text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{totalWeekly.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-sm text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(totalAnnual)}</td>
                <td className="px-4 py-3 text-right text-sm text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(totalMonthly)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={addRow}
          className="px-4 py-2 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          + Add Person
        </button>
      </div>
    </div>
  );
}

function PersonnelEditableRow({
  row,
  onUpdate,
  onDelete,
  saving,
}: {
  row: Personnel;
  onUpdate: (patch: Partial<Personnel>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  // Local draft so we don't fire an update on every keystroke.
  const [draft, setDraft] = useState(row);
  useEffect(() => { setDraft(row); }, [row]);

  function blurText<K extends keyof Personnel>(field: K, raw: string) {
    const v = raw.trim() || null;
    if (v === (row[field] ?? null)) return;
    onUpdate({ [field]: v } as Partial<Personnel>);
  }
  function blurNum<K extends keyof Personnel>(field: K, raw: string) {
    const parsed = parseFloat(raw.replace(/[^0-9.-]/g, ''));
    const v = Number.isFinite(parsed) ? parsed : null;
    if (v === (row[field] ?? null)) return;
    onUpdate({ [field]: v } as Partial<Personnel>);
  }

  const inputCls = 'w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-primary rounded-md px-2 py-1 text-sm focus:outline-none transition-colors';

  return (
    <tr className={`border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/20 transition-colors ${saving ? 'opacity-60' : ''}`}>
      <td className="px-4 py-2">
        <input
          type="text"
          placeholder="W2 / 1099"
          value={draft.employment_type || ''}
          onChange={(e) => setDraft({ ...draft, employment_type: e.target.value })}
          onBlur={(e) => blurText('employment_type', e.target.value)}
          className={inputCls}
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          placeholder="Name"
          value={draft.name || ''}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onBlur={(e) => onUpdate({ name: e.target.value.trim() })}
          className={`${inputCls} font-medium text-foreground`}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          placeholder="Title"
          value={draft.title || ''}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          onBlur={(e) => blurText('title', e.target.value)}
          className={inputCls}
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          placeholder="Salary / Hourly"
          value={draft.pay_type || ''}
          onChange={(e) => setDraft({ ...draft, pay_type: e.target.value })}
          onBlur={(e) => blurText('pay_type', e.target.value)}
          className={inputCls}
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={draft.estimated_weekly_hours ?? ''}
          onChange={(e) => setDraft({ ...draft, estimated_weekly_hours: e.target.value === '' ? null : Number(e.target.value) })}
          onBlur={(e) => blurNum('estimated_weekly_hours', e.target.value)}
          className={`${inputCls} text-right tabular-nums`}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="$0"
          value={draft.total_annual_employer_cost ?? ''}
          onChange={(e) => setDraft({ ...draft, total_annual_employer_cost: e.target.value === '' ? null : Number(e.target.value) })}
          onBlur={(e) => blurNum('total_annual_employer_cost', e.target.value)}
          className={`${inputCls} text-right tabular-nums`}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="$0"
          value={draft.total_monthly_employer_cost ?? ''}
          onChange={(e) => setDraft({ ...draft, total_monthly_employer_cost: e.target.value === '' ? null : Number(e.target.value) })}
          onBlur={(e) => blurNum('total_monthly_employer_cost', e.target.value)}
          className={`${inputCls} text-right tabular-nums`}
        />
      </td>
      <td className="px-2 py-2">
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-full text-foreground/30 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Remove"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ─── Expenses Tab ────────────────────────────────────────────────

function ExpensesTab({
  realmId,
  accountListParam,
  hasAccounts,
}: {
  realmId: string | null;
  accountListParam: string;
  hasAccounts: boolean;
}) {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!realmId || !hasAccounts) return;
    setLoading(true);
    setError(null);
    const url = `/api/quickbooks/data?report=profit-loss-detail&realm_id=${encodeURIComponent(realmId)}&account_list=${encodeURIComponent(accountListParam)}`;
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
  }, [realmId, hasAccounts, accountListParam]);

  if (!realmId) {
    return <EmptyState message="Pick a QuickBooks company on the Finance page to load expenses." />;
  }
  if (!hasAccounts) {
    return <EmptyState message="Map a P&L account to this department to see expenses." />;
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState message="No expense data yet." />;

  return <ReportTable data={data} />;
}

// ─── Ledger Tab ──────────────────────────────────────────────────

function LedgerTab({
  realmId,
  accountListParam,
  hasAccounts,
}: {
  realmId: string | null;
  accountListParam: string;
  hasAccounts: boolean;
}) {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!realmId || !hasAccounts) return;
    setLoading(true);
    setError(null);
    const url = `/api/quickbooks/data?report=general-ledger&realm_id=${encodeURIComponent(realmId)}&account_list=${encodeURIComponent(accountListParam)}`;
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
  }, [realmId, hasAccounts, accountListParam]);

  if (!realmId) {
    return <EmptyState message="Pick a QuickBooks company on the Finance page to load the ledger." />;
  }
  if (!hasAccounts) {
    return <EmptyState message="Map a P&L account to this department to see the ledger." />;
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState message="No ledger entries yet." />;

  return <ReportTable data={data} />;
}

// ─── Shared report renderer ──────────────────────────────────────

function ReportTable({ data }: { data: ReportResponse }) {
  const columns = data.Columns?.Column || [];
  const flat = flattenReportRows(data.Rows?.Row);

  if (flat.length === 0) {
    return <EmptyState message="No rows returned from QuickBooks." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-warm-bg/30">
            {columns.map((c, i) => (
              <th
                key={i}
                className={`px-3 py-2 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider ${
                  i === 0 ? 'text-left' : 'text-right'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {c.ColTitle || ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flat.map((entry, idx) => {
            const cells = entry.row.ColData || [];
            return (
              <tr
                key={idx}
                className={`border-b border-gray-100 last:border-b-0 ${
                  entry.kind === 'header' ? 'bg-warm-bg/20 font-semibold' :
                  entry.kind === 'summary' ? 'bg-warm-bg/10 font-semibold' :
                  'hover:bg-warm-bg/10'
                }`}
              >
                {cells.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-2 text-xs ${ci === 0 ? 'text-left' : 'text-right tabular-nums'}`}
                    style={{
                      fontFamily: 'var(--font-body)',
                      paddingLeft: ci === 0 ? `${12 + entry.depth * 12}px` : undefined,
                    }}
                  >
                    {cell.value || ''}
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

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-foreground/40 text-center py-10" style={{ fontFamily: 'var(--font-body)' }}>
      {message}
    </p>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="m-6 p-3 rounded-xl bg-red-50 border border-red-200">
      <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>{message}</p>
    </div>
  );
}
