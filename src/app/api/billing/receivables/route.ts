import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';

// GET /api/billing/receivables
//
// Reader for the /feather/billing page — accounts receivable, i.e.
// every INCOMING (amount > 0) transaction in the Mercury DB mirror
// (mercury_transactions, filled hourly by /api/cron/mercury/sync and
// on demand from /feather/mercury). Super-admin only, same gate as
// the rest of the Mercury surface.
//
// Query params:
//   account_id — restrict to one Mercury account (default: all)
//   q          — substring match on counterparty_name / note / external_memo
//   limit      — page size, capped at 200 (default 100)
//   offset     — pagination cursor (default 0)
//
// Besides the paginated slice, the response carries summary numbers
// (pending / this-month / all-time) computed over the WHOLE incoming
// set for the selected account — not just the visible page — so the
// tiles stay truthful while paging. The text search deliberately does
// not narrow the summary: the tiles describe the book, `q` narrows
// the table.

export const dynamic = 'force-dynamic';

interface SummaryRow {
  amount: number;
  status: string | null;
  posted_at: string | null;
  created_at_mercury: string;
}

export async function GET(req: NextRequest) {
  // Cookie-session gate (no req arg). Browser fetches send the
  // Supabase auth cookie but not a Bearer header, so passing req
  // here would route through getUserFromRequest and 401 every call.
  const gate = await requireSuperAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const accountId = url.searchParams.get('account_id') || null;
  const q = (url.searchParams.get('q') || '').trim();
  const limitRaw = Number(url.searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 100;
  const offsetRaw = Number(url.searchParams.get('offset') ?? '0');
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const { data: accounts, error: aErr } = await gate.admin
    .from('mercury_accounts')
    .select('id, nickname, name, account_number_last4, currency, last_synced_at')
    .order('name', { ascending: true });
  if (aErr) {
    return NextResponse.json({ error: `accounts: ${aErr.message}` }, { status: 500 });
  }

  let listQuery = gate.admin
    .from('mercury_transactions')
    .select('id, account_id, posted_at, created_at_mercury, amount, currency, status, kind, counterparty_name, note, external_memo, dashboard_link', { count: 'exact' })
    .gt('amount', 0)
    // Pending receivables have no posted_at yet — surface them first
    // (they're the money still on its way), then posted, newest first.
    .order('posted_at', { ascending: false, nullsFirst: true })
    .order('created_at_mercury', { ascending: false });
  if (accountId) listQuery = listQuery.eq('account_id', accountId);
  if (q) {
    // PostgREST OR-filter on three text columns.
    const safe = q.replace(/[%,]/g, ' ');
    listQuery = listQuery.or(
      `counterparty_name.ilike.%${safe}%,note.ilike.%${safe}%,external_memo.ilike.%${safe}%`,
    );
  }
  listQuery = listQuery.range(offset, offset + limit - 1);

  const { data: rows, error: rErr, count } = await listQuery;
  if (rErr) {
    return NextResponse.json({ error: `receivables: ${rErr.message}` }, { status: 500 });
  }

  // Whole-set summary. PostgREST caps a single select at 1000 rows,
  // so page the slim columns until a short page comes back. The loop
  // cap (25 pages = 25k incoming rows) is a runaway stop far above
  // the real volume; if it ever trips we say so via `truncated`.
  const summarySource: SummaryRow[] = [];
  const SUMMARY_PAGE = 1000;
  let truncated = false;
  for (let page = 0; ; page++) {
    if (page >= 25) {
      truncated = true;
      break;
    }
    let sq = gate.admin
      .from('mercury_transactions')
      .select('amount, status, posted_at, created_at_mercury')
      .gt('amount', 0)
      .range(page * SUMMARY_PAGE, (page + 1) * SUMMARY_PAGE - 1);
    if (accountId) sq = sq.eq('account_id', accountId);
    const { data: batch, error: sErr } = await sq;
    if (sErr) {
      return NextResponse.json({ error: `summary: ${sErr.message}` }, { status: 500 });
    }
    summarySource.push(...((batch ?? []) as SummaryRow[]));
    if (!batch || batch.length < SUMMARY_PAGE) break;
  }

  // "This month" uses the server clock (UTC on Vercel) — close enough
  // for a glanceable tile; the table itself carries exact dates.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let totalSum = 0;
  let pendingSum = 0;
  let pendingCount = 0;
  let monthSum = 0;
  let monthCount = 0;
  for (const r of summarySource) {
    totalSum += r.amount;
    if (r.status === 'pending') {
      pendingSum += r.amount;
      pendingCount += 1;
    }
    const ts = new Date(r.posted_at ?? r.created_at_mercury).getTime();
    if (Number.isFinite(ts) && ts >= monthStart) {
      monthSum += r.amount;
      monthCount += 1;
    }
  }

  return NextResponse.json({
    accounts: accounts ?? [],
    receivables: rows ?? [],
    total: count ?? 0,
    limit,
    offset,
    summary: {
      total_sum: totalSum,
      total_count: summarySource.length,
      pending_sum: pendingSum,
      pending_count: pendingCount,
      month_sum: monthSum,
      month_count: monthCount,
      truncated,
    },
  });
}
