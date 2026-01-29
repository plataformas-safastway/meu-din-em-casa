-- ========================================
-- Missing Recurring Expense Detection System
-- ========================================

-- Table to store user confirmations about missing recurring expenses
CREATE TABLE public.recurring_expense_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  month_ref TEXT NOT NULL, -- Format: YYYY-MM (e.g., "2026-01")
  confirmation_type TEXT NOT NULL CHECK (confirmation_type IN ('no_payment', 'registered', 'ignored')),
  confirmed_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one confirmation per category/subcategory/month combination per family
  UNIQUE(family_id, category_id, subcategory_id, month_ref)
);

-- Enable RLS
ALTER TABLE public.recurring_expense_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view their family's confirmations"
  ON public.recurring_expense_confirmations
  FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can insert confirmations for their family"
  ON public.recurring_expense_confirmations
  FOR INSERT
  WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Members can update their family's confirmations"
  ON public.recurring_expense_confirmations
  FOR UPDATE
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can delete their family's confirmations"
  ON public.recurring_expense_confirmations
  FOR DELETE
  USING (public.is_family_member(family_id));

-- Revoke anon access
REVOKE ALL ON public.recurring_expense_confirmations FROM anon;

-- Index for efficient queries
CREATE INDEX idx_recurring_confirmations_family_month 
  ON public.recurring_expense_confirmations(family_id, month_ref);

CREATE INDEX idx_recurring_confirmations_lookup 
  ON public.recurring_expense_confirmations(family_id, category_id, subcategory_id, month_ref);

-- Table to cache detected recurring patterns (updated periodically)
CREATE TABLE public.detected_recurring_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('monthly', 'bimonthly', 'quarterly', 'yearly')),
  average_amount NUMERIC(12,2) NOT NULL,
  occurrence_count INTEGER NOT NULL,
  last_occurrence_date DATE NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One pattern per category/subcategory per family
  UNIQUE(family_id, category_id, subcategory_id)
);

-- Enable RLS
ALTER TABLE public.detected_recurring_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view their family's patterns"
  ON public.detected_recurring_patterns
  FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can insert patterns for their family"
  ON public.detected_recurring_patterns
  FOR INSERT
  WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Members can update their family's patterns"
  ON public.detected_recurring_patterns
  FOR UPDATE
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can delete their family's patterns"
  ON public.detected_recurring_patterns
  FOR DELETE
  USING (public.is_family_member(family_id));

-- Revoke anon access
REVOKE ALL ON public.detected_recurring_patterns FROM anon;

-- Index for efficient queries
CREATE INDEX idx_recurring_patterns_family 
  ON public.detected_recurring_patterns(family_id);

CREATE INDEX idx_recurring_patterns_active 
  ON public.detected_recurring_patterns(family_id, is_active) WHERE is_active = true;

-- Add trigger for updated_at
CREATE TRIGGER update_detected_recurring_patterns_updated_at
  BEFORE UPDATE ON public.detected_recurring_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();