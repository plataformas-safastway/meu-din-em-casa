-- =============================================
-- PARTE 1: EXPANDIR ENUM DE ROLES
-- =============================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tecnologia';