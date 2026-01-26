-- Add additional detection columns to imports table for premium intelligence features
ALTER TABLE public.imports
ADD COLUMN IF NOT EXISTS detected_agency text,
ADD COLUMN IF NOT EXISTS detected_account text,
ADD COLUMN IF NOT EXISTS detected_last4 text,
ADD COLUMN IF NOT EXISTS confidence_level text DEFAULT 'HIGH';

-- Add comment for documentation
COMMENT ON COLUMN public.imports.detected_agency IS 'Auto-detected bank agency number from statement';
COMMENT ON COLUMN public.imports.detected_account IS 'Auto-detected account number from statement';
COMMENT ON COLUMN public.imports.detected_last4 IS 'Auto-detected last 4 digits of credit card';
COMMENT ON COLUMN public.imports.confidence_level IS 'Detection confidence: HIGH, MEDIUM, LOW';