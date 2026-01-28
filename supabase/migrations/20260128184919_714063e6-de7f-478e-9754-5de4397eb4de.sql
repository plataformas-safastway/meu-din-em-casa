-- =============================================================================
-- MIGRATION: Cash-Basis Accounting (Regime de Caixa)
-- Adds event_date, cash_date, and budget_month to transactions
-- =============================================================================

-- Step 1: Add new columns
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS cash_date DATE,
ADD COLUMN IF NOT EXISTS budget_month TEXT;

-- Step 2: Backfill event_date from existing date column (always equals original date)
UPDATE public.transactions
SET event_date = date
WHERE event_date IS NULL;

-- Step 3: Make event_date NOT NULL after backfill
ALTER TABLE public.transactions 
ALTER COLUMN event_date SET NOT NULL,
ALTER COLUMN event_date SET DEFAULT CURRENT_DATE;

-- Step 4: Backfill cash_date based on payment_method
-- Enum values: cash, debit, credit, pix, transfer, cheque
-- For immediate payment methods: cash_date = date
-- For credit card purchases: cash_date = NULL (not a cash event yet)
-- For cheque: cash_date = NULL (pending compensation)
UPDATE public.transactions
SET cash_date = CASE
  WHEN payment_method IN ('pix', 'debit', 'cash', 'transfer') THEN date
  WHEN payment_method = 'credit' THEN NULL  -- Credit card purchases are not cash events
  WHEN payment_method = 'cheque' THEN NULL  -- Cheques need compensation date
  ELSE date
END
WHERE cash_date IS NULL AND event_date IS NOT NULL;

-- Step 5: Backfill budget_month (derived from cash_date when available)
UPDATE public.transactions
SET budget_month = to_char(cash_date, 'YYYY-MM')
WHERE cash_date IS NOT NULL AND budget_month IS NULL;

-- Step 6: Create trigger function to auto-set budget_month when cash_date changes
CREATE OR REPLACE FUNCTION public.update_transaction_budget_month()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-derive budget_month from cash_date
  IF NEW.cash_date IS NOT NULL THEN
    NEW.budget_month := to_char(NEW.cash_date, 'YYYY-MM');
  ELSE
    NEW.budget_month := NULL;
  END IF;
  
  -- For new transactions, set event_date = date if not provided
  IF TG_OP = 'INSERT' AND NEW.event_date IS NULL THEN
    NEW.event_date := NEW.date;
  END IF;
  
  -- For immediate payment methods on INSERT, auto-set cash_date
  IF TG_OP = 'INSERT' AND NEW.cash_date IS NULL THEN
    IF NEW.payment_method IN ('pix', 'debit', 'cash', 'transfer') THEN
      NEW.cash_date := NEW.date;
      NEW.budget_month := to_char(NEW.cash_date, 'YYYY-MM');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 7: Create the trigger
DROP TRIGGER IF EXISTS trigger_update_budget_month ON public.transactions;
CREATE TRIGGER trigger_update_budget_month
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_transaction_budget_month();

-- Step 8: Update enforce_transaction_edit_rules to handle new fields
CREATE OR REPLACE FUNCTION public.enforce_transaction_edit_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Skip if this is an insert
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- For UPLOAD, IMPORT, and OPEN_FINANCE: block event_date and amount changes
  IF OLD.source IN ('UPLOAD', 'IMPORT', 'OPEN_FINANCE') THEN
    -- Prevent event_date changes (the original transaction date)
    IF NEW.event_date != OLD.event_date THEN
      RAISE EXCEPTION 'Cannot modify event_date for transactions from %', OLD.source;
    END IF;
    
    -- Prevent legacy date field changes
    IF NEW.date != OLD.date THEN
      RAISE EXCEPTION 'Cannot modify date for transactions from %', OLD.source;
    END IF;
    
    -- Prevent amount changes
    IF NEW.amount != OLD.amount THEN
      RAISE EXCEPTION 'Cannot modify amount for transactions from %', OLD.source;
    END IF;
    
    -- Allow cash_date changes ONLY for:
    -- 1. Cheque compensation (filling in NULL -> date)
    -- 2. Credit card invoice payment linkage
    IF NEW.cash_date IS DISTINCT FROM OLD.cash_date THEN
      -- Allow setting cash_date for cheque (compensation)
      IF OLD.payment_method = 'cheque' AND OLD.cash_date IS NULL AND NEW.cash_date IS NOT NULL THEN
        -- OK: This is cheque compensation
        NULL;
      -- Allow clearing/setting cash_date for credit card scenarios
      ELSIF OLD.payment_method = 'credit' THEN
        -- OK: Credit card cash_date management
        NULL;
      ELSE
        RAISE EXCEPTION 'Cannot modify cash_date for this transaction type from %', OLD.source;
      END IF;
    END IF;
  END IF;
  
  -- For GOAL_CONTRIBUTION: block most changes (only allow category/description)
  IF OLD.source = 'GOAL_CONTRIBUTION' THEN
    IF NEW.event_date != OLD.event_date THEN
      RAISE EXCEPTION 'Cannot modify event_date for goal contribution transactions';
    END IF;
    IF NEW.date != OLD.date THEN
      RAISE EXCEPTION 'Cannot modify date for goal contribution transactions';
    END IF;
    IF NEW.amount != OLD.amount THEN
      RAISE EXCEPTION 'Cannot modify amount for goal contribution transactions';
    END IF;
    IF NEW.goal_id IS DISTINCT FROM OLD.goal_id THEN
      RAISE EXCEPTION 'Cannot modify goal reference';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 9: Create index for budget queries by cash_date
CREATE INDEX IF NOT EXISTS idx_transactions_cash_date ON public.transactions(cash_date);
CREATE INDEX IF NOT EXISTS idx_transactions_budget_month ON public.transactions(budget_month);
CREATE INDEX IF NOT EXISTS idx_transactions_family_budget_month ON public.transactions(family_id, budget_month);

-- Step 10: Add comment documentation
COMMENT ON COLUMN public.transactions.event_date IS 'Date when the event occurred (purchase, transfer, etc.) - immutable for external sources';
COMMENT ON COLUMN public.transactions.cash_date IS 'Date when money actually left/entered the account (for cash-basis budgeting). NULL for pending items.';
COMMENT ON COLUMN public.transactions.budget_month IS 'YYYY-MM derived from cash_date, used for monthly budget aggregation. NULL if cash_date is NULL.';