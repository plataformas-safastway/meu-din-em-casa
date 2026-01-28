
-- Remove the overly permissive INSERT policy
DROP POLICY IF EXISTS "families_insert" ON public.families;

-- Keep the restrictive policies that block direct inserts
-- "No direct family inserts" with WITH CHECK (false) already blocks
-- "families_insert_denied_for_clients" with WITH CHECK (false) already blocks

-- Consolidate into a single clear deny policy
DROP POLICY IF EXISTS "families_insert_denied_for_clients" ON public.families;

-- Keep only one explicit deny policy with clear name
-- The "No direct family inserts" policy already handles this
