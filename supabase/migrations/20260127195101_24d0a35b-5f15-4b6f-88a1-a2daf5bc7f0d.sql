-- =====================================================
-- PROBLEMA 1: bank_accounts - Proteção de dados bancários
-- =====================================================

-- Garantir que RLS está ativado
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que possam ser permissivas
DROP POLICY IF EXISTS "Users can view their family bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert bank accounts for their family" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update their family bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete their family bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Family members can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Family members can manage bank accounts" ON public.bank_accounts;

-- Criar políticas RLS seguras usando helper function existente
CREATE POLICY "Family members can view own bank accounts"
ON public.bank_accounts FOR SELECT
TO authenticated
USING (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Family members can insert own bank accounts"
ON public.bank_accounts FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Family members can update own bank accounts"
ON public.bank_accounts FOR UPDATE
TO authenticated
USING (public.user_belongs_to_family(auth.uid(), family_id))
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Family members can delete own bank accounts"
ON public.bank_accounts FOR DELETE
TO authenticated
USING (public.user_belongs_to_family(auth.uid(), family_id));

-- =====================================================
-- PROBLEMA 2: families - Proteção de dados estratégicos
-- =====================================================

-- Garantir que RLS está ativado
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes permissivas
DROP POLICY IF EXISTS "Users can view families they belong to" ON public.families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
DROP POLICY IF EXISTS "Family owners can update their family" ON public.families;
DROP POLICY IF EXISTS "Family members can view their family" ON public.families;
DROP POLICY IF EXISTS "Users can view their own family" ON public.families;

-- SELECT: apenas membros da família podem ver
CREATE POLICY "Members can view own family only"
ON public.families FOR SELECT
TO authenticated
USING (public.user_belongs_to_family(auth.uid(), id));

-- INSERT: bloqueado - apenas via edge function create-family
CREATE POLICY "No direct family inserts"
ON public.families FOR INSERT
TO authenticated
WITH CHECK (false);

-- UPDATE: apenas owners podem atualizar
CREATE POLICY "Only owners can update family"
ON public.families FOR UPDATE
TO authenticated
USING (public.user_is_family_admin(auth.uid(), id))
WITH CHECK (public.user_is_family_admin(auth.uid(), id));

-- DELETE: bloqueado completamente
CREATE POLICY "No family deletions allowed"
ON public.families FOR DELETE
TO authenticated
USING (false);

-- =====================================================
-- PROBLEMA 3: alerts - Proteção de dados comportamentais
-- =====================================================

-- Garantir que RLS está ativado
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view their family alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can manage their family alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can manage alerts" ON public.alerts;

-- SELECT: apenas membros da família
CREATE POLICY "Family members can view own alerts"
ON public.alerts FOR SELECT
TO authenticated
USING (public.user_belongs_to_family(auth.uid(), family_id));

-- INSERT: apenas membros da família (sistema ou usuário)
CREATE POLICY "Family members can create alerts"
ON public.alerts FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

-- UPDATE: apenas membros da família (ex: marcar como lido)
CREATE POLICY "Family members can update own alerts"
ON public.alerts FOR UPDATE
TO authenticated
USING (public.user_belongs_to_family(auth.uid(), family_id))
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

-- DELETE: apenas membros da família
CREATE POLICY "Family members can delete own alerts"
ON public.alerts FOR DELETE
TO authenticated
USING (public.user_belongs_to_family(auth.uid(), family_id));

-- =====================================================
-- Revogar acesso anon de todas as tabelas sensíveis
-- =====================================================
REVOKE ALL ON public.bank_accounts FROM anon;
REVOKE ALL ON public.families FROM anon;
REVOKE ALL ON public.alerts FROM anon;