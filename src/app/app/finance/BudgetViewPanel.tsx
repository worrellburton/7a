'use client';

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

interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department_id: string | null;
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

interface Props {
  realmId: string;
}

export default function BudgetViewPanel({ realmId }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [budgets, setBudgets] = useState<Record<string, BudgetRow>>({});
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, budgetRes, userRes] = await Promise.all([
        supabase.from('departments').select('id, name, color').order('name'),
        supabase.from('department_budgets').select('*').eq('realm_id', realmId),
        supabase.from('users').select('id, email, full_name, avatar_url, job_title, department_id').order('full_name'),
      ]);
      if (deptRes.error) throw new Error(deptRes.error.message);
      if (budgetRes.error) throw new Error(budgetRes.error.message);
      if (userRes.error) throw new Error(userRes.error.message);

      setDepartments((deptRes.data || []) as Department[]);
      const saved = (budgetRes.data || []) as BudgetRow[];
      const byDept: Record<string, BudgetRow> = {};
      for (const b of saved) byDept[b.department_id] = b;
      setBudgets(byDept);
      setUsers((userRes.data || []) as AppUser[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [realmId]);

  useEffect(() => { load(); }, [load]);

  const membersByDept = useMemo(() => {
    const map: Record<string, AppUser[]> = {};
    for (const d of departments) {
      map[d.id] = users.filter((u) => u.department_id === d.id);
    }
    return map;
  }, [departments, users]);

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

  const totalMonthly = departments.reduce((sum, d) => sum + (budgets[d.id]?.monthly_budget || 0), 0);

  return (
    <div className="-m-6">
      {error && (
        <div className="m-6 mb-0 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
        {departments.map((d) => {
          const budget = budgets[d.id];
          const monthly = budget?.monthly_budget || 0;
          const annual = monthly * 12;
          const members = membersByDept[d.id] || [];

          return (
            <div
              key={d.id}
              className="rounded-xl border border-gray-100 bg-warm-bg/20 p-4 flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: d.color || '#a0522d' }}
                >
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                  <p className="text-[11px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                    {budget?.qbo_account_name || 'No P&L account mapped'}
                  </p>
                </div>
              </div>

              {/* Budget figures */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Monthly</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">{fmtMoney(monthly)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Annual</p>
                  <p className="text-lg font-bold text-foreground/70 tabular-nums">{fmtMoney(annual)}</p>
                </div>
              </div>

              {/* Team members */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                  Team ({members.length})
                </p>
                {members.length === 0 ? (
                  <p className="text-xs text-foreground/30 italic" style={{ fontFamily: 'var(--font-body)' }}>No members assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {members.slice(0, 8).map((m) => (
                      <div key={m.id} className="group relative">
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt={m.full_name || ''}
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[11px] font-bold"
                            style={{ backgroundColor: d.color || '#a0522d', color: 'white' }}
                          >
                            {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-foreground text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {m.full_name || m.email}
                          {m.job_title && <span className="text-white/60"> — {m.job_title}</span>}
                        </div>
                      </div>
                    ))}
                    {members.length > 8 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-foreground/50">
                        +{members.length - 8}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="border-t-2 border-gray-200 bg-warm-bg/30 px-6 py-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
          Total — {departments.length} departments
        </span>
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(totalMonthly)}/mo</span>
          <span className="text-sm font-semibold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>{fmtMoney(totalMonthly * 12)}/yr</span>
        </div>
      </div>
    </div>
  );
}
