-- Add new onboarding fields to families table for intelligent budget generation
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS income_anchor_value numeric,
ADD COLUMN IF NOT EXISTS income_type text,
ADD COLUMN IF NOT EXISTS financial_stage text,
ADD COLUMN IF NOT EXISTS budget_mode text,
ADD COLUMN IF NOT EXISTS household_structure text,
ADD COLUMN IF NOT EXISTS non_monthly_planning_level text;

-- Add comment for documentation
COMMENT ON COLUMN public.families.income_anchor_value IS 'Refined income value from onboarding subband selection (LGPD: only used for calculations)';
COMMENT ON COLUMN public.families.income_type IS 'Income stability type: fixed, mostly_fixed, mostly_variable, fully_variable, patrimonial, irregular';
COMMENT ON COLUMN public.families.financial_stage IS 'Current financial stage: limit, no_surplus, some_surplus, organized, patrimony';
COMMENT ON COLUMN public.families.budget_mode IS 'Budget objective mode: comfort, tranquility, security, optimization, quality, preservation';
COMMENT ON COLUMN public.families.household_structure IS 'Household composition: alone, couple_no_kids, couple_with_kids, single_parent, other_dependents';
COMMENT ON COLUMN public.families.non_monthly_planning_level IS 'Level of non-monthly expense planning: most, some, almost_never, never';

-- Add onboarding completion tracking to user_onboarding
ALTER TABLE public.user_onboarding
ADD COLUMN IF NOT EXISTS onboarding_wizard_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS suggested_budget_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS ai_budget_generated_at timestamptz;

-- Create table to log onboarding responses for analytics (without sensitive data)
CREATE TABLE IF NOT EXISTS public.onboarding_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  response_key text NOT NULL,
  response_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on onboarding_responses
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding_responses
CREATE POLICY "Users can view their family onboarding responses" 
ON public.onboarding_responses 
FOR SELECT 
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create onboarding responses for their family" 
ON public.onboarding_responses 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid()
  )
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_family ON public.onboarding_responses(family_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user ON public.onboarding_responses(user_id);