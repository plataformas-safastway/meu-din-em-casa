-- Add structured error code to imports (and import_history for analytics)
ALTER TABLE public.imports
ADD COLUMN IF NOT EXISTS error_code TEXT;

ALTER TABLE public.import_history
ADD COLUMN IF NOT EXISTS error_code TEXT;
