-- =============================================
-- RATE LIMITING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count int NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (service role only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access
-- (Edge functions use service role)

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Cleanup function for expired entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE reset_at < now();
END;
$$;