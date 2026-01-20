-- Add phone columns to family_members for E.164 phone storage
ALTER TABLE public.family_members
ADD COLUMN IF NOT EXISTS phone_e164 text,
ADD COLUMN IF NOT EXISTS phone_country text DEFAULT 'BR';

-- Add comment for documentation
COMMENT ON COLUMN public.family_members.phone_e164 IS 'Phone number in E.164 format (e.g., +5548999999999)';
COMMENT ON COLUMN public.family_members.phone_country IS 'ISO 3166-1 alpha-2 country code (e.g., BR, US)';