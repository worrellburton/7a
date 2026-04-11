'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BudgetsPanel from './BudgetsPanel';
import {
  useQuickBooksConnection,
  QuickBooksHeader,
  QuickBooksRealmPicker,
  QuickBooksGettingStarted,
  QuickBooksToast,
} from '@/lib/QuickBooksConnection';

// ------------------------------------------------------------
// Finance — per-department budgets keyed to a QuickBooks company.
//
// The read-only QBO reports (Company, Accounts, P&L, Balance Sheet,
// etc.) moved to /app/reports. This page is now focused on planning:
// pick a connected company, set a monthly budget for each department,
// and match the department to a P&L expense account so we can show
// live actuals next to the plan.
// ------------------------------------------------------------

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
    toast,
    handleConnect,
    handleDisconnect,
  } = useQuickBooksConnection();

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
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

  if (!user || !isAdmin) return null;

  return (
    <div className="p-6 lg:p-10">
      <QuickBooksHeader
        title="Finance"
        subtitle="Set a monthly budget for each department and match it to a QuickBooks P&L account for live actuals."
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
        </div>
      )}

      <QuickBooksToast toast={toast} />
    </div>
  );
}
