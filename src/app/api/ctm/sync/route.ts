import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/ctm/sync — pull calls from CallTrackingMetrics into the
// public.calls mirror table. Idempotent: every call is upserted on ctm_id.
//
// Auth:
//   - Supabase Bearer token for a signed-in user, or
//   - `x-cron-secret: <CRON_SECRET>` header (for Vercel Cron).
//
// Body (optional):
//   { full?: boolean, since?: string, pages?: number }
//   - full=true         → ignore watermark, walk every page from oldest
//   - since=<ISO>       → use this watermark instead of the stored one
//   - pages=<n>         → stop after n pages (safety for long runs)

const CTM_BASE = 'https://api.calltrackingmetrics.com/api/v1';
const CALLS_PER_PAGE = 100;
const DEFAULT_PAGE_CAP = 100; // 10k calls per invocation, then retry later

interface CtmCall {
  id: number | string;
  called_at?: string;
  direction?: string;
  duration?: number;
  talk_time?: number;
  ring_time?: number;
  voicemail?: boolean;
  status?: string;
  first_call?: boolean;
  name?: string;
  caller_number?: string;
  caller_number_formatted?: string;
  receiving_number?: string;
  receiving_number_formatted?: string;
  tracking_number?: string;
  tracking_number_formatted?: string;
  source?: string;
  source_name?: string;
  tracking_label?: string;
  tag_list?: string[];
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  audio?: string;
  transcript_url?: string;
}

interface CtmResponse {
  calls?: CtmCall[];
  total_entries?: number;
  total_pages?: number;
  page?: number;
  per_page?: number;
  error?: string;
}

async function discoverAccountId(token: string): Promise<string> {
  const res = await fetch(`${CTM_BASE}/accounts.json`, {
    headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`CTM /accounts.json ${res.status}`);
  const data = await res.json();
  // Shape varies: single object, { accounts: [] }, or direct array.
  const acct = Array.isArray(data) ? data[0] : data?.accounts?.[0] ?? data?.account ?? data;
  const id = acct?.id ?? acct?.account_id;
  if (!id) throw new Error('Could not discover CTM account id');
  return String(id);
}

async function fetchCtmPage(token: string, accountId: string, page: number, since?: string): Promise<CtmResponse> {
  const url = new URL(`${CTM_BASE}/accounts/${accountId}/calls.json`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(CALLS_PER_PAGE));
  if (since) {
    // CTM supports start_date filter; format as YYYY-MM-DD HH:MM
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) {
      url.searchParams.set('start_date', d.toISOString());
    }
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CTM ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as CtmResponse;
}

function mapCall(c: CtmCall, accountId: string) {
  return {
    ctm_id: String(c.id),
    account_id: accountId,
    called_at: c.called_at ?? new Date(0).toISOString(),
    direction: c.direction ?? null,
    duration: c.duration ?? null,
    talk_time: c.talk_time ?? null,
    ring_time: c.ring_time ?? null,
    voicemail: c.voicemail ?? false,
    status: c.status ?? null,
    first_call: c.first_call ?? null,
    caller_name: c.name ?? null,
    caller_number: c.caller_number ?? null,
    caller_number_formatted: c.caller_number_formatted ?? null,
    receiving_number: c.receiving_number ?? null,
    receiving_number_formatted: c.receiving_number_formatted ?? null,
    tracking_number: c.tracking_number ?? null,
    tracking_number_formatted: c.tracking_number_formatted ?? null,
    source: c.source ?? null,
    source_name: c.source_name ?? null,
    tracking_label: c.tracking_label ?? null,
    tag_list: c.tag_list ?? null,
    city: c.city ?? null,
    state: c.state ?? null,
    country: c.country ?? null,
    zip: c.zip ?? null,
    audio_url: c.audio ?? null,
    transcript_url: c.transcript_url ?? null,
    raw: c as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };
}

async function handleSync(req: NextRequest) {
  // Vercel Cron sends "Authorization: Bearer $CRON_SECRET". Accept that,
  // or fall back to a signed-in Supabase Bearer token for manual runs.
  const authHeader = req.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET;
  const viaCron = !!(expectedSecret && authHeader === `Bearer ${expectedSecret}`);

  if (!viaCron) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ctmToken = process.env.CTM_API_TOKEN;
  if (!ctmToken) {
    return NextResponse.json({ error: 'CTM_API_TOKEN is not configured.' }, { status: 500 });
  }
  let ctmAccountId = process.env.CTM_ACCOUNT_ID;
  if (!ctmAccountId) {
    try {
      ctmAccountId = await discoverAccountId(ctmToken);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const url = new URL(req.url);
  const full = body?.full === true || url.searchParams.get('full') === '1';
  const pageCap = Math.max(
    1,
    Math.min(500, Number(body?.pages) || Number(url.searchParams.get('pages')) || DEFAULT_PAGE_CAP),
  );

  const supabase = getAdminSupabase();

  // Determine watermark. When syncing incrementally we ask CTM for calls
  // newer than `last_called_at`.
  let since: string | undefined;
  if (!full) {
    if (body?.since) {
      since = String(body.since);
    } else {
      const { data } = await supabase.from('ctm_sync_state').select('last_called_at').eq('id', 1).maybeSingle();
      if (data?.last_called_at) since = data.last_called_at as string;
    }
  }

  let page = 1;
  let inserted = 0;
  let updated = 0;
  let totalPages = 0;
  let maxCalledAt: string | null = null;

  try {
    while (page <= pageCap) {
      const resp = await fetchCtmPage(ctmToken, ctmAccountId, page, since);
      totalPages = resp.total_pages ?? totalPages;
      const calls = resp.calls ?? [];
      if (calls.length === 0) break;

      const rows = calls.map(c => mapCall(c, ctmAccountId));
      for (const r of rows) {
        if (!maxCalledAt || r.called_at > maxCalledAt) maxCalledAt = r.called_at;
      }

      const { error, count } = await supabase
        .from('calls')
        .upsert(rows, { onConflict: 'ctm_id', count: 'estimated' });
      if (error) throw new Error(`upsert failed: ${error.message}`);
      // Supabase upsert doesn't distinguish inserts vs updates cheaply;
      // count them together as processed rows.
      inserted += count ?? rows.length;

      if (page >= (resp.total_pages ?? page)) break;
      page++;
    }

    await supabase
      .from('ctm_sync_state')
      .upsert(
        {
          id: 1,
          last_called_at: maxCalledAt ?? since ?? null,
          last_synced_at: new Date().toISOString(),
          last_page: page,
          inserted_total: inserted,
          updated_total: updated,
        },
        { onConflict: 'id' },
      );

    return NextResponse.json({
      ok: true,
      processed: inserted,
      pagesFetched: page,
      pagesTotal: totalPages,
      lastCalledAt: maxCalledAt,
      since: since ?? null,
      full,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), pagesFetched: page },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}

// Vercel Cron hits this as GET.
export async function GET(req: NextRequest) {
  return handleSync(req);
}

