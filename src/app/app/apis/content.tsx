'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Integration {
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'coming-soon';
  details?: string;
  manageUrl?: string;
  /** When set, the "Connect" button becomes a "Reconnect" link to this URL instead of calling router.push. */
  reconnectUrl?: string;
  /** Short hint shown in red under the row when status is disconnected (e.g. the upstream probe error). */
  errorHint?: string;
}

interface ProbedIntegration {
  id: string;
  connected: boolean;
  configured: boolean;
  detail?: string;
  error?: string | null;
}

export default function APIsContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const [qbCompanies, setQbCompanies] = useState<number>(0);
  const [ctmOk, setCtmOk] = useState(false);
  const [stediOk, setStediOk] = useState(false);
  const [ga4, setGa4] = useState<ProbedIntegration | null>(null);
  const [gsc, setGsc] = useState<ProbedIntegration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) { router.replace('/app'); return; }

    (async () => {
      try {
        const res = await fetch('/api/integrations', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const body = await res.json();
          const list: ProbedIntegration[] = body.integrations || [];
          const qb = list.find(i => i.id === 'quickbooks');
          const ctm = list.find(i => i.id === 'ctm');
          const stedi = list.find(i => i.id === 'stedi');
          const ga4Row = list.find(i => i.id === 'ga4');
          const gscRow = list.find(i => i.id === 'gsc');
          if (qb?.connected) {
            const match = (qb.detail || '').match(/(\d+)/);
            setQbCompanies(match ? parseInt(match[1], 10) : 1);
          }
          if (ctm?.connected) setCtmOk(true);
          if (stedi?.connected) setStediOk(true);
          if (ga4Row) setGa4(ga4Row);
          if (gscRow) setGsc(gscRow);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [session, isAdmin, router]);

  if (!user || !isAdmin) return null;

  const googleApiRow = (row: ProbedIntegration | null, name: string, description: string, manageUrl: string): Integration => {
    const connected = !!row?.connected;
    const error = row?.error ?? null;
    return {
      name,
      description,
      status: connected ? 'connected' : 'disconnected',
      details: connected ? row?.detail ?? undefined : undefined,
      manageUrl,
      reconnectUrl: connected ? undefined : '/app/google-reconnect',
      errorHint: connected ? undefined : error ?? undefined,
    };
  };

  const integrations: Integration[] = [
    {
      name: 'Supabase',
      description: 'Database, authentication, and file storage',
      status: 'connected',
      details: 'PostgreSQL + Auth + Storage',
    },
    {
      name: 'Google OAuth',
      description: 'Single sign-on for all users',
      status: 'connected',
      details: 'Via Supabase Auth',
    },
    googleApiRow(
      ga4,
      'Google Analytics 4',
      'Site traffic, sessions, landing pages (powers /app/analytics)',
      '/app/analytics'
    ),
    googleApiRow(
      gsc,
      'Google Search Console',
      'Organic impressions, clicks, and query rankings (powers /app/seo)',
      '/app/seo'
    ),
    {
      name: 'QuickBooks Online',
      description: 'Financial reporting, P&L, balance sheet, budgets',
      status: qbCompanies > 0 ? 'connected' : 'disconnected',
      details: qbCompanies > 0 ? `${qbCompanies} ${qbCompanies === 1 ? 'company' : 'companies'} connected` : undefined,
      manageUrl: '/app/finance',
    },
    {
      name: 'CallTrackingMetrics',
      description: 'Call tracking, source attribution, and analytics',
      status: ctmOk ? 'connected' : 'disconnected',
      manageUrl: '/app/calls',
    },
    {
      name: 'Stedi',
      description: 'X12 EDI professional claims submission',
      status: stediOk ? 'connected' : 'disconnected',
      manageUrl: '/app/billing',
    },
    {
      name: 'Gusto',
      description: 'Payroll, benefits, HR, and team management',
      status: 'coming-soon',
    },
    {
      name: 'Kipu',
      description: 'Electronic health records and clinical documentation',
      status: 'coming-soon',
    },
  ];

  const connected = integrations.filter(i => i.status === 'connected').length;
  const total = integrations.filter(i => i.status !== 'coming-soon').length;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">APIs</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          {connected}/{total} services connected
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl">
          {integrations.map((api, idx) => (
            <div
              key={api.name}
              className={`flex items-center gap-4 px-5 py-4 ${idx < integrations.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-warm-bg/20 transition-colors`}
            >
              {/* Status indicator */}
              <div className="shrink-0">
                {api.status === 'connected' ? (
                  <span className="block w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" title="Connected" />
                ) : api.status === 'disconnected' ? (
                  <span className="block w-3 h-3 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.3)]" title="Disconnected" />
                ) : (
                  <span className="block w-3 h-3 rounded-full bg-gray-300" title="Coming soon" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{api.name}</p>
                  {api.status === 'coming-soon' && (
                    <span className="text-[10px] font-medium text-foreground/30 uppercase tracking-wider">Soon</span>
                  )}
                </div>
                <p className="text-xs text-foreground/45 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {api.description}
                </p>
                {api.details && (
                  <p className="text-[11px] text-foreground/30 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    {api.details}
                  </p>
                )}
                {api.errorHint && (
                  <p
                    className="text-[11px] text-red-600/80 mt-0.5 truncate max-w-[380px]"
                    title={api.errorHint}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {api.errorHint}
                  </p>
                )}
              </div>

              {/* Action */}
              {api.status === 'connected' && api.manageUrl && (
                <button
                  onClick={() => router.push(api.manageUrl!)}
                  className="shrink-0 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Manage
                </button>
              )}
              {api.status === 'disconnected' && api.reconnectUrl && (
                <button
                  onClick={() => router.push(api.reconnectUrl!)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Reconnect
                </button>
              )}
              {api.status === 'disconnected' && !api.reconnectUrl && api.manageUrl && (
                <button
                  onClick={() => router.push(api.manageUrl!)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
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
