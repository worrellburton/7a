'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Live-probe payload as returned by /api/integrations. The shape
// mirrors the IntegrationStatus interface in that route handler;
// keeping them in sync is the contract.
interface ProbedIntegration {
  id: string;
  name: string;
  description: string;
  category: string;
  configured: boolean;
  connected: boolean;
  detail: string | null;
  error: string | null;
  docsUrl?: string;
  manageUrl?: string;
}

interface DisplayRow {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'coming-soon';
  details?: string;
  manageUrl?: string;
  docsUrl?: string;
  error?: string | null;
  category?: string;
}

// Kept as a minimal hardcoded list — only services that don't have a
// real env / probe yet. Anything we actually integrate with should
// land in /api/integrations as a probe and be rendered automatically.
const COMING_SOON: DisplayRow[] = [
  {
    id: 'gusto',
    name: 'Gusto',
    description: 'Payroll, benefits, HR, and team management',
    status: 'coming-soon',
  },
];

export default function APIsContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<DisplayRow[]>([]);
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
          const body = (await res.json()) as { integrations?: ProbedIntegration[] };
          const live = (body.integrations ?? []).map<DisplayRow>((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            status: i.connected ? 'connected' : 'disconnected',
            details: i.detail ?? undefined,
            manageUrl: i.manageUrl,
            docsUrl: i.docsUrl,
            error: i.error,
            category: i.category,
          }));
          setRows([...live, ...COMING_SOON]);
        }
      } catch {
        // Network failure — render nothing rather than stale local
        // hardcoded entries. Page header still says "—/— services
        // connected" while the user retries.
      }
      setLoading(false);
    })();
  }, [session, isAdmin, router]);

  if (!user || !isAdmin) return null;

  const connected = rows.filter((i) => i.status === 'connected').length;
  const total = rows.filter((i) => i.status !== 'coming-soon').length;

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
          {rows.map((api, idx) => (
            <div
              key={api.id}
              className={`flex items-center gap-4 px-5 py-4 ${idx < rows.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-warm-bg/20 transition-colors`}
            >
              <div className="shrink-0">
                {api.status === 'connected' ? (
                  <span className="block w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" title="Connected" />
                ) : api.status === 'disconnected' ? (
                  <span className="block w-3 h-3 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.3)]" title="Disconnected" />
                ) : (
                  <span className="block w-3 h-3 rounded-full bg-gray-300" title="Coming soon" />
                )}
              </div>

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
                {api.status === 'disconnected' && api.error && (
                  <p className="text-[11px] text-red-500/80 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    {api.error}
                  </p>
                )}
              </div>

              {api.status === 'connected' && api.manageUrl && (
                <button
                  onClick={() => router.push(api.manageUrl!)}
                  className="shrink-0 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Manage
                </button>
              )}
              {api.status === 'disconnected' && api.manageUrl && (
                <button
                  onClick={() => router.push(api.manageUrl!)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Connect
                </button>
              )}
              {api.status === 'disconnected' && !api.manageUrl && api.docsUrl && (
                <a
                  href={api.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-medium text-foreground/55 hover:text-foreground transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Console ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
