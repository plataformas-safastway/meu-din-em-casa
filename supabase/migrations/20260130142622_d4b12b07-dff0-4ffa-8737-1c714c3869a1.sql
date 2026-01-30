-- ============================================================
-- LGPD ENCRYPTION HARDENING: CPF and phone_e164 at-rest encryption
-- Using pgcrypto with AES-256 symmetric encryption
-- ============================================================

-- STEP 1: Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 2: Add encrypted columns to family_member_private
ALTER TABLE public.family_member_private
  ADD COLUMN IF NOT EXISTS cpf_enc bytea,
  ADD COLUMN IF NOT EXISTS phone_e164_enc bytea;

-- STEP 3: Utility functions for encryption/decryption
-- Get encryption key from GUC (set via environment/secret)
CREATE OR REPLACE FUNCTION public.app_get_enc_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE k text;
BEGIN
  k := current_setting('app.enc_key', true);
  IF k IS NULL OR length(k) < 16 THEN
    RAISE EXCEPTION 'Encryption key not configured or too short';
  END IF;
  RETURN k;
END $$;

-- Encrypt text to bytea
CREATE OR REPLACE FUNCTION public.app_encrypt_text(p_text text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_text IS NULL OR length(p_text) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_encrypt(p_text, public.app_get_enc_key(), 'compress-algo=1,cipher-algo=aes256');
END $$;

-- Decrypt bytea to text
CREATE OR REPLACE FUNCTION public.app_decrypt_text(p_enc bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_enc IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(p_enc, public.app_get_enc_key())::text;
END $$;

-- STEP 4: Backfill - encrypt existing plaintext data (idempotent)
UPDATE public.family_member_private
SET cpf_enc = public.app_encrypt_text(cpf)
WHERE cpf IS NOT NULL AND cpf_enc IS NULL;

UPDATE public.family_member_private
SET phone_e164_enc = public.app_encrypt_text(phone_e164)
WHERE phone_e164 IS NOT NULL AND phone_e164_enc IS NULL;

-- Clear plaintext after encryption
UPDATE public.family_member_private
SET cpf = NULL
WHERE cpf IS NOT NULL;

UPDATE public.family_member_private
SET phone_e164 = NULL
WHERE phone_e164 IS NOT NULL;

-- STEP 5: Trigger to auto-encrypt on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.trg_encrypt_family_member_private()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt CPF if provided in plaintext
  IF NEW.cpf IS NOT NULL AND length(NEW.cpf) > 0 THEN
    NEW.cpf_enc := public.app_encrypt_text(NEW.cpf);
    NEW.cpf := NULL;
  END IF;

  -- Encrypt phone_e164 if provided in plaintext
  IF NEW.phone_e164 IS NOT NULL AND length(NEW.phone_e164) > 0 THEN
    NEW.phone_e164_enc := public.app_encrypt_text(NEW.phone_e164);
    NEW.phone_e164 := NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS encrypt_family_member_private ON public.family_member_private;
CREATE TRIGGER encrypt_family_member_private
BEFORE INSERT OR UPDATE ON public.family_member_private
FOR EACH ROW EXECUTE FUNCTION public.trg_encrypt_family_member_private();

-- STEP 6: Secure RPC functions for decryption with authorization checks

-- RPC 1: Get own sensitive data (self-access)
CREATE OR REPLACE FUNCTION public.get_my_sensitive_private()
RETURNS TABLE (cpf text, phone_e164 text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    public.app_decrypt_text(fmp.cpf_enc),
    public.app_decrypt_text(fmp.phone_e164_enc)
  FROM public.family_member_private fmp
  WHERE fmp.user_id = auth.uid()
  LIMIT 1;
END $$;

-- RPC 2: Get family member's sensitive data (owner/self access)
CREATE OR REPLACE FUNCTION public.get_family_member_sensitive(p_family_member_id uuid)
RETURNS TABLE (cpf text, phone_e164 text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  target_family_id uuid;
  target_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get target member info
  SELECT fm.family_id, fm.user_id
  INTO target_family_id, target_user_id
  FROM public.family_members fm
  WHERE fm.id = p_family_member_id;

  IF target_family_id IS NULL THEN
    RAISE EXCEPTION 'Family member not found';
  END IF;

  -- Allow if caller is the target user
  IF target_user_id = auth.uid() THEN
    RETURN QUERY
    SELECT
      public.app_decrypt_text(fmp.cpf_enc),
      public.app_decrypt_text(fmp.phone_e164_enc)
    FROM public.family_member_private fmp
    WHERE fmp.family_member_id = p_family_member_id;
    RETURN;
  END IF;

  -- Allow if caller is ACTIVE owner of the same family
  IF EXISTS (
    SELECT 1 FROM public.family_members fm_owner
    WHERE fm_owner.family_id = target_family_id
      AND fm_owner.user_id = auth.uid()
      AND fm_owner.status = 'ACTIVE'
      AND fm_owner.role = 'owner'
  ) THEN
    RETURN QUERY
    SELECT
      public.app_decrypt_text(fmp.cpf_enc),
      public.app_decrypt_text(fmp.phone_e164_enc)
    FROM public.family_member_private fmp
    WHERE fmp.family_member_id = p_family_member_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Not authorized';
END $$;

-- STEP 7: Grants - revoke from anon/public, grant to authenticated
REVOKE ALL ON FUNCTION public.app_get_enc_key() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_encrypt_text(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_decrypt_text(bytea) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_sensitive_private() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_family_member_sensitive(uuid) FROM PUBLIC, anon;

-- Only authenticated users can call the RPC functions
GRANT EXECUTE ON FUNCTION public.get_my_sensitive_private() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_member_sensitive(uuid) TO authenticated;