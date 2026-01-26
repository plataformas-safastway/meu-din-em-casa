-- =============================================================
-- LGPD GOVERNANCE PART 1: Add new roles to app_role enum
-- =============================================================
-- Note: These will be available in the next transaction

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'legal';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tecnologia';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suporte';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretoria';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestao_estrategica';