'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConnectedAPI {
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'coming-soon';
  details?: string;
  icon: React.ReactNode;
}

export default function APIsContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const [qbCompanies, setQbCompanies] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) { router.replace('/app'); return; }

    (async () => {
      try {
        const res = await fetch('/api/quickbooks/data?report=list', { credentials: 'include' });
        if (res.ok) {
          const body = await res.json();
          setQbCompanies((body.companies || []).length);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [session, isAdmin, router]);

  if (!user || !isAdmin) return null;

  const apis: ConnectedAPI[] = [
    {
      name: 'QuickBooks',
      description: 'Financial reporting, P&L, balance sheet, and department budget tracking.',
      status: qbCompanies > 0 ? 'connected' : 'disconnected',
      details: qbCompanies > 0 ? `${qbCompanies} ${qbCompanies === 1 ? 'company' : 'companies'} connected` : undefined,
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#2CA01C" />
          <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-1.5 11.5V14H9a2 2 0 0 1 0-4h1.5V8.5a.5.5 0 0 1 1 0V10H13a2 2 0 0 1 0 4h-1.5v1.5a.5.5 0 0 1-1 0ZM9 11a1 1 0 0 0 0 2h1.5v-2H9Zm4 2a1 1 0 0 0 0-2h-1.5v2H13Z" fill="white" />
        </svg>
      ),
    },
    {
      name: 'Gusto',
      description: 'Payroll, benefits, HR, and team management.',
      status: 'coming-soon',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#F45D48" />
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">G</text>
        </svg>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-2">APIs</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Connected third-party services and integrations.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 max-w-2xl">
          {apis.map((api) => (
            <div
              key={api.name}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4"
            >
              <div className="shrink-0">{api.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-foreground">{api.name}</h3>
                  {api.status === 'connected' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                  )}
                  {api.status === 'disconnected' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-foreground/40 border border-gray-200">
                      Not connected
                    </span>
                  )}
                  {api.status === 'coming-soon' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                  {api.description}
                </p>
                {api.details && (
                  <p className="text-xs text-foreground/40 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                    {api.details}
                  </p>
                )}
              </div>
              {api.status === 'connected' && (
                <button
                  onClick={() => router.push('/app/finance')}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  Manage
                </button>
              )}
              {api.status === 'disconnected' && (
                <button
                  onClick={() => router.push('/app/finance')}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
