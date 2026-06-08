import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/api-gates';
import {
  hasMercuryKey,
  listAccounts,
  listAllTransactions,
  MercuryError,
  type MercuryAccount,
  type MercuryTransaction,
} from '@/lib/mercury';

// POST /api/mercury/sync — pulls every Mercury account + every
// transaction on the org token and upserts both into public
// .mercury_accounts / public.mercury_transactions. Idempotent.
// Super-admin only; the data is org-financials.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// 5 min cap — first sync on a fresh DB has to walk every page of
// every account. Subsequent runs return in seconds because the
// upsert no-ops on unchanged rows.
export const maxDuration = 300;

interface SyncResultItem {
  account_id: string;
  name: string;
  transactions_fetched: number;
  transactions_upserted: number;
  error?: string;
}

export async function POST() {
  const gate = await requireSuperAdmin();
  if (gate instanceof NextResponse) return gate;

  if (!hasMercuryKey()) {
    return NextResponse.json(
      { error: 'MERCURY_API_KEY not set on this environment.' },
      { status: 412 },
    );
  }

  const startedAt = Date.now();
  let accounts: MercuryAccount[];
  try {
    accounts = await listAccounts();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof MercuryError ? err.status : 502;
    return NextResponse.json({ error: `listAccounts failed: ${message}` }, { status });
  }

  // Upsert accounts.
  const accountRows = accounts.map((a) => ({
    id: a.id,
    nickname: a.nickname ?? null,
    name: a.name,
    kind: a.kind ?? null,
    type: a.type ?? null,
    account_number_last4: a.accountNumber ? a.accountNumber.slice(-4) : null,
    routing_number: a.routingNumber ?? null,
    status: a.status ?? null,
    balance: a.balance,
    available_balance: a.availableBalance ?? null,
    currency: a.currency ?? 'USD',
    dashboard_link: a.dashboardLink ?? null,
    raw: a as unknown as Record<string, unknown>,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  const { error: accountsErr } = await gate.admin
    .from('mercury_accounts')
    .upsert(accountRows, { onConflict: 'id' });
  if (accountsErr) {
    return NextResponse.json(
      { error: `accounts upsert failed: ${accountsErr.message}` },
      { status: 500 },
    );
  }

  // Walk transactions per account. Mercury returns all txns
  // (pending + posted) in one feed, so the upsert handles status
  // transitions (pending → posted) automatically by id.
  const results: SyncResultItem[] = [];
  let totalUpserted = 0;
  for (const account of accounts) {
    let txns: MercuryTransaction[] = [];
    try {
      txns = await listAllTransactions(account.id);
    } catch (err) {
      results.push({
        account_id: account.id,
        name: account.name,
        transactions_fetched: 0,
        transactions_upserted: 0,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    if (txns.length === 0) {
      results.push({
        account_id: account.id,
        name: account.name,
        transactions_fetched: 0,
        transactions_upserted: 0,
      });
      continue;
    }
    const rows = txns.map((t) => ({
      id: t.id,
      account_id: account.id,
      posted_at: t.postedAt ?? null,
      created_at_mercury: t.createdAt,
      amount: t.amount,
      currency: t.currencyExchangeInfo?.currency ?? account.currency ?? 'USD',
      status: t.status ?? null,
      kind: t.kind ?? null,
      counterparty_name: t.counterpartyName ?? null,
      counterparty_id: t.counterpartyId ?? null,
      note: t.note ?? null,
      external_memo: t.externalMemo ?? null,
      dashboard_link: t.dashboardLink ?? null,
      raw: t as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
    }));
    // Chunk to 1k rows per upsert — Postgres has a 65k parameter
    // limit and a 500-txn page of fields can already push past that
    // when one column is jsonb.
    const CHUNK = 500;
    let upserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error: txnErr } = await gate.admin
        .from('mercury_transactions')
        .upsert(slice, { onConflict: 'id' });
      if (txnErr) {
        results.push({
          account_id: account.id,
          name: account.name,
          transactions_fetched: txns.length,
          transactions_upserted: upserted,
          error: `chunk ${i}: ${txnErr.message}`,
        });
        break;
      }
      upserted += slice.length;
    }
    totalUpserted += upserted;
    results.push({
      account_id: account.id,
      name: account.name,
      transactions_fetched: txns.length,
      transactions_upserted: upserted,
    });
  }

  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - startedAt,
    accounts_synced: accounts.length,
    transactions_upserted: totalUpserted,
    results,
  });
}
