-- Add profession column to family_members table
ALTER TABLE public.family_members
ADD COLUMN IF NOT EXISTS profession TEXT;