-- Add description fields for proper tracking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS original_description TEXT,
ADD COLUMN IF NOT EXISTS user_description TEXT,
ADD COLUMN IF NOT EXISTS original_category_id TEXT,
ADD COLUMN IF NOT EXISTS original_subcategory_id TEXT,
ADD COLUMN IF NOT EXISTS ocr_confidence SMALLINT CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 100));

-- Populate original_description from existing description for existing records
UPDATE public.transactions 
SET original_description = description 
WHERE original_description IS NULL AND description IS NOT NULL;

-- Create function to enforce edit rules by source
CREATE OR REPLACE FUNCTION public.enforce_transaction_edit_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if this is an insert
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- For UPLOAD and OPEN_FINANCE: block date and amount changes
  IF OLD.source IN ('UPLOAD', 'IMPORT', 'OPEN_FINANCE') THEN
    -- Prevent date changes
    IF NEW.date != OLD.date THEN
      RAISE EXCEPTION 'Cannot modify date for transactions from %', OLD.source;
    END IF;
    
    -- Prevent amount changes
    IF NEW.amount != OLD.amount THEN
      RAISE EXCEPTION 'Cannot modify amount for transactions from %', OLD.source;
    END IF;
  END IF;
  
  -- For GOAL_CONTRIBUTION: block most changes (only allow category/description)
  IF OLD.source = 'GOAL_CONTRIBUTION' THEN
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
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for edit rules enforcement
DROP TRIGGER IF EXISTS enforce_transaction_edit_rules_trigger ON public.transactions;
CREATE TRIGGER enforce_transaction_edit_rules_trigger
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_transaction_edit_rules();

-- Comments for documentation
COMMENT ON COLUMN public.transactions.original_description IS 'Original description from import/OCR/Open Finance (immutable)';
COMMENT ON COLUMN public.transactions.user_description IS 'User-provided description override';
COMMENT ON COLUMN public.transactions.original_category_id IS 'Original category from import (before user override)';
COMMENT ON COLUMN public.transactions.ocr_confidence IS 'OCR confidence score 0-100 for OCR source transactions';