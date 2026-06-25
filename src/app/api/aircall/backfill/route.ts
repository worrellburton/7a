import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireStaff } from '@/lib/api-gates';
import { withCronLogging } from '@/lib/cron-observability';
import { aircallFetch, mapAircallCall, type AircallCall } from '@/lib/aircall';

// POST|GET /api/aircall/backfill — pull calls from Aircall into the
// public.aircall_calls mirror. Idempotent: every call is upserted on
// aircall_id. The webhook keeps the table live; this fills gaps and
// performs the initial historical import.
//
// Auth:
//   - `Authorization: Bearer <CRON_SECRET>` (Vercel Cron), or
//   - a signed-in Supabase Bearer token (manual run).
//
// Query / body:
//   full=1   → ignore the watermark and walk from the beginning
//   pages=<n> → stop after n pages (safety; default 40 pages × 50 = 2k)

const PER_PAGE = 50; // Aircall hard max
const DEFAULT_PAGE_CAP = 40;

interface AircallCallsResponse {
  meta?: { next_page_link?: string | null; current_page?: number; total?: number };
  calls?: AircallCall[];
}

async function handleBackfill(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET;
  const viaCron = !!(expectedSecret && authHeader === `Bearer ${expectedSecret}`);
  if (!viaCron) {
    // Manual runs are staff-only — alumni / guests must not be able to
    // trigger an Aircall import (or probe config) by hitting this route.
    const gate = await requireStaff(req);
    if (gate instanceof NextResponse) return gate;
  }

  if (!process.env.AIRCALL_API_ID || !process.env.AIRCALL_API_TOKEN) {
    return NextResponse.json(
      { error: 'Aircall is not configured — set AIRCALL_API_ID and AIRCALL_API_TOKEN.' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const full = body?.full === true || url.searchParams.get('full') === '1';
  const pageCap = Math.max(
    1,
    Math.min(200, Number(body?.pages) || Number(url.searchParams.get('pages')) || DEFAULT_PAGE_CAP),
  );

  const supabase = getAdminSupabase();

  // Incremental watermark — ask Aircall for calls started after the most
  // recent one we have. `from` is a UNIX timestamp (seconds).
  let fromUnix: number | undefined;
  if (!full) {
    const { data } = await supabase
      .from('aircall_sync_state')
      .select('last_synced_at')
      .eq('id', 'singleton')
      .maybeSingle();
    const last = data?.last_synced_at as string | undefined;
    if (last) {
      const ms = new Date(last).getTime();
      if (Number.isFinite(ms)) fromUnix = Math.floor(ms / 1000) - 60; // 60s overlap for safety
    }
  }

  let page = 1;
  let processed = 0;
  let maxStartedAt: string | null = null;
  let maxCallId: number | null = null;

  try {
    while (page <= pageCap) {
      const resp = await aircallFetch<AircallCallsResponse>('/calls', {
        params: { page, per_page: PER_PAGE, order: 'desc', from: fromUnix },
      });
      const calls = resp.calls ?? [];
      if (calls.length === 0) break;

      const rows = calls.map(mapAircallCall);
      for (const r of rows) {
        const startedAt = r.started_at as string | null;
        const id = r.aircall_id as number;
        if (startedAt && (!maxStartedAt || startedAt > maxStartedAt)) maxStartedAt = startedAt;
        if (id && (!maxCallId || id > maxCallId)) maxCallId = id;
      }

      const { error } = await supabase.from('aircall_calls').upsert(rows, { onConflict: 'aircall_id' });
      if (error) throw new Error(`upsert failed: ${error.message}`);
      processed += rows.length;

      if (!resp.meta?.next_page_link) break;
      page++;
    }

    // Reconcile stuck "open" calls. A missed call.hangup webhook can leave a
    // call with ended_at = null forever, and the forward-only walk above
    // (watermarked on started_at) never revisits it — so it would show as a
    // runaway "live" call. Re-fetch each still-open call older than an hour
    // straight from Aircall and upsert the authoritative record so it
    // self-heals; a call Aircall no longer knows about (404) is closed
    // locally. Best-effort + bounded so a 5-minute cron never stalls.
    let reconciled = 0;
    try {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: openRows } = await supabase
        .from('aircall_calls')
        .select('aircall_id')
        .is('ended_at', null)
        .lt('started_at', cutoff)
        .order('started_at', { ascending: true })
        .limit(25);
      for (const { aircall_id } of (openRows ?? []) as Array<{ aircall_id: number }>) {
        try {
          const resp = await aircallFetch<{ call?: AircallCall }>(`/calls/${aircall_id}`);
          if (resp?.call) {
            await supabase.from('aircall_calls').upsert(mapAircallCall(resp.call), { onConflict: 'aircall_id' });
            reconciled++;
          }
        } catch (e) {
          // 404 → Aircall no longer has this call; close it locally so it
          // stops reading as open. Other errors: leave it for the next run.
          if (e instanceof Error && e.message.includes('Aircall 404')) {
            await supabase.from('aircall_calls')
              .update({ ended_at: new Date().toISOString() })
              .eq('aircall_id', aircall_id)
              .is('ended_at', null);
            reconciled++;
          }
        }
      }
    } catch {
      /* reconciliation is best-effort — never fail the sync over it */
    }

    await supabase.from('aircall_sync_state').upsert(
      {
        id: 'singleton',
        last_synced_at: maxStartedAt ?? new Date().toISOString(),
        last_call_id: maxCallId,
        full_backfill_done: full ? true : undefined,
        note: `processed ${processed} over ${page} page(s), reconciled ${reconciled}`,
      },
      { onConflict: 'id' },
    );

    return NextResponse.json({ ok: true, processed, pagesFetched: page, reconciled, full, fromUnix: fromUnix ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), pagesFetched: page },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return withCronLogging('/api/aircall/backfill', () => handleBackfill(req));
}

export async function GET(req: NextRequest) {
  return withCronLogging('/api/aircall/backfill', () => handleBackfill(req));
}
