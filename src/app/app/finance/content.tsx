'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface QBStatus {
  configured: boolean;
  connected: boolean;
  realmId: string | null;
  connectedAt: string | null;
  expiresAt: string | null;
}

interface QBAccount {
  Id: string;
  Name: string;
  AccountType: string;
  CurrentBalance?: number;
}

interface QBCompany {
  CompanyName: string;
  LegalName?: string;
  CompanyAddr?: { Line1?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  Email?: { Address?: string };
  Country?: string;
}

function fmtMoney(n: number | undefined) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export default function FinanceContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<QBStatus | null>(null);
  const [company, setCompany] = useState<QBCompany | null>(null);
  const [accounts, setAccounts] = useState<QBAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Surface query-string feedback from the OAuth callback
  useEffect(() => {
    const err = searchParams.get('error');
    const connected = searchParams.get('connected');
    if (err) {
      setError(decodeURIComponent(err));
    } else if (connected) {
      showToast('QuickBooks connected successfully');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) {
      router.replace('/app');
      return;
    }

    async function loadStatus() {
      try {
        const res = await fetch('/api/quickbooks/status', { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 403) setError('Admin access required');
          return;
        }
        const data = (await res.json()) as QBStatus;
        setStatus(data);
        if (data.connected) {
          loadCompany();
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }

    async function loadCompany() {
      setFetchingData(true);
      try {
        const res = await fetch('/api/quickbooks/company', { credentials: 'include' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }));
          setError(body.error || 'Failed to load company');
          return;
        }
        const data = await res.json();
        setCompany(data.company);
        setAccounts(data.accounts || []);
      } catch (e) {
        setError(String(e));
      } finally {
        setFetchingData(false);
      }
    }

    loadStatus();
  }, [session, isAdmin, router]);

  async function handleConnect() {
    window.location.href = '/api/quickbooks/auth';
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect QuickBooks? You will need to re-authorize the app to reconnect.')) return;
    const res = await fetch('/api/quickbooks/disconnect', { method: 'POST', credentials: 'include' });
    if (res.ok) {
      setStatus((s) => (s ? { ...s, connected: false, realmId: null, connectedAt: null, expiresAt: null } : null));
      setCompany(null);
      setAccounts([]);
      showToast('QuickBooks disconnected');
    } else {
      showToast('Failed to disconnect');
    }
  }

  async function handleRefresh() {
    setFetchingData(true);
    setError(null);
    try {
      const res = await fetch('/api/quickbooks/company', { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        setError(body.error || 'Failed to refresh');
        return;
      }
      const data = await res.json();
      setCompany(data.company);
      setAccounts(data.accounts || []);
      showToast('Refreshed');
    } catch (e) {
      setError(String(e));
    } finally {
      setFetchingData(false);
    }
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Finance</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Connect QuickBooks Online to pull company information, account balances, and transactions.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Connection card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2ca01c]/10 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-[#2ca01c]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5h-2V10H7L12 5l5 5h-2v6.5h-2v-4h-2v4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">QuickBooks Online</h2>
                  <p className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    {status?.connected
                      ? `Connected • Realm ${status.realmId}`
                      : status?.configured
                      ? 'Not connected yet'
                      : 'Server credentials missing'}
                  </p>
                  {status?.connectedAt && (
                    <p className="text-[11px] text-foreground/40 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                      Connected {new Date(status.connectedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status?.connected ? (
                  <>
                    <button
                      onClick={handleRefresh}
                      disabled={fetchingData}
                      className="px-4 py-2 bg-warm-bg text-foreground rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-warm-card transition-colors disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {fetchingData ? 'Refreshing…' : 'Refresh'}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="px-4 py-2 text-red-600 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-red-50 transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={!status?.configured}
                    className="px-5 py-2.5 bg-[#2ca01c] text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#248a17] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Connect to QuickBooks
                  </button>
                )}
              </div>
            </div>

            {!status?.configured && (
              <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold text-amber-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                  Server credentials missing
                </p>
                <p className="text-xs text-amber-800" style={{ fontFamily: 'var(--font-body)' }}>
                  Set <code className="bg-amber-100 px-1 py-0.5 rounded">QUICKBOOKS_CLIENT_ID</code>,{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded">QUICKBOOKS_CLIENT_SECRET</code>, and optionally{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded">QUICKBOOKS_REDIRECT_URI</code> and{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded">QUICKBOOKS_ENV</code> (<em>sandbox</em> or <em>production</em>) in your deployment env.
                  The redirect URI on Intuit's developer portal should be{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded">{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/quickbooks/callback`}</code>.
                </p>
              </div>
            )}

            {error && (
              <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-xs font-medium text-red-800" style={{ fontFamily: 'var(--font-body)' }}>
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Company info */}
          {status?.connected && company && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                Company
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name" value={company.CompanyName} />
                <Field label="Legal name" value={company.LegalName} />
                <Field
                  label="Address"
                  value={
                    company.CompanyAddr
                      ? [
                          company.CompanyAddr.Line1,
                          [company.CompanyAddr.City, company.CompanyAddr.CountrySubDivisionCode].filter(Boolean).join(', '),
                          company.CompanyAddr.PostalCode,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : undefined
                  }
                />
                <Field label="Phone" value={company.PrimaryPhone?.FreeFormNumber} />
                <Field label="Email" value={company.Email?.Address} />
                <Field label="Country" value={company.Country} />
              </div>
            </div>
          )}

          {/* Accounts */}
          {status?.connected && accounts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <h2 className="text-sm font-semibold text-foreground px-6 pt-6 pb-4 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                Account Balances
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-warm-bg/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Account</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.Id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{a.Name}</td>
                        <td className="px-6 py-4 text-xs text-foreground/60">{a.AccountType}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-foreground tabular-nums">{fmtMoney(a.CurrentBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
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
