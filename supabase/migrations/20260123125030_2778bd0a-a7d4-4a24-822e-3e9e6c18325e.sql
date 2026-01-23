-- Add direction and classification fields to support proper credit categorization
-- direction: comes directly from bank (CREDIT = money in, DEBIT = money out)
-- classification: user-editable interpretation of the transaction

-- Create classification enum
DO $$ BEGIN
  CREATE TYPE public.transaction_classification AS ENUM (
    'income',
    'expense', 
    'transfer',
    'reimbursement',
    'adjustment'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create direction enum
DO $$ BEGIN
  CREATE TYPE public.transaction_direction AS ENUM (
    'credit',
    'debit'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add direction column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS direction public.transaction_direction;

-- Add classification column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS classification public.transaction_classification;

-- Set default values based on existing type field
-- For existing transactions: type='income' -> direction='credit', classification='income'
-- For existing transactions: type='expense' -> direction='debit', classification='expense'
UPDATE public.transactions 
SET direction = 'credit', classification = 'income'
WHERE type = 'income' AND direction IS NULL;

UPDATE public.transactions 
SET direction = 'debit', classification = 'expense'
WHERE type = 'expense' AND direction IS NULL;

-- Add direction and classification to import_pending_transactions
ALTER TABLE public.import_pending_transactions 
ADD COLUMN IF NOT EXISTS direction public.transaction_direction;

ALTER TABLE public.import_pending_transactions 
ADD COLUMN IF NOT EXISTS classification public.transaction_classification;

-- Update existing pending transactions based on type
UPDATE public.import_pending_transactions 
SET direction = 'credit', classification = 'income'
WHERE type = 'income' AND direction IS NULL;

UPDATE public.import_pending_transactions 
SET direction = 'debit', classification = 'expense'
WHERE type = 'expense' AND direction IS NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN public.transactions.direction IS 'Bank-provided direction: credit (money in) or debit (money out)';
COMMENT ON COLUMN public.transactions.classification IS 'User classification: income, expense, transfer, reimbursement, or adjustment';
COMMENT ON COLUMN public.import_pending_transactions.direction IS 'Bank-provided direction: credit (money in) or debit (money out)';
COMMENT ON COLUMN public.import_pending_transactions.classification IS 'Suggested/user classification for import review';