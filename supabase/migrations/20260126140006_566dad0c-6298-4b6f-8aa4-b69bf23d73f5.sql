-- =============================================
-- SECURE audit_logs TABLE (fixed)
-- =============================================

-- Create secure policy: users can only read logs from their own families
CREATE POLICY "Family members can read audit logs (safe)"
ON public.audit_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- User can see their own actions
    user_id = auth.uid()
    OR
    -- User can see logs from families they belong to
    (
      family_id IS NOT NULL
      AND public.user_shares_family_with(auth.uid(), family_id)
    )
  )
);

-- Create safe view for frontend (redacted metadata)
CREATE OR REPLACE VIEW public.audit_logs_safe
WITH (security_invoker = on)
AS
SELECT
  id,
  family_id,
  created_at,
  action,
  entity_type,
  entity_id,
  module,
  severity,
  user_id AS actor_user_id,
  -- Redacted metadata: only safe fields, no sensitive data
  CASE 
    WHEN metadata IS NOT NULL THEN
      jsonb_build_object(
        'field', COALESCE(metadata->'field', 'null'::jsonb),
        'changed_fields', COALESCE(metadata->'changed_fields', '[]'::jsonb)
      )
    ELSE NULL
  END AS metadata_safe
FROM public.audit_logs;

-- Allow INSERT for authenticated users (for logging actions)
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);