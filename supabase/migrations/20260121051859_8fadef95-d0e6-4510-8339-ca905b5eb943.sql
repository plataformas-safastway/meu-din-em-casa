-- ============================================
-- PASSWORD PATTERN LEARNING TABLE
-- For intelligent password detection based on CPF patterns
-- ============================================

-- Create cpf_password_patterns table
-- Stores learned password patterns per bank/document type combination
CREATE TABLE public.cpf_password_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  bank_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('bank_statement', 'credit_card')),
  cpf_pattern_length INTEGER NOT NULL CHECK (cpf_pattern_length >= 3 AND cpf_pattern_length <= 11),
  success_count INTEGER NOT NULL DEFAULT 1,
  last_success_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint per family/bank/document type
  CONSTRAINT unique_pattern_per_family_bank UNIQUE (family_id, bank_name, document_type)
);

-- Enable RLS
ALTER TABLE public.cpf_password_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view their family patterns"
ON public.cpf_password_patterns
FOR SELECT
USING (is_family_member(family_id));

CREATE POLICY "Members can create patterns"
ON public.cpf_password_patterns
FOR INSERT
WITH CHECK (is_family_member(family_id));

CREATE POLICY "Members can update their family patterns"
ON public.cpf_password_patterns
FOR UPDATE
USING (is_family_member(family_id));

CREATE POLICY "Members can delete their family patterns"
ON public.cpf_password_patterns
FOR DELETE
USING (is_family_member(family_id));

-- Trigger for updated_at
CREATE TRIGGER update_cpf_password_patterns_updated_at
BEFORE UPDATE ON public.cpf_password_patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DETECTED ACCOUNTS/CARDS TABLE
-- For auto-detection of account/card info from imports
-- ============================================

-- Create import_detected_sources table
-- Stores auto-detected bank accounts and credit cards from imports
CREATE TABLE public.import_detected_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  import_id UUID NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('bank_account', 'credit_card')),
  
  -- Detected info
  bank_name TEXT NOT NULL,
  agency TEXT,
  account_number TEXT,
  last4 TEXT,
  
  -- Matching status
  matched_source_id UUID, -- References bank_accounts or credit_cards if matched
  match_status TEXT NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending', 'matched', 'created', 'skipped')),
  user_confirmed BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_detected_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view detected sources"
ON public.import_detected_sources
FOR SELECT
USING (is_family_member(family_id));

CREATE POLICY "Members can create detected sources"
ON public.import_detected_sources
FOR INSERT
WITH CHECK (is_family_member(family_id));

CREATE POLICY "Members can update detected sources"
ON public.import_detected_sources
FOR UPDATE
USING (is_family_member(family_id));

CREATE POLICY "Members can delete detected sources"
ON public.import_detected_sources
FOR DELETE
USING (is_family_member(family_id));

-- Trigger for updated_at
CREATE TRIGGER update_import_detected_sources_updated_at
BEFORE UPDATE ON public.import_detected_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Add detected_bank column to imports table
-- ============================================

ALTER TABLE public.imports 
ADD COLUMN IF NOT EXISTS detected_bank TEXT,
ADD COLUMN IF NOT EXISTS detected_document_type TEXT,
ADD COLUMN IF NOT EXISTS password_pattern_used INTEGER,
ADD COLUMN IF NOT EXISTS auto_detected BOOLEAN DEFAULT false;