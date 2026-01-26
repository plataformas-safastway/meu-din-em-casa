-- 1) Ensure RLS is enabled
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- 2) Drop any existing permissive policies
DROP POLICY IF EXISTS "Public read credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Anyone can read credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Public can read credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Family members can read credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Family members can insert credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Family members can update credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Family members can delete credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Owner/Admin can update credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Owner/Admin can delete credit cards" ON public.credit_cards;

-- 3) SELECT - Only active family members can read their family's credit cards
CREATE POLICY "Family members can read credit cards"
ON public.credit_cards
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

-- 4) INSERT - Only active family members can create credit cards for their family
CREATE POLICY "Family members can insert credit cards"
ON public.credit_cards
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

-- 5) UPDATE - Only owners or members with edit permission
CREATE POLICY "Permitted members can update credit cards"
ON public.credit_cards
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_edit_all, false) = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_edit_all, false) = true)
  )
);

-- 6) DELETE - Only owners or members with delete permission
CREATE POLICY "Permitted members can delete credit cards"
ON public.credit_cards
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_delete_transactions, false) = true)
  )
);