-- =====================================================
-- MÓDULO DE CUSTOMER SUCCESS - PARTE 1: ENUM
-- =====================================================

-- Add 'customer_success' role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer_success';