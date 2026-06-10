import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { withCronLogging } from '@/lib/cron-observability';

// GET /api/cron/anthropic/model-check
//
// Daily cron (vercel.json: "0 13 * * *" — same 6 AM Phoenix slot as
// the next.config.mjs snapshot, easier to mentally co-locate as
// "infra checks fire at 6 AM"). Calls Anthropic's /v1/models, picks
// the latest opus/sonnet/haiku ID off the response, and compares to
// the IDs the codebase is wired to. Writes a snapshot row to
// public.anthropic_model_checks; the live probe in /api/integrations
// reads the latest row to surface drift on /feather/admin/apis.
//
// Anthropic's /v1/models is a free GET — no token cost — so running
// this daily is cheap. It also serves as a low-cost "is the key
// still valid" liveness check for ANTHROPIC_API_KEY.
//
// Auth: Vercel cron's x-vercel-cron header, or Authorization Bearer
// matching CRON_SECRET for manual "run now" triggers.

export const dynamic = 'force-dynamic';

// What the codebase is configured to use today. This duplicates the
// DEFAULT_MODEL constants scattered across src/ — the user explicitly
// asked us NOT to create lib/anthropic-models.ts yet, so the source
// of truth temporarily lives here. When that central module ships,
// import these from there and delete the inline copy.
const CURRENT_MODELS = {
  opus: 'claude-opus-4-8',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
} as const;

interface AnthropicModel {
  id: string;
  display_name?: string;
  created_at?: string;
}

// Compare two same-tier model IDs and return the newer one. Anthropic
// IDs follow `claude-<tier>-<major>-<minor>[-YYYYMMDD]`; pick the
// highest (major, minor, date) tuple. Falls back to string compare
// when the shape doesn't parse — safer than guessing wrong on a new
// naming scheme.
function parseVersion(id: string): [number, number, number] | null {
  const m = id.match(/^claude-(?:opus|sonnet|haiku)-(\d+)-(\d+)(?:-(\d{8}))?$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 0];
}

function isNewer(candidate: string, baseline: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(baseline);
  if (!a || !b) return candidate > baseline;
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] > b[1];
  return a[2] > b[2];
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (req.headers.get('x-vercel-cron')) return true;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  return withCronLogging('/api/cron/anthropic/model-check', async () => {
    if (!authorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 412 });
    }

    let models: AnthropicModel[] = [];
    let httpStatus = 0;
    let errorMsg: string | null = null;
    try {
      const res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        cache: 'no-store',
      });
      httpStatus = res.status;
      if (res.ok) {
        const body = (await res.json()) as { data?: AnthropicModel[] };
        models = Array.isArray(body.data) ? body.data : [];
      } else {
        errorMsg = `HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`;
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    // For each tier, find the highest-versioned ID in the response.
    // Excludes dated suffixes from the latest pick when an unsuffixed
    // alias exists for the same major.minor (the alias is the
    // canonical "use this" ID; Models page lists both).
    const pickLatest = (tier: 'opus' | 'sonnet' | 'haiku'): string | null => {
      const prefix = `claude-${tier}-`;
      const tierIds = models.map((m) => m.id).filter((id) => id.startsWith(prefix));
      if (tierIds.length === 0) return null;
      let latest = tierIds[0];
      for (const id of tierIds.slice(1)) if (isNewer(id, latest)) latest = id;
      // Prefer the unsuffixed alias when both exist for the same (major, minor).
      const v = parseVersion(latest);
      if (v) {
        const alias = `claude-${tier}-${v[0]}-${v[1]}`;
        if (tierIds.includes(alias) && alias !== latest) latest = alias;
      }
      return latest;
    };

    const driftSummary: Record<string, { current: string; latest: string | null; drift: boolean }> = {};
    let anyDrift = false;
    for (const tier of ['opus', 'sonnet', 'haiku'] as const) {
      const latest = pickLatest(tier);
      const current = CURRENT_MODELS[tier];
      // "Drift" only when /v1/models returned data AND the latest is
      // strictly newer than what's in code. An API failure (latest=null)
      // is reported as http_status / error, not as drift.
      const drift = latest !== null && latest !== current && isNewer(latest, current);
      driftSummary[tier] = { current, latest, drift };
      if (drift) anyDrift = true;
    }

    const admin = getAdminSupabase();
    const { error: insertErr } = await admin.from('anthropic_model_checks').insert({
      available_models: models,
      current_models: CURRENT_MODELS,
      drift_detected: anyDrift,
      drift_summary: driftSummary,
      http_status: httpStatus,
      error: errorMsg,
    });
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      drift_detected: anyDrift,
      drift_summary: driftSummary,
      checked_models: models.length,
      http_status: httpStatus,
      error: errorMsg,
    });
  });
}
