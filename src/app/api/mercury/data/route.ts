import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';

// GET /api/mercury/data
//
// Reader for the /feather/mercury page. Returns all Mercury accounts +
// a paginated slice of transactions, filtered by account_id and/or
// counterparty search. Super-admin only.
//
// Query params:
//   account_id  — restrict to one account (default: all)
//   q           — substring match against counterparty_name / note / external_memo
//   limit       — page size, capped at 200 (default 100)
//   offset      — pagination cursor (default 0)

export const dynamic = 'force-dynamic';

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
    .select('id, nickname, name, kind, type, account_number_last4, status, balance, available_balance, currency, dashboard_link, last_synced_at, sync_transactions')
    .order('name', { ascending: true });
  if (aErr) {
    return NextResponse.json({ error: `accounts: ${aErr.message}` }, { status: 500 });
  }

  let txnQuery = gate.admin
    .from('mercury_transactions')
    .select('id, account_id, posted_at, created_at_mercury, amount, currency, status, kind, counterparty_name, note, external_memo, dashboard_link', { count: 'exact' })
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('created_at_mercury', { ascending: false });
  if (accountId) txnQuery = txnQuery.eq('account_id', accountId);
  if (q) {
    // PostgREST OR-filter on three text columns.
    const safe = q.replace(/[%,]/g, ' ');
    txnQuery = txnQuery.or(
      `counterparty_name.ilike.%${safe}%,note.ilike.%${safe}%,external_memo.ilike.%${safe}%`,
    );
  }
  txnQuery = txnQuery.range(offset, offset + limit - 1);

  const { data: txns, error: tErr, count } = await txnQuery;
  if (tErr) {
    return NextResponse.json({ error: `transactions: ${tErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    accounts: accounts ?? [],
    transactions: txns ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
