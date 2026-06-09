-- Defensive trigger: if a write leaves balance NULL but the raw
-- Mercury blob has currentBalance (or a legacy `balance`) field,
-- populate the column from the blob. Prevents an old deploy of
-- /api/mercury/sync from wiping balances when its `a.balance` reads
-- undefined against Mercury's actual `currentBalance` key, and
-- future-proofs against Mercury renaming again — the raw blob is
-- always authoritative.
--
-- Also rescues available_balance the same way.

CREATE OR REPLACE FUNCTION public.mercury_accounts_rescue_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.balance IS NULL AND NEW.raw IS NOT NULL THEN
    IF (NEW.raw ? 'currentBalance') AND NEW.raw->>'currentBalance' IS NOT NULL THEN
      NEW.balance := (NEW.raw->>'currentBalance')::numeric;
    ELSIF (NEW.raw ? 'balance') AND NEW.raw->>'balance' IS NOT NULL THEN
      NEW.balance := (NEW.raw->>'balance')::numeric;
    END IF;
  END IF;
  IF NEW.available_balance IS NULL
     AND NEW.raw IS NOT NULL
     AND (NEW.raw ? 'availableBalance')
     AND NEW.raw->>'availableBalance' IS NOT NULL
  THEN
    NEW.available_balance := (NEW.raw->>'availableBalance')::numeric;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mercury_accounts_rescue_balance_trg ON public.mercury_accounts;
CREATE TRIGGER mercury_accounts_rescue_balance_trg
  BEFORE INSERT OR UPDATE ON public.mercury_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.mercury_accounts_rescue_balance();

UPDATE public.mercury_accounts
SET balance = (raw->>'currentBalance')::numeric
WHERE balance IS NULL AND raw ? 'currentBalance' AND raw->>'currentBalance' IS NOT NULL;
