'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import type { PsiSnapshot } from '@/lib/seo/psi';

// Snapshot row shape returned by /api/seo/speed/latest. Mirrors the
// public.seo_speed_runs columns with `opportunities` already parsed
// from jsonb.
export interface SpeedSnapshotRow {
  id: string;
  ran_at: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  performance: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  si: number | null;
  opportunities: Array<{ id: string; title: string; savingsMs: number }>;
  fetch_ms: number | null;
  ok: boolean;
  error: string | null;
}

export default function SpeedContent() {
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Phase 10 only sets up the state slots. Wiring lands in 11-20.
  const [snapshots, setSnapshots] = useState<SpeedSnapshotRow[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Suppress "unused" noise until later phases consume these. Keeping
  // them in this commit so the diff for phases 11-20 stays small and
  // focused on UI / behavior.
  useEffect(() => {
    void snapshots;
    void running;
    void error;
    void hydrated;
    void setSnapshots;
    void setRunning;
    void setError;
    void setHydrated;
  }, [snapshots, running, error, hydrated]);

  if (authLoading) return null;
  if (!user || !isAdmin) {
    return (
      <div className="px-6 py-10 text-sm text-neutral-400">
        Speed is admin-only.
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-50">Speed</h1>
        <p className="text-sm text-neutral-400">
          Core Web Vitals via PageSpeed Insights. Run All scores every URL on
          mobile and desktop, then keeps the timeline.
        </p>
      </header>
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-500">
        Scaffold ready. URL list, run button, and result cards arrive in the
        next phases.
      </div>
    </div>
  );
}

// Re-export PsiSnapshot so future phases can import the API response
// shape from this module without re-touching the lib path.
export type { PsiSnapshot };
