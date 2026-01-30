-- Fix overly permissive RLS policy for ai_error_events
-- Replace WITH CHECK (true) with a more specific condition

DROP POLICY IF EXISTS "Sistema pode registrar erros" ON public.ai_error_events;

-- Allow insert if user is authenticated OR if being inserted via service role
-- The service role bypasses RLS anyway, so this is for edge function calls
CREATE POLICY "Authenticated users or system can register errors"
  ON public.ai_error_events FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );