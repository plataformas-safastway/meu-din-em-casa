-- =============================================
-- PROTECT alerts TABLE
-- =============================================
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read alerts" ON public.alerts;
DROP POLICY IF EXISTS "Anyone can read alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can read alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can update alerts" ON public.alerts;

CREATE POLICY "Family members can read alerts"
ON public.alerts
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = alerts.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

CREATE POLICY "Family members can insert alerts"
ON public.alerts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = alerts.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

CREATE POLICY "Family members can update alerts"
ON public.alerts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = alerts.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);