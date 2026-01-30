-- =========================================
-- OIK LGPD Hardening: Sensitive Data Isolation
-- Creates family_member_private for PII separation
-- =========================================

-- 1) Create private table for sensitive data
CREATE TABLE IF NOT EXISTS public.family_member_private (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cpf text,
  birth_date date,
  phone_e164 text,
  phone_country text,
  profession text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_member_id)
);

-- 2) Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_family_member_private_user_id 
  ON public.family_member_private(user_id);
CREATE INDEX IF NOT EXISTS idx_family_member_private_family_member_id 
  ON public.family_member_private(family_member_id);

-- 3) Backfill: migrate existing sensitive data (idempotent)
INSERT INTO public.family_member_private (family_member_id, user_id, cpf, birth_date, phone_e164, phone_country, profession)
SELECT 
  fm.id,
  fm.user_id,
  fm.cpf,
  fm.birth_date,
  fm.phone_e164,
  fm.phone_country,
  fm.profession
FROM public.family_members fm
WHERE NOT EXISTS (
  SELECT 1 FROM public.family_member_private fmp 
  WHERE fmp.family_member_id = fm.id
);

-- 4) Clear sensitive data from public table (set to NULL)
UPDATE public.family_members
SET 
  cpf = NULL,
  birth_date = NULL,
  phone_e164 = NULL,
  phone_country = NULL,
  profession = NULL
WHERE cpf IS NOT NULL 
   OR birth_date IS NOT NULL 
   OR phone_e164 IS NOT NULL 
   OR phone_country IS NOT NULL 
   OR profession IS NOT NULL;

-- 5) Revoke all access from anon/public
REVOKE ALL ON public.family_member_private FROM anon, public;

-- 6) Enable and force RLS
ALTER TABLE public.family_member_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_member_private FORCE ROW LEVEL SECURITY;

-- 7) Drop any existing policies (clean slate)
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'family_member_private'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.family_member_private;', p.policyname);
  END LOOP;
END $$;

-- 8) RLS Policies

-- 8a) SELECT: User can read their own sensitive data
CREATE POLICY "fmp_select_own"
ON public.family_member_private
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 8b) SELECT: Family owner can read all family members' sensitive data
CREATE POLICY "fmp_select_family_owner"
ON public.family_member_private
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members target_fm
    JOIN public.family_members owner_fm 
      ON owner_fm.family_id = target_fm.family_id
    WHERE target_fm.id = family_member_private.family_member_id
      AND owner_fm.user_id = auth.uid()
      AND owner_fm.role = 'owner'
      AND owner_fm.status = 'ACTIVE'
  )
);

-- 8c) INSERT: User can insert their own OR owner can insert for family
CREATE POLICY "fmp_insert_own_or_owner"
ON public.family_member_private
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM public.family_members target_fm
    JOIN public.family_members owner_fm 
      ON owner_fm.family_id = target_fm.family_id
    WHERE target_fm.id = family_member_private.family_member_id
      AND owner_fm.user_id = auth.uid()
      AND owner_fm.role = 'owner'
      AND owner_fm.status = 'ACTIVE'
  )
);

-- 8d) UPDATE: User can update their own OR owner can update for family
CREATE POLICY "fmp_update_own_or_owner"
ON public.family_member_private
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM public.family_members target_fm
    JOIN public.family_members owner_fm 
      ON owner_fm.family_id = target_fm.family_id
    WHERE target_fm.id = family_member_private.family_member_id
      AND owner_fm.user_id = auth.uid()
      AND owner_fm.role = 'owner'
      AND owner_fm.status = 'ACTIVE'
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM public.family_members target_fm
    JOIN public.family_members owner_fm 
      ON owner_fm.family_id = target_fm.family_id
    WHERE target_fm.id = family_member_private.family_member_id
      AND owner_fm.user_id = auth.uid()
      AND owner_fm.role = 'owner'
      AND owner_fm.status = 'ACTIVE'
  )
);

-- 8e) DELETE: Only owner can delete (or cascade from family_members)
CREATE POLICY "fmp_delete_owner"
ON public.family_member_private
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members target_fm
    JOIN public.family_members owner_fm 
      ON owner_fm.family_id = target_fm.family_id
    WHERE target_fm.id = family_member_private.family_member_id
      AND owner_fm.user_id = auth.uid()
      AND owner_fm.role = 'owner'
      AND owner_fm.status = 'ACTIVE'
  )
);

-- 9) Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_family_member_private_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_family_member_private_updated_at ON public.family_member_private;
CREATE TRIGGER trg_family_member_private_updated_at
  BEFORE UPDATE ON public.family_member_private
  FOR EACH ROW
  EXECUTE FUNCTION public.update_family_member_private_updated_at();

-- 10) Comment for documentation
COMMENT ON TABLE public.family_member_private IS 'LGPD: Stores sensitive PII (CPF, birth_date, phone) with restricted RLS. Only the user themselves or the family owner can access.';