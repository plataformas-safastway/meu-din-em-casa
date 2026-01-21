-- Add expires_at column to imports table for automatic cleanup
ALTER TABLE public.imports 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours');

-- Update status enum values by updating existing statuses
UPDATE public.imports SET status = 'pending' WHERE status NOT IN ('pending', 'reviewing', 'completed', 'cancelled', 'failed', 'expired');

-- Create function to automatically expire old imports
CREATE OR REPLACE FUNCTION public.expire_old_imports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.imports
  SET status = 'expired'
  WHERE status IN ('pending', 'reviewing')
    AND expires_at < now();
    
  -- Delete pending transactions for expired imports
  DELETE FROM public.import_pending_transactions
  WHERE import_id IN (
    SELECT id FROM public.imports WHERE status = 'expired'
  );
END;
$$;

-- Create index for faster lookups of pending imports
CREATE INDEX IF NOT EXISTS idx_imports_family_status 
ON public.imports(family_id, status) 
WHERE status IN ('pending', 'reviewing');