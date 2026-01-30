
-- ============================================================
-- SECURITY HARDENING MIGRATION - OIK Finance
-- Data: 2026-01-30
-- Objetivo: Blindar tabelas críticas contra acesso não autorizado
-- ============================================================

-- ============================================================
-- PASSO 2: REVOGAR GRANTS PERIGOSOS
-- ============================================================

-- Revogar TODOS os privilégios de anon e public nas tabelas críticas
REVOKE ALL ON public.families FROM anon, public;
REVOKE ALL ON public.family_members FROM anon, public;
REVOKE ALL ON public.credit_cards FROM anon, public;
REVOKE ALL ON public.user_subscriptions FROM anon, public;
REVOKE ALL ON public.admin_users FROM anon, public;

-- ============================================================
-- PASSO 3: family_members - BLINDAGEM PII
-- ============================================================
-- Problema: Scan detectou exposição de CPF, telefone, email, etc.
-- Solução: Garantir que apenas membros ACTIVE da mesma família vejam

-- Remover policies antigas se existirem (idempotente)
DROP POLICY IF EXISTS "family_members_select_family_scope" ON public.family_members;
DROP POLICY IF EXISTS "family_members_select_active" ON public.family_members;
DROP POLICY IF EXISTS "family_members_public_select" ON public.family_members;
DROP POLICY IF EXISTS "Anyone can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Family members are viewable by family" ON public.family_members;

-- Criar policy SELECT única e restritiva
CREATE POLICY "family_members_select_same_family_active"
ON public.family_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_members self
    WHERE self.family_id = family_members.family_id
      AND self.user_id = auth.uid()
      AND self.status = 'ACTIVE'
  )
);

-- Permitir CS/Admin ver para suporte (via admin_users)
CREATE POLICY "family_members_select_admin_support"
ON public.family_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  )
);

-- ============================================================
-- PASSO 4: credit_cards - CONSOLIDAR POLICIES
-- ============================================================
-- Problema: Múltiplas policies podem criar conflitos
-- As policies atuais estão OK, apenas garantir que não há exposição

-- As policies existentes já são restritivas para authenticated
-- Apenas garantir que não há policy para anon
DROP POLICY IF EXISTS "credit_cards_public_select" ON public.credit_cards;
DROP POLICY IF EXISTS "Anyone can view credit cards" ON public.credit_cards;

-- ============================================================
-- PASSO 5: user_subscriptions - DADOS DE PAGAMENTO
-- ============================================================
-- Policies atuais já estão corretas:
-- - user_subscriptions_select_owner_only (owner da família)
-- - user_subscriptions_select_admin_active (admin ativo)
-- Apenas garantir blindagem adicional

-- Remover qualquer policy pública que possa existir
DROP POLICY IF EXISTS "user_subscriptions_public_select" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Anyone can view subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select" ON public.user_subscriptions;

-- Policies de mutação (INSERT/UPDATE/DELETE) para admin apenas
DROP POLICY IF EXISTS "user_subscriptions_insert" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_delete" ON public.user_subscriptions;

CREATE POLICY "user_subscriptions_insert_admin_only"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  )
);

CREATE POLICY "user_subscriptions_update_admin_only"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  )
);

CREATE POLICY "user_subscriptions_delete_admin_only"
ON public.user_subscriptions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  )
);

-- ============================================================
-- PASSO 6: admin_users - DADOS SENSÍVEIS DE ADMIN
-- ============================================================
-- Problema: Policies permitem MASTER ver todos, mas self também é permitido
-- Isso está OK, mas vamos garantir que não há exposição pública

-- Remover qualquer policy pública
DROP POLICY IF EXISTS "admin_users_public_select" ON public.admin_users;
DROP POLICY IF EXISTS "Anyone can view admin users" ON public.admin_users;

-- As policies existentes estão OK:
-- admin_users_select_self: user_id = auth.uid()
-- admin_users_select_for_master: verifica se é MASTER ativo

-- ============================================================
-- VALIDAÇÃO: Garantir RLS está ENABLED e FORCED
-- ============================================================
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families FORCE ROW LEVEL SECURITY;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;

-- ============================================================
-- COMENTÁRIOS DE AUDITORIA
-- ============================================================
COMMENT ON POLICY "family_members_select_same_family_active" ON public.family_members IS 
  'Membros ACTIVE só veem outros membros da mesma família - protege PII';

COMMENT ON POLICY "family_members_select_admin_support" ON public.family_members IS 
  'Admins ativos podem ver membros para suporte - auditado via dashboard_audit_logs';

COMMENT ON POLICY "user_subscriptions_insert_admin_only" ON public.user_subscriptions IS 
  'Apenas admins ativos podem criar subscriptions';

COMMENT ON POLICY "user_subscriptions_update_admin_only" ON public.user_subscriptions IS 
  'Apenas admins ativos podem modificar subscriptions';

COMMENT ON POLICY "user_subscriptions_delete_admin_only" ON public.user_subscriptions IS 
  'Apenas admins ativos podem deletar subscriptions';
