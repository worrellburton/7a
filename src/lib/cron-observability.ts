import { getAdminSupabase } from '@/lib/supabase-server';

// One-stop wrapper for cron route handlers. Records start time,
// catches uncaught exceptions, logs an audit row to public.cron_runs,
// and propagates the underlying response back to Vercel's cron
// machinery so its dashboard still reflects the real status code.
//
// Usage at the top of a cron route:
//
//   export async function GET(req: NextRequest) {
//     return withCronLogging('/api/cron/foo/bar', async () => {
//       // ...existing handler body
//       return NextResponse.json({ ok: true, fired: 4 });
//     });
//   }
//
// The wrapper also accepts a `summary` callback so the route can
// hand back a structured payload (e.g. { fired, skipped }) that
// gets persisted on the audit row even when the route returns the
// raw NextResponse. The payload is optional — when the route just
// returns its NextResponse and nothing else, we serialise the JSON
// body if it parses cleanly.

import type { NextResponse } from 'next/server';

interface CronResult {
  response: NextResponse;
  payload?: Record<string, unknown> | null;
  /** Mark the run as 'failed' even if no exception was thrown (e.g.
   *  the route detected partial failure and wants to surface it). */
  failed?: boolean;
  /** Human-readable summary surfaced on the audit row. */
  message?: string;
}

export async function withCronLogging(
  path: string,
  handler: () => Promise<CronResult | NextResponse>,
): Promise<NextResponse> {
  const startedAt = new Date();
  let status: 'ok' | 'failed' | 'error' = 'ok';
  let message: string | null = null;
  let payload: Record<string, unknown> | null = null;
  let response: NextResponse;

  try {
    const out = await handler();
    if (out && 'response' in out) {
      response = out.response;
      payload = out.payload ?? null;
      message = out.message ?? null;
      if (out.failed) status = 'failed';
    } else {
      response = out;
      // Best-effort parse so a route that returns NextResponse.json({...})
      // still gets its summary captured.
      try {
        const cloned = response.clone();
        const body = (await cloned.json()) as Record<string, unknown>;
        payload = body;
        if (body && body.ok === false) status = 'failed';
        if (typeof body.error === 'string') message = body.error;
      } catch {
        /* non-JSON body — fine, just don't capture a payload */
      }
    }
  } catch (err) {
    status = 'error';
    message = err instanceof Error ? err.message : String(err);
    response = new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    }) as unknown as NextResponse;
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();

  // Audit insert is fire-and-forget — we never want telemetry to
  // delay the cron's response. Failures here are logged but don't
  // change the outcome.
  try {
    const admin = getAdminSupabase();
    await admin.from('cron_runs').insert({
      path,
      status,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      message,
      payload,
    });
  } catch (logErr) {
    console.warn(`[cron-observability] could not record run for ${path}:`, logErr);
  }

  return response;
}
