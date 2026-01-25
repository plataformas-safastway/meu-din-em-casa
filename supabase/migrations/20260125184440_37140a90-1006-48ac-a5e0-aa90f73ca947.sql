-- Create transaction_privacy table for sensitive expenses
CREATE TABLE IF NOT EXISTS public.transaction_privacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  reveal_at TIMESTAMP WITH TIME ZONE,
  revealed_at TIMESTAMP WITH TIME ZONE,
  reason TEXT, -- Private reason, only visible to creator
  source TEXT NOT NULL DEFAULT 'OPEN_FINANCE' CHECK (source IN ('OPEN_FINANCE', 'PLUGGY')),
  max_privacy_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(transaction_id)
);

-- Enable RLS
ALTER TABLE public.transaction_privacy ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view privacy status for their family transactions
CREATE POLICY "Users can view family transaction privacy" 
ON public.transaction_privacy 
FOR SELECT 
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Only the creator can insert privacy settings
CREATE POLICY "Creator can insert transaction privacy" 
ON public.transaction_privacy 
FOR INSERT 
WITH CHECK (
  created_by_user_id = auth.uid() AND
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Only the creator can update their privacy settings
CREATE POLICY "Creator can update own transaction privacy" 
ON public.transaction_privacy 
FOR UPDATE 
USING (created_by_user_id = auth.uid());

-- Policy: Only the creator can delete their privacy settings
CREATE POLICY "Creator can delete own transaction privacy" 
ON public.transaction_privacy 
FOR DELETE 
USING (created_by_user_id = auth.uid());

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_transaction_privacy_family 
ON public.transaction_privacy(family_id, is_private);

CREATE INDEX IF NOT EXISTS idx_transaction_privacy_reveal 
ON public.transaction_privacy(reveal_at) 
WHERE is_private = true AND reveal_at IS NOT NULL;

-- Add source column to transactions if not exists (to track Open Finance origin)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS import_source TEXT CHECK (import_source IS NULL OR import_source IN ('manual', 'import', 'open_finance', 'pluggy'));

-- Function to auto-reveal expired privacy
CREATE OR REPLACE FUNCTION public.auto_reveal_expired_privacy()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.transaction_privacy
  SET 
    is_private = false,
    revealed_at = now(),
    updated_at = now()
  WHERE is_private = true
    AND (
      -- Reveal if scheduled date passed
      (reveal_at IS NOT NULL AND reveal_at <= now())
      OR
      -- Reveal if max privacy days exceeded
      (created_at + (max_privacy_days || ' days')::INTERVAL) <= now()
    );
END;
$$;

-- Function to check if transaction is private for a specific user
CREATE OR REPLACE FUNCTION public.is_transaction_private_for_user(_transaction_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- If user is the creator, they see everything
    WHEN EXISTS (
      SELECT 1 FROM transaction_privacy 
      WHERE transaction_id = _transaction_id 
        AND created_by_user_id = _user_id
    ) THEN false
    -- If no privacy record exists, not private
    WHEN NOT EXISTS (
      SELECT 1 FROM transaction_privacy 
      WHERE transaction_id = _transaction_id
    ) THEN false
    -- Otherwise check if still private
    ELSE COALESCE(
      (SELECT is_private FROM transaction_privacy WHERE transaction_id = _transaction_id),
      false
    )
  END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_transaction_privacy_updated_at
BEFORE UPDATE ON public.transaction_privacy
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();