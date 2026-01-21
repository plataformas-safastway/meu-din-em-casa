-- Drop the old status check constraint and create a new one with all valid statuses
ALTER TABLE public.imports DROP CONSTRAINT IF EXISTS imports_status_check;

ALTER TABLE public.imports ADD CONSTRAINT imports_status_check 
CHECK (status IN ('pending', 'processing', 'reviewing', 'completed', 'failed', 'cancelled', 'expired', 'review_needed'));