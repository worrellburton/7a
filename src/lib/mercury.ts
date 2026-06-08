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
  balance: number;
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

const MAX_PAGES = 200; // safety stop — 200 × 500 = 100k transactions
const PAGE_SIZE = 500;

export async function listAllTransactions(accountId: string): Promise<MercuryTransaction[]> {
  const out: MercuryTransaction[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const json = await mercuryFetch<{ transactions: MercuryTransaction[]; total?: number }>(
      `/account/${encodeURIComponent(accountId)}/transactions?limit=${PAGE_SIZE}&offset=${offset}&order=desc`,
    );
    const batch = json.transactions ?? [];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return out;
}
