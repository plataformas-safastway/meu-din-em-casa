-- Add income_subband column to families table
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS income_subband TEXT;

-- Add has_pets and has_dependents columns for budget adjustments
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS has_pets BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_dependents BOOLEAN DEFAULT false;

-- Create table to track budget template applications
CREATE TABLE public.budget_template_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  income_band TEXT NOT NULL,
  income_subband TEXT NOT NULL,
  estimated_income_midpoint NUMERIC(12,2) NOT NULL,
  percentages_applied JSONB NOT NULL DEFAULT '{}',
  has_pets BOOLEAN DEFAULT false,
  has_dependents BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_by UUID,
  month_ref TEXT NOT NULL, -- YYYY-MM format
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, month_ref)
);

-- Enable RLS
ALTER TABLE public.budget_template_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_template_applications
CREATE POLICY "Family members can view their template applications"
ON public.budget_template_applications
FOR SELECT
USING (
  family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Family members can insert template applications"
ON public.budget_template_applications
FOR INSERT
WITH CHECK (
  family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Family members can update their template applications"
ON public.budget_template_applications
FOR UPDATE
USING (
  family_id IN (
    SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
  )
);

-- Add index for efficient queries
CREATE INDEX idx_budget_template_applications_family_month 
ON public.budget_template_applications(family_id, month_ref);

-- Add audit log entry for template application
COMMENT ON TABLE public.budget_template_applications IS 'Tracks when budget templates are applied to families based on income bands';