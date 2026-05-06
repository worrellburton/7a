'use client';

// Admin → Levers. Master toggles for platform-wide behaviour.
// Each lever maps to a column on public.app_settings (singleton row),
// flipped via /api/admin/settings/<lever>. Pulling a lever takes
// effect within ~5 seconds of the next request — the in-memory
// settings cache TTL.

import { useAuth } from '@/lib/AuthProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AiCallScoringSettings {
  ai_call_scoring_enabled: boolean;
  ai_call_scoring_updated_at: string | null;
  ai_call_scoring_updated_by: string | null;
}

export default function LeversContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();

  const [aiCalls, setAiCalls] = useState<AiCallScoringSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) { router.replace('/app'); return; }

    (async () => {
      try {
        const res = await fetch('/api/admin/settings/ai-call-scoring', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as AiCallScoringSettings;
        setAiCalls(body);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [session, isAdmin, router]);

  async function flipAiCalls(next: boolean) {
    if (!session?.access_token) return;
    const prev = aiCalls;
    setAiCalls((s) => (s ? { ...s, ai_call_scoring_enabled: next } : s));
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings/ai-call-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as AiCallScoringSettings;
      setAiCalls(body);
    } catch (err) {
      setAiCalls(prev);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[900px] mx-auto pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 sm:mb-8">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Levers</h1>
        <p className="text-sm text-foreground/55 mt-0.5">
          Platform-wide toggles. Pulling a lever takes effect within seconds.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-5 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">AI Call Scoring</p>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    aiCalls?.ai_call_scoring_enabled
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {aiCalls?.ai_call_scoring_enabled ? 'On' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-foreground/55 mt-1 leading-relaxed">
                When on, every CTM call is queued for AI analysis (Gemini audio + Claude metadata fallback)
                and lands with a score, summary, sentiment, and operator strengths/weaknesses.
                When paused, CTM calls still flow into the database normally — just no AI processing
                runs and no AI tokens are spent. Flip back on whenever you want and new calls resume scoring.
              </p>
              {aiCalls?.ai_call_scoring_updated_at && (
                <p className="text-[11px] text-foreground/35 mt-2">
                  Last changed {new Date(aiCalls.ai_call_scoring_updated_at).toLocaleString()}
                </p>
              )}
              {error && (
                <p className="text-[11px] text-red-500/80 mt-2">{error}</p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!aiCalls?.ai_call_scoring_enabled}
              disabled={saving}
              onClick={() => flipAiCalls(!aiCalls?.ai_call_scoring_enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                aiCalls?.ai_call_scoring_enabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  aiCalls?.ai_call_scoring_enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
