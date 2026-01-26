-- ================================================
-- LGPD Data Deletion Request System
-- ================================================

-- Create enum for request status
CREATE TYPE lgpd_request_status AS ENUM (
  'PENDING',           -- Request received, waiting processing
  'PROCESSING',        -- Being processed
  'COMPLETED',         -- Successfully completed
  'CANCELLED'          -- Cancelled by user or admin
);

-- Create table for LGPD deletion requests
CREATE TABLE public.lgpd_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  
  -- Request details
  status lgpd_request_status NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Processing info
  processed_at TIMESTAMPTZ,
  processed_by UUID, -- Admin who processed it (for auditing)
  deadline_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  
  -- Completion info
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  -- Anonymized data retained (for audit)
  anonymized_data_hash TEXT, -- SHA256 hash for reference
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for LGPD verification codes (OTP)
CREATE TABLE public.lgpd_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lgpd_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lgpd_deletion_requests
-- Users can view their own requests
CREATE POLICY "lgpd_deletion_requests_select_own"
ON public.lgpd_deletion_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No direct insert/update/delete from client - edge function only
CREATE POLICY "lgpd_deletion_requests_insert_deny"
ON public.lgpd_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "lgpd_deletion_requests_update_deny"
ON public.lgpd_deletion_requests
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "lgpd_deletion_requests_delete_deny"
ON public.lgpd_deletion_requests
FOR DELETE
TO authenticated
USING (false);

-- Admin/CS can view all requests (for dashboard)
CREATE POLICY "lgpd_deletion_requests_select_admin"
ON public.lgpd_deletion_requests
FOR SELECT
TO authenticated
USING (
  public.has_cs_access(auth.uid()) OR
  public.has_support_access(auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for lgpd_verification_codes
-- Users can only view their own unexpired codes
CREATE POLICY "lgpd_verification_codes_select_own"
ON public.lgpd_verification_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND expires_at > now() AND used_at IS NULL);

-- No direct client access - edge function only
CREATE POLICY "lgpd_verification_codes_deny_all"
ON public.lgpd_verification_codes
FOR ALL
TO authenticated
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_lgpd_deletion_requests_updated_at
  BEFORE UPDATE ON public.lgpd_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user has pending deletion request
CREATE OR REPLACE FUNCTION public.has_pending_lgpd_request(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lgpd_deletion_requests
    WHERE user_id = _user_id
    AND status IN ('PENDING', 'PROCESSING')
  )
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.has_pending_lgpd_request(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.has_pending_lgpd_request(UUID) FROM anon;

-- Create index for performance
CREATE INDEX idx_lgpd_deletion_requests_user_id ON public.lgpd_deletion_requests(user_id);
CREATE INDEX idx_lgpd_deletion_requests_status ON public.lgpd_deletion_requests(status);
CREATE INDEX idx_lgpd_deletion_requests_deadline ON public.lgpd_deletion_requests(deadline_at);
CREATE INDEX idx_lgpd_verification_codes_user_expires ON public.lgpd_verification_codes(user_id, expires_at);

-- Cleanup function for expired verification codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_lgpd_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.lgpd_verification_codes
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;