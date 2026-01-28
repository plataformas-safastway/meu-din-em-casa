-- Add onboarding_status enum and column to user_onboarding table
-- This enforces that users must complete onboarding before accessing the main App

-- Create enum type for onboarding status
CREATE TYPE public.onboarding_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Add status column with default 'not_started'
ALTER TABLE public.user_onboarding 
ADD COLUMN status public.onboarding_status NOT NULL DEFAULT 'not_started';

-- Update existing records based on their onboarding state:
-- If onboarding_wizard_completed_at is set, mark as completed
-- If has_seen_welcome is true (meaning they started), mark as in_progress
UPDATE public.user_onboarding
SET status = 
  CASE 
    WHEN onboarding_wizard_completed_at IS NOT NULL THEN 'completed'::public.onboarding_status
    WHEN has_seen_welcome = true THEN 'in_progress'::public.onboarding_status
    ELSE 'not_started'::public.onboarding_status
  END;

-- Create index for faster queries on status
CREATE INDEX idx_user_onboarding_status ON public.user_onboarding(status);

-- Add comment for documentation
COMMENT ON COLUMN public.user_onboarding.status IS 'Tracks onboarding completion state. App access requires completed status.';