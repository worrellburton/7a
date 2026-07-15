import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePageAccess } from '@/lib/page-access';
import { getAdminSupabase } from '@/lib/supabase-server';

// GET /api/billing/receivables
//
// Reader for the /feather/billing page — accounts receivable, i.e.
// every INCOMING (amount > 0) transaction in the Mercury DB mirror
// (mercury_transactions, filled hourly by /api/cron/mercury/sync and
// on demand from /feather/mercury).
//
// Access mirrors what the sidebar + permissions modal show
// (requirePageAccess): admins / super admins, plus anyone a super
// admin explicitly granted /feather/billing to via
// /feather/admin/user-permissions. The eye toggle in that modal is
// the source of truth — if it says a user can see Billing, this
// route lets their data through (this is the same pattern the
// Content page uses).
//
// Query params:
//   account_id — restrict to one Mercury account (default: all)
//   q          — substring match on counterparty_name / note / external_memo
//   limit      — page size, capped at 200 (default 100)
//   offset     — pagination cursor (default 0)
//   format     — 'csv' returns EVERY matching row (no pagination) as a
//                CSV attachment with one column per Mercury field
//
// Besides the paginated slice, the JSON response carries summary
// numbers (pending / this-month / all-time) computed over the WHOLE
// incoming set for the selected account — not just the visible page —
// so the tiles stay truthful while paging. The text search
// deliberately does not narrow the summary: the tiles describe the
// book, `q` narrows the table.

export const dynamic = 'force-dynamic';

// One PostgREST select caps at 1000 rows; both the summary and the
// CSV export page through at this size. 25 pages = 25k incoming rows
// is a runaway stop far above real volume, not an expected ceiling.
const FETCH_PAGE = 1000;
const MAX_FETCH_PAGES = 25;

const LIST_COLUMNS =
  'id, account_id, posted_at, created_at_mercury, amount, currency, status, kind, counterparty_name, counterparty_id, note, external_memo, dashboard_link, fetched_at, raw';

// Counterparties that aren't real customer receivables — Mercury
// cashback, an inter-account transfer, and owner / related-entity
// capital contributions. They inflate the AR tiles and clutter the
// table, so they're hidden by default. The page's "Filtered payers"
// toggle (and ?include_excluded=1) brings them back. Names are the
// exact counterparty_name values Mercury stores.
const EXCLUDED_COUNTERPARTIES = [
  'Mercury IO Cashback',
  'Mercury - Checking ••0043',
  'Ledger Louise, LLC',
  'BURTON FAMILY REVOCABLE TRUST DATED',
];

// Builds the PostgREST `or` clause that drops the excluded
// counterparties while KEEPING rows with a null counterparty_name —
// `col <> x` is NULL (not true) for nulls in Postgres, so a bare
// negative filter would silently swallow every unlabelled receivable.
function excludedOrFilter(): string {
  const inList = EXCLUDED_COUNTERPARTIES
    .map((n) => `"${n.replace(/"/g, '\\"')}"`)
    .join(',');
  return `counterparty_name.is.null,counterparty_name.not.in.(${inList})`;
}

interface TxnRow {
  id: string;
  account_id: string;
  posted_at: string | null;
  created_at_mercury: string;
  amount: number;
  currency: string | null;
  status: string | null;
  kind: string | null;
  counterparty_name: string | null;
  counterparty_id: string | null;
  note: string | null;
  external_memo: string | null;
  dashboard_link: string | null;
  fetched_at: string | null;
  raw: Record<string, unknown> | null;
}

interface AccountRow {
  id: string;
  nickname: string | null;
  name: string;
  account_number_last4: string | null;
  currency: string | null;
  last_synced_at: string;
}

function incomingQuery(admin: SupabaseClient, columns: string, accountId: string | null, q: string, opts?: { count?: boolean; includeExcluded?: boolean }) {
  let query = admin
    .from('mercury_transactions')
    .select(columns, opts?.count ? { count: 'exact' } : undefined)
    .gt('amount', 0);
  if (accountId) query = query.eq('account_id', accountId);
  // Hide internal / non-customer payers unless the caller opts in.
  // ANDs with the text-search `or` below (two `or` clauses = AND).
  if (!opts?.includeExcluded) query = query.or(excludedOrFilter());
  if (q) {
    // PostgREST OR-filter on three text columns.
    const safe = q.replace(/[%,]/g, ' ');
    query = query.or(
      `counterparty_name.ilike.%${safe}%,note.ilike.%${safe}%,external_memo.ilike.%${safe}%`,
    );
  }
  return query;
}

function rawField(raw: Record<string, unknown> | null, key: string): unknown {
  return raw ? raw[key] : undefined;
}

function glSummary(raw: Record<string, unknown> | null): string {
  const v = rawField(raw, 'glAllocations');
  if (!Array.isArray(v)) return '';
  return v
    .map((g) => {
      const o = (g ?? {}) as { glCodeName?: unknown; amount?: unknown };
      const name = typeof o.glCodeName === 'string' ? o.glCodeName : '';
      const amt = typeof o.amount === 'number' ? String(o.amount) : '';
      if (name && amt) return `${name}: ${amt}`;
      return name || amt;
    })
    .filter(Boolean)
    .join('; ');
}

// CSV cell encoder. Doubles quotes per RFC 4180, and prefixes string
// cells that start with =, +, - or @ with an apostrophe so a
// malicious counterparty name / memo can't run as a formula when the
// export is opened in Excel / Sheets.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (typeof value === 'string') {
    s = /^[=+\-@]/.test(value) ? `'${value}` : value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    s = String(value);
  } else {
    s = JSON.stringify(value);
  }
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function fetchAllIncoming(
  admin: SupabaseClient,
  columns: string,
  accountId: string | null,
  q: string,
  includeExcluded: boolean,
): Promise<{ rows: TxnRow[]; truncated: boolean } | { error: string }> {
  const rows: TxnRow[] = [];
  for (let page = 0; ; page++) {
    if (page >= MAX_FETCH_PAGES) return { rows, truncated: true };
    const { data: batch, error } = await incomingQuery(admin, columns, accountId, q, { includeExcluded })
      .order('posted_at', { ascending: false, nullsFirst: true })
      .order('created_at_mercury', { ascending: false })
      .range(page * FETCH_PAGE, (page + 1) * FETCH_PAGE - 1);
    if (error) return { error: error.message };
    rows.push(...(((batch ?? []) as unknown) as TxnRow[]));
    if (!batch || batch.length < FETCH_PAGE) return { rows, truncated: false };
  }
}

function buildCsv(rows: TxnRow[], accounts: AccountRow[]): string {
  const accountName = new Map(accounts.map((a) => [a.id, a.nickname || a.name]));
  const header = [
    'posted_at',
    'created_at',
    'counterparty',
    'counterparty_nickname',
    'account',
    'kind',
    'status',
    'amount',
    'currency',
    'gl_allocations',
    'mercury_category',
    'general_ledger_code',
    'bank_description',
    'note',
    'external_memo',
    'check_number',
    'tracking_number',
    'estimated_delivery',
    'failed_at',
    'failure_reason',
    'attachments_count',
    'receipt_generated',
    'receipt_policy_compliant',
    'counterparty_id',
    'transaction_id',
    'dashboard_link',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    const raw = r.raw;
    const attachments = rawField(raw, 'attachments');
    lines.push(
      [
        r.posted_at,
        r.created_at_mercury,
        r.counterparty_name,
        rawField(raw, 'counterpartyNickname'),
        accountName.get(r.account_id) ?? r.account_id,
        r.kind,
        r.status,
        r.amount,
        r.currency,
        glSummary(raw),
        rawField(raw, 'mercuryCategory'),
        rawField(raw, 'generalLedgerCodeName'),
        rawField(raw, 'bankDescription'),
        r.note,
        r.external_memo,
        rawField(raw, 'checkNumber'),
        rawField(raw, 'trackingNumber'),
        rawField(raw, 'estimatedDeliveryDate'),
        rawField(raw, 'failedAt'),
        rawField(raw, 'reasonForFailure'),
        Array.isArray(attachments) ? attachments.length : 0,
        rawField(raw, 'hasGeneratedReceipt'),
        rawField(raw, 'compliantWithReceiptPolicy'),
        r.counterparty_id,
        r.id,
        r.dashboard_link,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

export async function GET(req: NextRequest) {
  // Cookie-session gate — reads the Supabase auth cookie, then
  // grants admins or explicit per-user page overrides.
  const gate = await requirePageAccess('/feather/billing');
  if (gate.error) return gate.error;
  const admin = getAdminSupabase();

  const url = new URL(req.url);
  const accountId = url.searchParams.get('account_id') || null;
  const q = (url.searchParams.get('q') || '').trim();
  const format = (url.searchParams.get('format') || '').toLowerCase();
  const limitRaw = Number(url.searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 100;
  const offsetRaw = Number(url.searchParams.get('offset') ?? '0');
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
  const includeExcluded = ['1', 'true', 'yes'].includes(
    (url.searchParams.get('include_excluded') || '').toLowerCase(),
  );

  const { data: accounts, error: aErr } = await admin
    .from('mercury_accounts')
    .select('id, nickname, name, account_number_last4, currency, last_synced_at')
    .order('name', { ascending: true });
  if (aErr) {
    return NextResponse.json({ error: `accounts: ${aErr.message}` }, { status: 500 });
  }

  // CSV export — every matching row, one file, filters honoured.
  if (format === 'csv') {
    const all = await fetchAllIncoming(admin, LIST_COLUMNS, accountId, q, includeExcluded);
    if ('error' in all) {
      return NextResponse.json({ error: `export: ${all.error}` }, { status: 500 });
    }
    const csv = buildCsv(all.rows, (accounts ?? []) as AccountRow[]);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="receivables-${stamp}.csv"`,
        'cache-control': 'no-store',
      },
    });
  }

  // `raw` is Mercury's full transaction object (bank description, GL
  // allocations, check number, estimated delivery, attachments, …) —
  // the page's expandable rows render everything in it, so ship it
  // whole rather than cherry-picking columns that would go stale.
  const listQuery = incomingQuery(admin, LIST_COLUMNS, accountId, q, { count: true, includeExcluded })
    // Pending receivables have no posted_at yet — surface them first
    // (they're the money still on its way), then posted, newest first.
    .order('posted_at', { ascending: false, nullsFirst: true })
    .order('created_at_mercury', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: rows, error: rErr, count } = await listQuery;
  if (rErr) {
    return NextResponse.json({ error: `receivables: ${rErr.message}` }, { status: 500 });
  }

  // Whole-set summary (account filter + exclusion honoured, text
  // search not). The tiles must match the toggle state so hidden
  // internal transfers don't count toward AR.
  const all = await fetchAllIncoming(admin, 'amount, status, posted_at, created_at_mercury', accountId, '', includeExcluded);
  if ('error' in all) {
    return NextResponse.json({ error: `summary: ${all.error}` }, { status: 500 });
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
  for (const r of all.rows) {
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
      total_count: all.rows.length,
      pending_sum: pendingSum,
      pending_count: pendingCount,
      month_sum: monthSum,
      month_count: monthCount,
      truncated: all.truncated,
    },
    excluded: {
      names: EXCLUDED_COUNTERPARTIES,
      included: includeExcluded,
    },
  });
}
