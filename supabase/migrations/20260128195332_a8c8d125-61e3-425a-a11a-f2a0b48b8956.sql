-- Create ENUM types for expense nature
CREATE TYPE public.expense_nature AS ENUM ('FIXED', 'VARIABLE', 'EVENTUAL', 'UNKNOWN');
CREATE TYPE public.expense_nature_source AS ENUM ('USER', 'SYSTEM_RULE', 'AI_INFERENCE');

-- Add expense nature columns to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS expense_nature public.expense_nature DEFAULT 'UNKNOWN',
ADD COLUMN IF NOT EXISTS expense_nature_source public.expense_nature_source;

-- Create table to track monthly fixed costs history
CREATE TABLE public.monthly_fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  month_ref VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  total_fixed_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_breakdown JSONB DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, month_ref)
);

-- Enable RLS
ALTER TABLE public.monthly_fixed_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly_fixed_costs
CREATE POLICY "Users can view their family fixed costs"
ON public.monthly_fixed_costs
FOR SELECT
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND status = 'ACTIVE'
  )
);

CREATE POLICY "Users can insert their family fixed costs"
ON public.monthly_fixed_costs
FOR INSERT
WITH CHECK (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND status = 'ACTIVE'
  )
);

CREATE POLICY "Users can update their family fixed costs"
ON public.monthly_fixed_costs
FOR UPDATE
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND status = 'ACTIVE'
  )
);

-- Create table for expense nature overrides (user corrections)
CREATE TABLE public.expense_nature_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id VARCHAR(100),
  subcategory_id VARCHAR(100),
  merchant_key VARCHAR(255),
  expense_nature public.expense_nature NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_nature_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_nature_overrides
CREATE POLICY "Users can view their family overrides"
ON public.expense_nature_overrides
FOR SELECT
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND status = 'ACTIVE'
  )
);

CREATE POLICY "Users can manage their family overrides"
ON public.expense_nature_overrides
FOR ALL
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND status = 'ACTIVE'
  )
);

-- Create index for performance
CREATE INDEX idx_transactions_expense_nature ON public.transactions(expense_nature);
CREATE INDEX idx_transactions_family_expense_nature ON public.transactions(family_id, expense_nature);
CREATE INDEX idx_monthly_fixed_costs_family_month ON public.monthly_fixed_costs(family_id, month_ref);
CREATE INDEX idx_expense_nature_overrides_family ON public.expense_nature_overrides(family_id);
CREATE INDEX idx_expense_nature_overrides_lookup ON public.expense_nature_overrides(family_id, category_id, subcategory_id);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_fixed_costs_updated_at
BEFORE UPDATE ON public.monthly_fixed_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_nature_overrides_updated_at
BEFORE UPDATE ON public.expense_nature_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();