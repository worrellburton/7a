import { getAdminSupabase } from './supabase-server';

// Master lever for the AI side of calls. When false, CTM data still
// flows into public.calls but no AI scoring happens — needs_score is
// not set, /api/calls/auto-score is a no-op, and /api/claude/calls/score
// refuses to run.
//
// Backed by public.app_settings (singleton row, id=true). Reads degrade
// gracefully: if the table is missing or the query fails, we default to
// ENABLED — the safe default is "AI on" so a broken settings read can't
// silently disable production scoring without an explicit lever pull.
//
// In-memory cache with a short TTL keeps the per-request cost low while
// still letting an admin toggle propagate within seconds.

type Cached = { value: boolean; expiresAt: number };
let cached: Cached | null = null;
const TTL_MS = 5_000;

export async function isAiCallScoringEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('app_settings')
    .select('ai_call_scoring_enabled')
    .eq('id', true)
    .maybeSingle();

  if (error) {
    console.warn('[app-settings] degraded read, defaulting AI scoring to ENABLED', error.message);
    cached = { value: true, expiresAt: now + TTL_MS };
    return true;
  }

  const value = data?.ai_call_scoring_enabled ?? true;
  cached = { value, expiresAt: now + TTL_MS };
  return value;
}

export function invalidateAppSettingsCache(): void {
  cached = null;
}
