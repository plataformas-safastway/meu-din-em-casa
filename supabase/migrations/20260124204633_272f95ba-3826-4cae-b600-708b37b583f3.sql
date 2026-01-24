-- =====================================================
-- MÓDULO DE CUSTOMER SUCCESS - PARTE 2: TABELAS E RLS
-- =====================================================

-- 1. Create CS user status table (tracks CS-assigned status per family)
CREATE TABLE public.cs_user_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'onboarding', 'at_risk', 'churned', 'inactive')),
  assigned_to UUID,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id)
);

-- 2. Create CS actions table (tracks CS interactions)
CREATE TABLE public.cs_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'status_change', 'contact_made', 'guidance_sent', 'material_shared', 
    'campaign_added', 'note_added', 'nudge_sent', 'followup_scheduled'
  )),
  action_details JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create CS audit log (immutable)
CREATE TABLE public.cs_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_family_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create engagement metrics cache (for performance)
CREATE TABLE public.cs_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  total_logins_30d INTEGER DEFAULT 0,
  has_import BOOLEAN DEFAULT false,
  has_budget BOOLEAN DEFAULT false,
  has_goals BOOLEAN DEFAULT false,
  has_manual_transactions BOOLEAN DEFAULT false,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id)
);

-- 5. Enable RLS
ALTER TABLE public.cs_user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- 6. Create has_cs_access function
CREATE OR REPLACE FUNCTION public.has_cs_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_master', 'customer_success')
  )
$$;

-- 7. RLS Policies for cs_user_status
CREATE POLICY "CS can view all user statuses"
  ON public.cs_user_status FOR SELECT
  TO authenticated
  USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can insert user statuses"
  ON public.cs_user_status FOR INSERT
  TO authenticated
  WITH CHECK (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can update user statuses"
  ON public.cs_user_status FOR UPDATE
  TO authenticated
  USING (public.has_cs_access(auth.uid()));

-- 8. RLS Policies for cs_actions
CREATE POLICY "CS can view all actions"
  ON public.cs_actions FOR SELECT
  TO authenticated
  USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can insert actions"
  ON public.cs_actions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_cs_access(auth.uid()));

-- 9. RLS Policies for cs_audit_log (read-only for admin/tech, write for CS)
CREATE POLICY "Admin/Tech can view CS audit logs"
  ON public.cs_audit_log FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master') OR
    public.has_role(auth.uid(), 'tecnologia')
  );

CREATE POLICY "CS can insert audit logs"
  ON public.cs_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_cs_access(auth.uid()));

-- 10. RLS Policies for cs_engagement_metrics
CREATE POLICY "CS can view engagement metrics"
  ON public.cs_engagement_metrics FOR SELECT
  TO authenticated
  USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can upsert engagement metrics"
  ON public.cs_engagement_metrics FOR INSERT
  TO authenticated
  WITH CHECK (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can update engagement metrics"
  ON public.cs_engagement_metrics FOR UPDATE
  TO authenticated
  USING (public.has_cs_access(auth.uid()));

-- 11. Performance indexes
CREATE INDEX idx_cs_user_status_family ON public.cs_user_status(family_id);
CREATE INDEX idx_cs_user_status_status ON public.cs_user_status(status);
CREATE INDEX idx_cs_actions_family ON public.cs_actions(family_id);
CREATE INDEX idx_cs_actions_type ON public.cs_actions(action_type);
CREATE INDEX idx_cs_actions_created ON public.cs_actions(created_at DESC);
CREATE INDEX idx_cs_audit_created ON public.cs_audit_log(created_at DESC);
CREATE INDEX idx_cs_engagement_score ON public.cs_engagement_metrics(score DESC);

-- 12. Updated_at trigger for cs_user_status
CREATE TRIGGER update_cs_user_status_updated_at
  BEFORE UPDATE ON public.cs_user_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();