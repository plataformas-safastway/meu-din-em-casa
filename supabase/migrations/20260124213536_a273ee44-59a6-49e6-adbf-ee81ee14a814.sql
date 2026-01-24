-- =====================================================
-- PARTE 1: Adicionar novos perfis executivos ao enum
-- =====================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretoria';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestao_estrategica';