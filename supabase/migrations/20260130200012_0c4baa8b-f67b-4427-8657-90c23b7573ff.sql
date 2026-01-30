-- =============================================================
-- FIX: Corrigir recursão infinita nas políticas de family_members
-- =============================================================

-- 1) Dropar políticas problemáticas
DROP POLICY IF EXISTS "family_members_select_same_family_active" ON public.family_members;
DROP POLICY IF EXISTS "family_members_insert_authorized" ON public.family_members;
DROP POLICY IF EXISTS "family_members_update_self_or_manager" ON public.family_members;

-- 2) Criar função SECURITY DEFINER para verificar membership sem recursão
CREATE OR REPLACE FUNCTION public.get_user_family_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id 
  FROM public.family_members 
  WHERE user_id = auth.uid() 
    AND status = 'ACTIVE';
$$;

-- 3) Criar função para verificar se usuário é owner/manager de uma família
CREATE OR REPLACE FUNCTION public.user_can_manage_family(target_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = target_family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_manage_family, false) = true)
  );
$$;

-- 4) Recriar política SELECT - agora sem recursão
-- Usuário pode ver membros da mesma família OU admins podem ver tudo
CREATE POLICY "family_members_select_own_or_same_family"
ON public.family_members
FOR SELECT
USING (
  -- Próprio registro
  user_id = auth.uid()
  -- OU membro da mesma família (via função SECURITY DEFINER)
  OR family_id IN (SELECT public.get_user_family_ids())
  -- OU admin ativo
  OR EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid() AND au.is_active = true
  )
);

-- 5) Recriar política INSERT
CREATE POLICY "family_members_insert_authorized"
ON public.family_members
FOR INSERT
WITH CHECK (
  -- Inserindo a si mesmo (novo membro)
  user_id = auth.uid()
  -- OU é manager da família alvo
  OR public.user_can_manage_family(family_id)
);

-- 6) Recriar política UPDATE
CREATE POLICY "family_members_update_self_or_manager"
ON public.family_members
FOR UPDATE
USING (
  -- Próprio registro
  (user_id = auth.uid() AND status = 'ACTIVE')
  -- OU manager da família
  OR public.user_can_manage_family(family_id)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.user_can_manage_family(family_id)
);

-- 7) Garantir permissões para autenticados
GRANT EXECUTE ON FUNCTION public.get_user_family_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_family(uuid) TO authenticated;