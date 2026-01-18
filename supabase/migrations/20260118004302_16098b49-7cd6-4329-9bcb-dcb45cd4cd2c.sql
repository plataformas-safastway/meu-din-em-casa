-- Drop emergency_funds table
DROP TABLE IF EXISTS public.emergency_funds;

-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC CHECK (target_amount >= 0),
  current_amount NUMERIC DEFAULT 0 CHECK (current_amount >= 0),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Members can view goals"
ON public.goals
FOR SELECT
USING (is_family_member(family_id));

CREATE POLICY "Members can create goals"
ON public.goals
FOR INSERT
WITH CHECK (is_family_member(family_id));

CREATE POLICY "Members can update goals"
ON public.goals
FOR UPDATE
USING (is_family_member(family_id));

CREATE POLICY "Members can delete goals"
ON public.goals
FOR DELETE
USING (is_family_member(family_id));

-- Add trigger for updated_at
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();