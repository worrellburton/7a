// Thin wrapper around Mercury Bank's REST API.
//
// Auth: a long-lived organisation token from Settings → API Tokens
// (Read permission is enough for the read-only phase). The token
// lives in MERCURY_API_KEY on Vercel.
//
// Docs: https://docs.mercury.com/reference/getting-started
//
// We only call read endpoints here. /accounts and /account/:id
// /transactions are the two we need; everything downstream (P&L,
// reconciliation, etc.) reads from our own DB mirror.

const BASE_URL = 'https://api.mercury.com/api/v1';

export class MercuryError extends Error {
  constructor(message: string, public status: number, public body?: unknown) {
    super(message);
    this.name = 'MercuryError';
  }
}

export function hasMercuryKey(): boolean {
  return Boolean(process.env.MERCURY_API_KEY);
}

async function mercuryFetch<T>(path: string): Promise<T> {
  const key = process.env.MERCURY_API_KEY;
  if (!key) {
    throw new MercuryError('MERCURY_API_KEY not configured', 412);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      authorization: `Bearer ${key}`,
      accept: 'application/json',
    },
    cache: 'no-store',
  });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* leave as text */ }
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'errors' in body)
        ? JSON.stringify((body as { errors: unknown }).errors)
        : `Mercury HTTP ${res.status}`;
    throw new MercuryError(message, res.status, body);
  }
  return body as T;
}

// ──── Accounts ─────────────────────────────────────────────────

export interface MercuryAccount {
  id: string;
  name: string;
  nickname?: string | null;
  kind?: string | null;
  type?: string | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  status?: string | null;
  // Mercury's account object exposes `currentBalance` and
  // `availableBalance` — there is no plain `balance` field. Both
  // are dollar-denominated numbers (e.g. 7891.76). An earlier draft
  // of this file expected `balance`, which produced null on every
  // row and rendered as $0.00 in the orbit cards.
  currentBalance: number;
  availableBalance?: number | null;
  currency?: string | null;
  dashboardLink?: string | null;
}

export async function listAccounts(): Promise<MercuryAccount[]> {
  const json = await mercuryFetch<{ accounts: MercuryAccount[] }>(`/accounts`);
  return json.accounts ?? [];
}

// ──── Transactions ─────────────────────────────────────────────

export interface MercuryTransaction {
  id: string;
  amount: number; // negative for outflow
  createdAt: string;
  postedAt: string | null;
  status: string;
  kind: string;
  counterpartyName?: string | null;
  counterpartyId?: string | null;
  note?: string | null;
  externalMemo?: string | null;
  dashboardLink?: string | null;
  currencyExchangeInfo?: { currency?: string | null } | null;
}

// GOTCHA: Mercury's transactions endpoint defaults `start` to 30 DAYS
// AGO when it's omitted — so a fetch with no date range silently returns
// only the last month, never the full ledger. That's why the DB mirror
// only ever held a rolling recent window (it accumulated from the first
// sync forward and could never reach older history). We now pass an
// explicit far-back `start` so every sync backfills the account's entire
// history. `end` defaults to today, which is exactly what we want.
const MAX_PAGES = 200; // safety stop — 200 × 1000 = 200k transactions
const PAGE_SIZE = 1000; // Mercury's documented max page size
const HISTORY_START = '2015-01-01'; // predates Mercury → "from account open"

export async function listAllTransactions(
  accountId: string,
  start: string = HISTORY_START,
): Promise<MercuryTransaction[]> {
  const out: MercuryTransaction[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const json = await mercuryFetch<{ transactions: MercuryTransaction[]; total?: number }>(
      `/account/${encodeURIComponent(accountId)}/transactions?limit=${PAGE_SIZE}&offset=${offset}&order=desc&start=${encodeURIComponent(start)}`,
    );
    const batch = json.transactions ?? [];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return out;
}
