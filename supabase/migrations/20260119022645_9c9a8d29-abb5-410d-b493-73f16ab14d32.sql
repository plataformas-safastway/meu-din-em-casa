-- Create table for goal contributions history
CREATE TABLE public.goal_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  contributed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their family goal contributions" 
ON public.goal_contributions 
FOR SELECT 
USING (is_family_member(family_id));

CREATE POLICY "Users can create goal contributions for their family" 
ON public.goal_contributions 
FOR INSERT 
WITH CHECK (is_family_member(family_id));

CREATE POLICY "Users can update their family goal contributions" 
ON public.goal_contributions 
FOR UPDATE 
USING (is_family_member(family_id));

CREATE POLICY "Users can delete their family goal contributions" 
ON public.goal_contributions 
FOR DELETE 
USING (is_family_member(family_id));

-- Create index for performance
CREATE INDEX idx_goal_contributions_goal_id ON public.goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_family_id ON public.goal_contributions(family_id);