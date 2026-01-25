-- Add author and edit tracking columns to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS last_edited_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Update existing transactions with current source if null
UPDATE public.transactions 
SET source = 'MANUAL' 
WHERE source IS NULL;

-- Make source NOT NULL with proper default
ALTER TABLE public.transactions 
ALTER COLUMN source SET NOT NULL,
ALTER COLUMN source SET DEFAULT 'MANUAL';

-- Update source constraint to include OCR and OPEN_FINANCE
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check 
CHECK (source IN ('MANUAL', 'UPLOAD', 'IMPORT', 'GOAL_CONTRIBUTION', 'OCR', 'OPEN_FINANCE'));

-- Create index for performance on author queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_by_user 
ON public.transactions(created_by_user_id) WHERE created_by_user_id IS NOT NULL;

-- Add trigger to auto-set last_edited_at on updates
CREATE OR REPLACE FUNCTION public.set_transaction_edit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if data actually changed (not just read)
  IF OLD.amount != NEW.amount 
     OR OLD.description IS DISTINCT FROM NEW.description 
     OR OLD.category_id != NEW.category_id
     OR OLD.subcategory_id IS DISTINCT FROM NEW.subcategory_id
     OR OLD.date != NEW.date THEN
    NEW.last_edited_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_transaction_edit_timestamp_trigger ON public.transactions;
CREATE TRIGGER set_transaction_edit_timestamp_trigger
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_transaction_edit_timestamp();

-- Comment for documentation
COMMENT ON COLUMN public.transactions.source IS 'Source of transaction: MANUAL, UPLOAD, IMPORT, OCR, OPEN_FINANCE, GOAL_CONTRIBUTION';
COMMENT ON COLUMN public.transactions.created_by_user_id IS 'User who created this transaction';
COMMENT ON COLUMN public.transactions.created_by_name IS 'Display name of user at time of creation';
COMMENT ON COLUMN public.transactions.last_edited_by_user_id IS 'User who last edited this transaction';
COMMENT ON COLUMN public.transactions.last_edited_at IS 'Timestamp of last edit';