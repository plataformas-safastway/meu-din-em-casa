-- =============================================
-- FIX SECURITY: Replace FOR ALL policies with specific operations
-- =============================================

-- Drop overly permissive "FOR ALL" policies
DROP POLICY IF EXISTS "CS can manage behavior signals" ON public.cs_behavior_signals;
DROP POLICY IF EXISTS "CS can manage AI suggestions" ON public.cs_ai_suggestions;
DROP POLICY IF EXISTS "CS can manage automation rules" ON public.cs_automation_rules;
DROP POLICY IF EXISTS "CS can manage automation executions" ON public.cs_automation_executions;

-- Create specific operation policies for cs_behavior_signals
CREATE POLICY "CS can insert behavior signals"
ON public.cs_behavior_signals FOR INSERT
TO authenticated
WITH CHECK (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can update behavior signals"
ON public.cs_behavior_signals FOR UPDATE
TO authenticated
USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can delete behavior signals"
ON public.cs_behavior_signals FOR DELETE
TO authenticated
USING (public.has_cs_access(auth.uid()));

-- Create specific operation policies for cs_ai_suggestions
CREATE POLICY "CS can insert AI suggestions"
ON public.cs_ai_suggestions FOR INSERT
TO authenticated
WITH CHECK (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can update AI suggestions"
ON public.cs_ai_suggestions FOR UPDATE
TO authenticated
USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can delete AI suggestions"
ON public.cs_ai_suggestions FOR DELETE
TO authenticated
USING (public.has_cs_access(auth.uid()));

-- Create specific operation policies for cs_automation_rules
CREATE POLICY "CS can insert automation rules"
ON public.cs_automation_rules FOR INSERT
TO authenticated
WITH CHECK (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can update automation rules"
ON public.cs_automation_rules FOR UPDATE
TO authenticated
USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can delete automation rules"
ON public.cs_automation_rules FOR DELETE
TO authenticated
USING (public.has_cs_access(auth.uid()));

-- Create specific operation policies for cs_automation_executions
CREATE POLICY "CS can insert automation executions"
ON public.cs_automation_executions FOR INSERT
TO authenticated
WITH CHECK (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can update automation executions"
ON public.cs_automation_executions FOR UPDATE
TO authenticated
USING (public.has_cs_access(auth.uid()));

-- No delete for executions (immutable audit log)
