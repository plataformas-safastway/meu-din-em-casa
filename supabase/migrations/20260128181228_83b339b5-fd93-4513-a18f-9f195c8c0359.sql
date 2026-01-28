-- Create enum for budget version source type (only if not exists)
DO $$ BEGIN
    CREATE TYPE public.budget_version_source_type AS ENUM ('onboarding_only', 'transactions_based');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for budget version status (only if not exists)
DO $$ BEGIN
    CREATE TYPE public.budget_version_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create budget_versions table
CREATE TABLE IF NOT EXISTS public.budget_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  source_type public.budget_version_source_type NOT NULL,
  effective_month TEXT NOT NULL,
  status public.budget_version_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  input_snapshot JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_active_version_per_family_month UNIQUE (family_id, effective_month, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create budget_version_items table
CREATE TABLE IF NOT EXISTS public.budget_version_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_version_id UUID NOT NULL REFERENCES public.budget_versions(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  suggested_amount NUMERIC NOT NULL,
  min_amount NUMERIC,
  max_amount NUMERIC,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_versions_family ON public.budget_versions(family_id);
CREATE INDEX IF NOT EXISTS idx_budget_versions_effective_month ON public.budget_versions(effective_month);
CREATE INDEX IF NOT EXISTS idx_budget_versions_status ON public.budget_versions(status);
CREATE INDEX IF NOT EXISTS idx_budget_versions_family_month_status ON public.budget_versions(family_id, effective_month, status);
CREATE INDEX IF NOT EXISTS idx_budget_version_items_version ON public.budget_version_items(budget_version_id);
CREATE INDEX IF NOT EXISTS idx_budget_version_items_category ON public.budget_version_items(category_id);

-- Enable RLS
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_version_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_versions (using ACTIVE uppercase)
CREATE POLICY "Family members can view their budget versions"
ON public.budget_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = budget_versions.family_id
    AND fm.user_id = auth.uid()
    AND fm.status = 'ACTIVE'
  )
);

CREATE POLICY "Family members can insert budget versions"
ON public.budget_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = budget_versions.family_id
    AND fm.user_id = auth.uid()
    AND fm.status = 'ACTIVE'
  )
);

CREATE POLICY "Family members can update their budget versions"
ON public.budget_versions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = budget_versions.family_id
    AND fm.user_id = auth.uid()
    AND fm.status = 'ACTIVE'
  )
);

-- RLS policies for budget_version_items
CREATE POLICY "Family members can view budget version items"
ON public.budget_version_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budget_versions bv
    JOIN public.family_members fm ON fm.family_id = bv.family_id
    WHERE bv.id = budget_version_items.budget_version_id
    AND fm.user_id = auth.uid()
    AND fm.status = 'ACTIVE'
  )
);

CREATE POLICY "Family members can insert budget version items"
ON public.budget_version_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.budget_versions bv
    JOIN public.family_members fm ON fm.family_id = bv.family_id
    WHERE bv.id = budget_version_items.budget_version_id
    AND fm.user_id = auth.uid()
    AND fm.status = 'ACTIVE'
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_budget_versions_updated_at
BEFORE UPDATE ON public.budget_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get active budget for a given month
CREATE OR REPLACE FUNCTION public.get_active_budget_for_month(
  p_family_id UUID,
  p_month TEXT
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.budget_versions
  WHERE family_id = p_family_id
    AND status = 'active'
    AND effective_month <= p_month
  ORDER BY effective_month DESC
  LIMIT 1;
$$;

-- Function to archive old active versions when creating new one
CREATE OR REPLACE FUNCTION public.archive_previous_budget_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.budget_versions
    SET status = 'archived', updated_at = now()
    WHERE family_id = NEW.family_id
      AND effective_month = NEW.effective_month
      AND status = 'active'
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_archive_previous_budget_versions
AFTER INSERT OR UPDATE ON public.budget_versions
FOR EACH ROW
EXECUTE FUNCTION public.archive_previous_budget_versions();