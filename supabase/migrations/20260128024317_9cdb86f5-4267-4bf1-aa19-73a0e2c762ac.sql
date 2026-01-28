-- =====================================================
-- OIK: Sistema de Aprendizado por Correção do Usuário
-- =====================================================

-- 1. Enum para tipo de escopo
CREATE TYPE public.learning_scope AS ENUM ('user', 'family', 'global');

-- 2. Enum para tipo de fingerprint
CREATE TYPE public.fingerprint_type AS ENUM ('strong', 'weak');

-- 3. Enum para fonte de predição
CREATE TYPE public.prediction_source AS ENUM ('learned', 'regex', 'heuristic', 'fallback');

-- 4. Tabela de regras aprendidas
CREATE TABLE public.learned_merchant_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type learning_scope NOT NULL DEFAULT 'user',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  fingerprint_type fingerprint_type NOT NULL,
  fingerprint TEXT NOT NULL,
  category_id UUID NOT NULL,
  subcategory_id UUID,
  merchant_canon TEXT,
  confidence_base NUMERIC(3,2) NOT NULL DEFAULT 0.85 CHECK (confidence_base >= 0 AND confidence_base <= 1),
  examples_count INTEGER NOT NULL DEFAULT 1,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_scope CHECK (
    (scope_type = 'user' AND user_id IS NOT NULL AND family_id IS NULL) OR
    (scope_type = 'family' AND family_id IS NOT NULL) OR
    (scope_type = 'global' AND user_id IS NULL AND family_id IS NULL)
  )
);

-- 5. Índices para learned_merchant_rules
CREATE UNIQUE INDEX idx_learned_rules_user_fingerprint 
  ON public.learned_merchant_rules(user_id, fingerprint) 
  WHERE scope_type = 'user' AND NOT is_archived;

CREATE UNIQUE INDEX idx_learned_rules_family_fingerprint 
  ON public.learned_merchant_rules(family_id, fingerprint) 
  WHERE scope_type = 'family' AND NOT is_archived;

CREATE UNIQUE INDEX idx_learned_rules_global_fingerprint 
  ON public.learned_merchant_rules(fingerprint) 
  WHERE scope_type = 'global' AND NOT is_archived;

CREATE INDEX idx_learned_rules_lookup 
  ON public.learned_merchant_rules(scope_type, fingerprint, is_archived);

CREATE INDEX idx_learned_rules_maintenance 
  ON public.learned_merchant_rules(last_used_at, examples_count) 
  WHERE NOT is_archived;

-- 6. Tabela de feedback de categorização
CREATE TABLE public.categorization_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  raw_descriptor TEXT NOT NULL,
  normalized_descriptor TEXT NOT NULL,
  fingerprint_strong TEXT,
  fingerprint_weak TEXT,
  predicted_category_id UUID,
  predicted_subcategory_id UUID,
  predicted_source prediction_source,
  predicted_confidence NUMERIC(3,2),
  user_category_id UUID NOT NULL,
  user_subcategory_id UUID,
  apply_scope learning_scope NOT NULL DEFAULT 'user',
  was_prediction_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Índices para categorization_feedback
CREATE INDEX idx_feedback_user ON public.categorization_feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_family ON public.categorization_feedback(family_id, created_at DESC);
CREATE INDEX idx_feedback_fingerprints ON public.categorization_feedback(fingerprint_strong, fingerprint_weak);

-- 8. Enable RLS
ALTER TABLE public.learned_merchant_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorization_feedback ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies para learned_merchant_rules

CREATE POLICY "Users can view own rules"
ON public.learned_merchant_rules
FOR SELECT
USING (
  (scope_type = 'user' AND user_id = auth.uid()) OR
  (scope_type = 'family' AND family_id IN (
    SELECT fm.family_id FROM public.family_members fm 
    WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
  )) OR
  (scope_type = 'global')
);

CREATE POLICY "Users can create rules"
ON public.learned_merchant_rules
FOR INSERT
WITH CHECK (
  (scope_type = 'user' AND user_id = auth.uid()) OR
  (scope_type = 'family' AND family_id IN (
    SELECT fm.family_id FROM public.family_members fm 
    WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
  ))
);

CREATE POLICY "Users can update own rules"
ON public.learned_merchant_rules
FOR UPDATE
USING (
  (scope_type = 'user' AND user_id = auth.uid()) OR
  (scope_type = 'family' AND family_id IN (
    SELECT fm.family_id FROM public.family_members fm 
    WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
  ))
);

-- Usuários podem deletar suas próprias regras ou de família (se owner)
CREATE POLICY "Users can delete own rules"
ON public.learned_merchant_rules
FOR DELETE
USING (
  (scope_type = 'user' AND user_id = auth.uid()) OR
  (scope_type = 'family' AND family_id IN (
    SELECT fm.family_id FROM public.family_members fm 
    WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE' AND fm.role = 'owner'
  ))
);

-- 10. RLS Policies para categorization_feedback

CREATE POLICY "Users can view own feedback"
ON public.categorization_feedback
FOR SELECT
USING (user_id = auth.uid() OR family_id IN (
  SELECT fm.family_id FROM public.family_members fm 
  WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
));

CREATE POLICY "Users can create feedback"
ON public.categorization_feedback
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 11. Trigger para updated_at
CREATE TRIGGER update_learned_rules_updated_at
  BEFORE UPDATE ON public.learned_merchant_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Função para buscar regras aprendidas com prioridade
CREATE OR REPLACE FUNCTION public.get_learned_categorization(
  p_user_id UUID,
  p_family_id UUID,
  p_fingerprint_strong TEXT,
  p_fingerprint_weak TEXT
)
RETURNS TABLE (
  category_id UUID,
  subcategory_id UUID,
  merchant_canon TEXT,
  confidence NUMERIC,
  source_scope learning_scope,
  fingerprint_matched fingerprint_type,
  examples_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.category_id,
    r.subcategory_id,
    r.merchant_canon,
    CASE 
      WHEN r.fingerprint_type = 'strong' THEN LEAST(r.confidence_base + 0.10, 0.98)
      ELSE r.confidence_base
    END as confidence,
    r.scope_type as source_scope,
    r.fingerprint_type as fingerprint_matched,
    r.examples_count
  FROM public.learned_merchant_rules r
  WHERE 
    NOT r.is_archived
    AND r.conflict_count < 3
    AND (
      (r.fingerprint = p_fingerprint_strong AND r.fingerprint_type = 'strong') OR
      (r.fingerprint = p_fingerprint_weak AND r.fingerprint_type = 'weak')
    )
    AND (
      (r.scope_type = 'user' AND r.user_id = p_user_id) OR
      (r.scope_type = 'family' AND r.family_id = p_family_id) OR
      (r.scope_type = 'global')
    )
  ORDER BY 
    CASE WHEN r.fingerprint_type = 'strong' THEN 0 ELSE 1 END,
    CASE r.scope_type 
      WHEN 'user' THEN 0 
      WHEN 'family' THEN 1 
      ELSE 2 
    END,
    r.examples_count DESC
  LIMIT 1;
END;
$$;

-- 13. Função para registrar feedback e atualizar regra
CREATE OR REPLACE FUNCTION public.record_categorization_feedback(
  p_transaction_id UUID,
  p_user_id UUID,
  p_family_id UUID,
  p_raw_descriptor TEXT,
  p_normalized_descriptor TEXT,
  p_fingerprint_strong TEXT,
  p_fingerprint_weak TEXT,
  p_predicted_category_id UUID,
  p_predicted_subcategory_id UUID,
  p_predicted_source prediction_source,
  p_predicted_confidence NUMERIC,
  p_user_category_id UUID,
  p_user_subcategory_id UUID,
  p_apply_scope learning_scope DEFAULT 'user',
  p_apply_to_future BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_correct BOOLEAN;
  v_existing_rule learned_merchant_rules%ROWTYPE;
  v_fingerprint TEXT;
  v_fp_type fingerprint_type;
  v_result JSON;
BEGIN
  v_was_correct := (p_predicted_category_id = p_user_category_id AND 
                    COALESCE(p_predicted_subcategory_id, '00000000-0000-0000-0000-000000000000'::UUID) = 
                    COALESCE(p_user_subcategory_id, '00000000-0000-0000-0000-000000000000'::UUID));
  
  INSERT INTO public.categorization_feedback (
    transaction_id, user_id, family_id, raw_descriptor, normalized_descriptor,
    fingerprint_strong, fingerprint_weak, predicted_category_id, predicted_subcategory_id,
    predicted_source, predicted_confidence, user_category_id, user_subcategory_id,
    apply_scope, was_prediction_correct
  ) VALUES (
    p_transaction_id, p_user_id, p_family_id, p_raw_descriptor, p_normalized_descriptor,
    p_fingerprint_strong, p_fingerprint_weak, p_predicted_category_id, p_predicted_subcategory_id,
    p_predicted_source, p_predicted_confidence, p_user_category_id, p_user_subcategory_id,
    p_apply_scope, v_was_correct
  );
  
  IF NOT p_apply_to_future THEN
    RETURN json_build_object('success', true, 'learned', false);
  END IF;
  
  IF p_fingerprint_strong IS NOT NULL AND p_fingerprint_strong != '' THEN
    v_fingerprint := p_fingerprint_strong;
    v_fp_type := 'strong';
  ELSE
    v_fingerprint := p_fingerprint_weak;
    v_fp_type := 'weak';
  END IF;
  
  SELECT * INTO v_existing_rule
  FROM public.learned_merchant_rules
  WHERE fingerprint = v_fingerprint
    AND NOT is_archived
    AND (
      (p_apply_scope = 'user' AND scope_type = 'user' AND user_id = p_user_id) OR
      (p_apply_scope = 'family' AND scope_type = 'family' AND family_id = p_family_id)
    )
  LIMIT 1;
  
  IF FOUND THEN
    IF v_existing_rule.category_id = p_user_category_id AND 
       COALESCE(v_existing_rule.subcategory_id, '00000000-0000-0000-0000-000000000000'::UUID) = 
       COALESCE(p_user_subcategory_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
      UPDATE public.learned_merchant_rules
      SET 
        examples_count = examples_count + 1,
        confidence_base = LEAST(confidence_base + 0.02, 0.98),
        last_used_at = now(),
        updated_at = now()
      WHERE id = v_existing_rule.id;
      
      v_result := json_build_object('success', true, 'learned', true, 'action', 'reinforced');
    ELSE
      UPDATE public.learned_merchant_rules
      SET 
        conflict_count = conflict_count + 1,
        confidence_base = GREATEST(confidence_base - 0.05, 0.50),
        updated_at = now()
      WHERE id = v_existing_rule.id;
      
      v_result := json_build_object(
        'success', true, 
        'learned', false, 
        'conflict', true,
        'existing_category_id', v_existing_rule.category_id,
        'message', 'Conflito detectado. A regra existente foi rebaixada.'
      );
    END IF;
  ELSE
    INSERT INTO public.learned_merchant_rules (
      scope_type, user_id, family_id, fingerprint_type, fingerprint,
      category_id, subcategory_id, merchant_canon, confidence_base
    ) VALUES (
      p_apply_scope,
      CASE WHEN p_apply_scope = 'user' THEN p_user_id ELSE NULL END,
      CASE WHEN p_apply_scope IN ('user', 'family') THEN p_family_id ELSE NULL END,
      v_fp_type,
      v_fingerprint,
      p_user_category_id,
      p_user_subcategory_id,
      NULL,
      0.85
    );
    
    v_result := json_build_object('success', true, 'learned', true, 'action', 'created');
  END IF;
  
  RETURN v_result;
END;
$$;