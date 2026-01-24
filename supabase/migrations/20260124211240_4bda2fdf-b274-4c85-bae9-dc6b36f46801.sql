-- Fix security warnings: set search_path for functions
CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress(onboarding_row user_onboarding)
RETURNS INTEGER AS $$
DECLARE
  total_steps INTEGER := 6;
  completed_steps INTEGER := 0;
BEGIN
  IF onboarding_row.step_account_created_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_bank_account_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_import_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_budget_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_goal_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_family_invite_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  
  RETURN ROUND((completed_steps::DECIMAL / total_steps) * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_onboarding_progress()
RETURNS TRIGGER AS $$
BEGIN
  NEW.progress_percent := public.calculate_onboarding_progress(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add admin policy for education_content management (not just SELECT)
CREATE POLICY "Admins can manage education content" 
ON public.education_content 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));