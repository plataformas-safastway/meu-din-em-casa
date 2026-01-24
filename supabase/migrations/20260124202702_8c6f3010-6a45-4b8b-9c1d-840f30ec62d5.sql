-- =====================================================
-- TABLE: support_errors (Core error tracking)
-- =====================================================
CREATE TABLE public.support_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  user_id UUID,
  error_type TEXT NOT NULL, -- 'import', 'navigation', 'login', 'integration', 'api', 'ui', 'other'
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT, -- sanitized stack trace
  module TEXT, -- 'dashboard', 'transactions', 'import', 'banks', etc.
  screen TEXT, -- specific screen/route
  user_action TEXT, -- last action before error
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  browser TEXT,
  os TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'analyzing', 'resolved', 'wont_fix'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_errors ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_support_errors_family ON public.support_errors(family_id);
CREATE INDEX idx_support_errors_status ON public.support_errors(status);
CREATE INDEX idx_support_errors_type ON public.support_errors(error_type);
CREATE INDEX idx_support_errors_created ON public.support_errors(created_at DESC);
CREATE INDEX idx_support_errors_module ON public.support_errors(module);

-- =====================================================
-- TABLE: support_sessions (Assisted access sessions)
-- =====================================================
CREATE TABLE public.support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_user_id UUID NOT NULL,
  target_family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID,
  session_type TEXT NOT NULL DEFAULT 'view_only', -- 'view_only', 'assisted_edit'
  reason TEXT NOT NULL,
  screens_visited TEXT[] DEFAULT '{}',
  actions_performed JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  approved_by UUID, -- for assisted_edit, needs admin_master approval
  approved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_support_sessions_support_user ON public.support_sessions(support_user_id);
CREATE INDEX idx_support_sessions_target ON public.support_sessions(target_family_id);
CREATE INDEX idx_support_sessions_started ON public.support_sessions(started_at DESC);

-- =====================================================
-- TABLE: support_notes (Internal notes per user)
-- =====================================================
CREATE TABLE public.support_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- 'general', 'error', 'followup', 'resolved'
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_notes ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_support_notes_family ON public.support_notes(family_id);
CREATE INDEX idx_support_notes_created ON public.support_notes(created_at DESC);

-- =====================================================
-- TABLE: support_audit_log (Immutable audit trail)
-- =====================================================
CREATE TABLE public.support_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- who performed the action
  action TEXT NOT NULL, -- 'access_module', 'view_error', 'update_error', 'start_session', 'end_session', 'add_note', 'access_denied'
  target_family_id UUID,
  target_error_id UUID,
  target_session_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_audit_log ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_support_audit_user ON public.support_audit_log(user_id);
CREATE INDEX idx_support_audit_action ON public.support_audit_log(action);
CREATE INDEX idx_support_audit_created ON public.support_audit_log(created_at DESC);
CREATE INDEX idx_support_audit_family ON public.support_audit_log(target_family_id);

-- =====================================================
-- FUNCTION: has_support_access
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_support_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_master', 'suporte')
  )
$$;

-- =====================================================
-- RLS POLICIES: support_errors
-- =====================================================
CREATE POLICY "Support staff can view all errors"
  ON public.support_errors FOR SELECT
  TO authenticated
  USING (public.has_support_access(auth.uid()));

CREATE POLICY "Support staff can update errors"
  ON public.support_errors FOR UPDATE
  TO authenticated
  USING (public.has_support_access(auth.uid()));

CREATE POLICY "Authenticated users can insert errors"
  ON public.support_errors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES: support_sessions
-- =====================================================
CREATE POLICY "Support staff can view sessions"
  ON public.support_sessions FOR SELECT
  TO authenticated
  USING (public.has_support_access(auth.uid()) OR public.has_tech_access(auth.uid()));

CREATE POLICY "Support staff can create sessions"
  ON public.support_sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_support_access(auth.uid()));

CREATE POLICY "Support staff can update own sessions"
  ON public.support_sessions FOR UPDATE
  TO authenticated
  USING (support_user_id = auth.uid() AND public.has_support_access(auth.uid()));

-- =====================================================
-- RLS POLICIES: support_notes
-- =====================================================
CREATE POLICY "Support staff can view notes"
  ON public.support_notes FOR SELECT
  TO authenticated
  USING (public.has_support_access(auth.uid()));

CREATE POLICY "Support staff can create notes"
  ON public.support_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_support_access(auth.uid()));

CREATE POLICY "Support staff can update own notes"
  ON public.support_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND public.has_support_access(auth.uid()));

-- =====================================================
-- RLS POLICIES: support_audit_log
-- =====================================================
CREATE POLICY "Admin and tech can view audit logs"
  ON public.support_audit_log FOR SELECT
  TO authenticated
  USING (public.has_tech_access(auth.uid()) OR public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.support_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE or DELETE policies - audit logs are immutable