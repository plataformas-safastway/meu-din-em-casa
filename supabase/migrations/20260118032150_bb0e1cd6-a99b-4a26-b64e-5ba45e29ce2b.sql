-- Add CPF and birth_date fields to family_members table for import password derivation
-- CPF and birth_date are stored on the family_members table for the owner

ALTER TABLE public.family_members
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Create index for CPF lookup
CREATE INDEX IF NOT EXISTS idx_family_members_cpf ON public.family_members(cpf) WHERE cpf IS NOT NULL;

-- Add comment explaining usage
COMMENT ON COLUMN public.family_members.cpf IS 'CPF do membro (11 dígitos, apenas números). Usado para derivar senhas de arquivos bancários protegidos.';
COMMENT ON COLUMN public.family_members.birth_date IS 'Data de nascimento. Usado para derivar senhas de arquivos bancários protegidos.';

-- Create a table to store learned category rules per family
CREATE TABLE IF NOT EXISTS public.import_category_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  match_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, keyword)
);

-- Enable RLS on import_category_rules
ALTER TABLE public.import_category_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_category_rules
CREATE POLICY "Members can view their family rules"
ON public.import_category_rules
FOR SELECT
USING (is_family_member(family_id));

CREATE POLICY "Members can create rules"
ON public.import_category_rules
FOR INSERT
WITH CHECK (is_family_member(family_id));

CREATE POLICY "Members can update their family rules"
ON public.import_category_rules
FOR UPDATE
USING (is_family_member(family_id));

CREATE POLICY "Members can delete their family rules"
ON public.import_category_rules
FOR DELETE
USING (is_family_member(family_id));

-- Add trigger for updated_at
CREATE TRIGGER update_import_category_rules_updated_at
BEFORE UPDATE ON public.import_category_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update imports table to support new status flow
-- (status already exists as text, we just need to ensure our new statuses work)

-- Add a table to track pending import transactions before confirmation
CREATE TABLE IF NOT EXISTS public.import_pending_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  original_date DATE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT,
  category_id TEXT NOT NULL DEFAULT 'desconhecidas',
  subcategory_id TEXT,
  suggested_category_id TEXT,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  duplicate_transaction_id UUID,
  confidence_score NUMERIC,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_pending_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view pending transactions"
ON public.import_pending_transactions
FOR SELECT
USING (is_family_member(family_id));

CREATE POLICY "Members can create pending transactions"
ON public.import_pending_transactions
FOR INSERT
WITH CHECK (is_family_member(family_id));

CREATE POLICY "Members can update pending transactions"
ON public.import_pending_transactions
FOR UPDATE
USING (is_family_member(family_id));

CREATE POLICY "Members can delete pending transactions"
ON public.import_pending_transactions
FOR DELETE
USING (is_family_member(family_id));

-- Create index for import lookup
CREATE INDEX IF NOT EXISTS idx_import_pending_transactions_import_id 
ON public.import_pending_transactions(import_id);

-- Add policy for imports deletion (was missing)
CREATE POLICY "Members can delete their family imports"
ON public.imports
FOR DELETE
USING (is_family_member(family_id));