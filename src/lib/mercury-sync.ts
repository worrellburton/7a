import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listAccounts,
  listAllTransactions,
  type MercuryTransaction,
} from '@/lib/mercury';

// Shared Mercury → DB sync. Used by both:
//   - /api/mercury/sync       (manual, super-admin POST from the page)
//   - /api/cron/mercury/sync  (Vercel cron, hourly)
//
// The two callers gate auth differently but the actual work — pull
// accounts, pull transactions per non-paused account, upsert both —
// is identical, so it lives here.
//
// IMPORTANT: read Mercury's `currentBalance`, not `balance`. The API
// has no `balance` field at the account level; a write that uses
// `a.balance` lands as null. The DB trigger
// mercury_accounts_rescue_balance defends against this on every
// upsert by pulling from the raw blob, but writing the right value
// here keeps the round-trip clean.

export interface SyncResultItem {
  account_id: string;
  name: string;
  transactions_fetched: number;
  transactions_upserted: number;
  skipped?: boolean;
  error?: string;
}

export interface SyncResult {
  ok: true;
  duration_ms: number;
  accounts_synced: number;
  transactions_upserted: number;
  results: SyncResultItem[];
}

const TXN_UPSERT_CHUNK = 500;

export async function runMercurySync(admin: SupabaseClient): Promise<SyncResult> {
  const startedAt = Date.now();
  const accounts = await listAccounts();

  const accountRows = accounts.map((a) => ({
    id: a.id,
    nickname: a.nickname ?? null,
    name: a.name,
    kind: a.kind ?? null,
    type: a.type ?? null,
    account_number_last4: a.accountNumber ? a.accountNumber.slice(-4) : null,
    routing_number: a.routingNumber ?? null,
    status: a.status ?? null,
    balance: a.currentBalance,
    available_balance: a.availableBalance ?? null,
    currency: a.currency ?? 'USD',
    dashboard_link: a.dashboardLink ?? null,
    raw: a as unknown as Record<string, unknown>,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Upsert + read back the current sync_transactions flag for each
  // account in one round-trip. The payload omits the flag so existing
  // values are preserved; new accounts inherit the column default
  // (true) and start fully tracked.
  const { data: upsertedAccounts, error: accountsErr } = await admin
    .from('mercury_accounts')
    .upsert(accountRows, { onConflict: 'id' })
    .select('id, sync_transactions');
  if (accountsErr) {
    throw new Error(`accounts upsert failed: ${accountsErr.message}`);
  }
  const syncFlagById = new Map<string, boolean>(
    ((upsertedAccounts ?? []) as Array<{ id: string; sync_transactions: boolean }>).map(
      (r) => [r.id, r.sync_transactions !== false],
    ),
  );

  const results: SyncResultItem[] = [];
  let totalUpserted = 0;

  for (const account of accounts) {
    if (syncFlagById.get(account.id) === false) {
      results.push({
        account_id: account.id,
        name: account.name,
        transactions_fetched: 0,
        transactions_upserted: 0,
        skipped: true,
      });
      continue;
    }
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
    let upserted = 0;
    for (let i = 0; i < rows.length; i += TXN_UPSERT_CHUNK) {
      const slice = rows.slice(i, i + TXN_UPSERT_CHUNK);
      const { error: txnErr } = await admin
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

  return {
    ok: true,
    duration_ms: Date.now() - startedAt,
    accounts_synced: accounts.length,
    transactions_upserted: totalUpserted,
    results,
  };
}
