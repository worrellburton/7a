-- Mercury Bank integration — raw transaction ledger.
--
-- Phase 1: read-only mirror of every Mercury account + transaction.
-- No categorization, no chart-of-accounts yet — just an exact copy
-- of what Mercury's API returns so we can build P&L / cash-flow
-- views on top of it later. Subsequent phases add chart_of_accounts
-- and a mercury_transactions.account_id foreign key.
--
-- Sync flow: /api/mercury/sync (super-admin) calls Mercury's REST
-- API with the MERCURY_API_KEY env var and upserts every row on
-- the Mercury-issued id. Idempotent — re-running it just refreshes
-- balances + statuses; nothing duplicates.
--
-- RLS: super-admin only. Bookkeeping data isn't appropriate for
-- general staff visibility, and the matching server gate already
-- runs through requireSuperAdmin.

CREATE TABLE IF NOT EXISTS public.mercury_accounts (
  id text PRIMARY KEY,
  nickname text,
  name text NOT NULL,
  kind text,
  type text,
  account_number_last4 text,
  routing_number text,
  status text,
  balance numeric(18, 2),
  available_balance numeric(18, 2),
  currency text,
  dashboard_link text,
  raw jsonb NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mercury_transactions (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES public.mercury_accounts(id) ON DELETE CASCADE,
  posted_at timestamptz,
  created_at_mercury timestamptz NOT NULL,
  amount numeric(18, 2) NOT NULL,
  currency text,
  status text,
  kind text,
  counterparty_name text,
  counterparty_id text,
  note text,
  external_memo text,
  dashboard_link text,
  raw jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mercury_transactions_account_id_idx
  ON public.mercury_transactions (account_id);
CREATE INDEX IF NOT EXISTS mercury_transactions_posted_at_idx
  ON public.mercury_transactions (posted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS mercury_transactions_created_at_mercury_idx
  ON public.mercury_transactions (created_at_mercury DESC);

ALTER TABLE public.mercury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercury_transactions ENABLE ROW LEVEL SECURITY;

-- Read policies: super admins only. The service-role client used by
-- /api/mercury/* bypasses RLS, so these policies just lock the table
-- against direct PostgREST reads from a logged-in non-super-admin.
DROP POLICY IF EXISTS mercury_accounts_super_admin_select ON public.mercury_accounts;
CREATE POLICY mercury_accounts_super_admin_select
  ON public.mercury_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS mercury_transactions_super_admin_select ON public.mercury_transactions;
CREATE POLICY mercury_transactions_super_admin_select
  ON public.mercury_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_super_admin = true
    )
  );

COMMENT ON TABLE public.mercury_accounts IS
  'Mirror of every Mercury Bank account on the org token. Synced by /api/mercury/sync. Super-admin RLS.';
COMMENT ON TABLE public.mercury_transactions IS
  'Every transaction returned by Mercury''s /account/:id/transactions endpoint. Idempotent on id. Super-admin RLS.';
