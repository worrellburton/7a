'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';
import { MARKETING_ADMISSIONS_DEPT_ID } from '@/lib/website-requests-auth';

// Home row: count of website-request submissions awaiting a response
// (responded_at is null). Shown only to admins and Marketing &
// Admissions members — the same gate the page itself uses.

interface UnreadResponse {
  unresponded?: {
    total: number;
    vobs: number;
    forms: number;
    careers: number;
  };
}

export default function HomeWebsiteRequestsRow() {
  const { isAdmin, departmentId } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState<UnreadResponse['unresponded'] | null>(null);

  const canSee = isAdmin || departmentId === MARKETING_ADMISSIONS_DEPT_ID;

  useEffect(() => {
    if (!canSee) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/website-requests/unread-count', { credentials: 'include', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: UnreadResponse | null) => {
          if (cancelled || !json?.unresponded) return;
          setCounts(json.unresponded);
        })
        .catch(() => { /* non-fatal */ });
    };
    load();
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    const iv = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(iv);
    };
  }, [canSee]);

  if (!canSee) return null;

  const loading = counts === null;
  const total = counts?.total ?? 0;
  // Don't take up space when there is genuinely nothing to do.
  if (!loading && total === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex items-baseline justify-between mb-2">
        <p
          className="text-xs font-semibold text-foreground/40 uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Awaiting response
        </p>
        <button
          type="button"
          onClick={() => router.push('/app/website-requests')}
          className="text-[11px] font-semibold text-primary hover:underline"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Open inbox →
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <UnrespondedCard
          label="VOBs"
          value={counts?.vobs ?? null}
          tabKey="vobs"
          tone="amber"
          onClick={() => router.push('/app/website-requests?tab=vobs')}
        />
        <UnrespondedCard
          label="Forms"
          value={counts?.forms ?? null}
          tabKey="forms"
          tone="blue"
          onClick={() => router.push('/app/website-requests?tab=forms')}
        />
        <UnrespondedCard
          label="Careers"
          value={counts?.careers ?? null}
          tabKey="careers"
          tone="slate"
          onClick={() => router.push('/app/website-requests?tab=careers')}
        />
      </div>
    </div>
  );
}

function UnrespondedCard({
  label,
  value,
  onClick,
  tone,
}: {
  label: string;
  value: number | null;
  tabKey: 'vobs' | 'forms' | 'careers';
  onClick: () => void;
  tone: 'amber' | 'blue' | 'slate';
}) {
  const loading = value === null;
  const empty = !loading && value === 0;
  const numColor =
    tone === 'amber' ? 'text-amber-700'
    : tone === 'blue' ? 'text-blue-600'
    : 'text-foreground/70';
  const animated = useAnimatedNumber(loading ? null : (value as number));
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-center px-4 py-3 rounded-xl hover:bg-warm-bg/50 transition-colors"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        <span className={`text-3xl font-bold tabular-nums ${empty ? 'text-foreground/30' : numColor}`}>
          {loading ? '—' : (animated ?? 0).toLocaleString()}
        </span>
        {!loading && (
          <span className="text-[11px] font-medium text-foreground/40">
            awaiting response
          </span>
        )}
      </div>
    </button>
  );
}
