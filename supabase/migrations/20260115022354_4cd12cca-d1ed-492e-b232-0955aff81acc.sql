-- Create imports tracking table
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('ofx', 'xls', 'xlsx', 'pdf')),
  import_type TEXT NOT NULL CHECK (import_type IN ('bank_statement', 'credit_card_invoice')),
  source_id UUID NOT NULL, -- bank_account_id or credit_card_id
  invoice_month DATE, -- For credit card invoices, the payment month
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'review_needed')),
  transactions_count INTEGER DEFAULT 0,
  error_message TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- RLS policies for imports
CREATE POLICY "Users can view their family imports"
  ON public.imports FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Users can create imports for their family"
  ON public.imports FOR INSERT
  WITH CHECK (family_id = public.get_user_family_id());

CREATE POLICY "Users can update their family imports"
  ON public.imports FOR UPDATE
  USING (public.is_family_member(family_id));

-- Add import_id reference to transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'import_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN import_id UUID REFERENCES public.imports(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add original_date for credit card transactions (purchase date vs invoice date)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'original_date'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN original_date DATE;
    COMMENT ON COLUMN public.transactions.original_date IS 'Original purchase date for credit card transactions (may differ from invoice date)';
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_imports_family_id ON public.imports(family_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON public.imports(status);
CREATE INDEX IF NOT EXISTS idx_transactions_import_id ON public.transactions(import_id);

-- Storage policies for financial_imports bucket
CREATE POLICY "Users can upload to their family folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'financial_imports' 
    AND (storage.foldername(name))[1] = public.get_user_family_id()::text
  );

CREATE POLICY "Users can view their family files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'financial_imports' 
    AND (storage.foldername(name))[1] = public.get_user_family_id()::text
  );

CREATE POLICY "Users can delete their family files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'financial_imports' 
    AND (storage.foldername(name))[1] = public.get_user_family_id()::text
  );