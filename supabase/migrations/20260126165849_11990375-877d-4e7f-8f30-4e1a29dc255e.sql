-- =============================================================
-- LGPD GOVERNANCE PART 2: Tables, Functions and Policies
-- =============================================================

-- 1. Create dashboard_audit_logs for tracking all dashboard access (LGPD-safe)
CREATE TABLE IF NOT EXISTS public.dashboard_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_admin_id UUID NOT NULL,
    actor_role TEXT NOT NULL,
    event_type TEXT NOT NULL,
    family_ref TEXT,
    target_user_ref TEXT,
    ip_ref TEXT,
    metadata_safe JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_audit_logs_actor ON public.dashboard_audit_logs(actor_admin_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_logs_event ON public.dashboard_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_logs_created ON public.dashboard_audit_logs(created_at DESC);
ALTER TABLE public.dashboard_audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create legal_vault for sensitive legal evidence
CREATE TABLE IF NOT EXISTS public.legal_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL,
    family_id UUID NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('AUDIT_EVIDENCE', 'FRAUD', 'DISPUTE', 'COURT_ORDER', 'INCIDENT')),
    payload JSONB NOT NULL DEFAULT '{}',
    retention_until TIMESTAMPTZ NOT NULL,
    sealed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_legal_vault_family ON public.legal_vault(family_id);
CREATE INDEX IF NOT EXISTS idx_legal_vault_type ON public.legal_vault(data_type);
CREATE INDEX IF NOT EXISTS idx_legal_vault_retention ON public.legal_vault(retention_until);
ALTER TABLE public.legal_vault ENABLE ROW LEVEL SECURITY;

-- 3. Create legal_access_grants for break-glass access
CREATE TABLE IF NOT EXISTS public.legal_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID NOT NULL,
    approved_by UUID,
    scope TEXT NOT NULL CHECK (scope IN ('LEGAL_VAULT', 'FULL_EXPORT', 'INCIDENT_DETAILS', 'AUDIT_FULL')),
    target_user_id UUID,
    family_id UUID,
    reason_code TEXT NOT NULL CHECK (reason_code IN ('DSAR', 'FRAUD', 'COURT', 'SECURITY', 'OTHER')),
    reason_text TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    mfa_verified BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'USED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_access_grants_requested ON public.legal_access_grants(requested_by);
CREATE INDEX IF NOT EXISTS idx_legal_access_grants_status ON public.legal_access_grants(status);
CREATE INDEX IF NOT EXISTS idx_legal_access_grants_expires ON public.legal_access_grants(expires_at);
ALTER TABLE public.legal_access_grants ENABLE ROW LEVEL SECURITY;

-- 4. Helper function to check for legal role
CREATE OR REPLACE FUNCTION public.has_legal_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
        AND role::text IN ('legal', 'admin_master', 'admin')
    )
$$;

-- 5. Helper function to check for admin_master role
CREATE OR REPLACE FUNCTION public.is_admin_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
        AND role::text = 'admin_master'
    )
$$;

-- 6. Function to hash identifiers for LGPD-safe logging
CREATE OR REPLACE FUNCTION public.hash_identifier(identifier TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT encode(sha256(identifier::bytea), 'hex')
$$;

-- 7. Function to check active break-glass access
CREATE OR REPLACE FUNCTION public.has_active_breakglass(_user_id UUID, _scope TEXT, _family_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.legal_access_grants
        WHERE requested_by = _user_id
        AND scope = _scope
        AND status = 'APPROVED'
        AND mfa_verified = true
        AND expires_at > now()
        AND (_family_id IS NULL OR family_id = _family_id OR family_id IS NULL)
    )
$$;

-- 8. Function to log dashboard access (LGPD-safe)
CREATE OR REPLACE FUNCTION public.log_dashboard_access(
    _actor_id UUID,
    _actor_role TEXT,
    _event_type TEXT,
    _family_id UUID DEFAULT NULL,
    _target_user_id UUID DEFAULT NULL,
    _ip_address TEXT DEFAULT NULL,
    _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _log_id UUID;
BEGIN
    INSERT INTO public.dashboard_audit_logs (
        actor_admin_id,
        actor_role,
        event_type,
        family_ref,
        target_user_ref,
        ip_ref,
        metadata_safe
    ) VALUES (
        _actor_id,
        _actor_role,
        _event_type,
        CASE WHEN _family_id IS NOT NULL THEN public.hash_identifier(_family_id::text) ELSE NULL END,
        CASE WHEN _target_user_id IS NOT NULL THEN public.hash_identifier(_target_user_id::text) ELSE NULL END,
        CASE WHEN _ip_address IS NOT NULL THEN left(_ip_address, 8) || '.*.*' ELSE NULL END,
        _metadata
    )
    RETURNING id INTO _log_id;
    
    RETURN _log_id;
END;
$$;

-- 9. RLS Policies for dashboard_audit_logs
CREATE POLICY "dashboard_audit_logs_cs_select_own"
ON public.dashboard_audit_logs FOR SELECT TO authenticated
USING (actor_admin_id = auth.uid() AND public.has_cs_access(auth.uid()));

CREATE POLICY "dashboard_audit_logs_admin_select_all"
ON public.dashboard_audit_logs FOR SELECT TO authenticated
USING (public.is_admin_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "dashboard_audit_logs_legal_select"
ON public.dashboard_audit_logs FOR SELECT TO authenticated
USING (public.has_legal_access(auth.uid()) AND event_type LIKE 'LGPD%');

CREATE POLICY "dashboard_audit_logs_insert_service"
ON public.dashboard_audit_logs FOR INSERT TO authenticated
WITH CHECK (actor_admin_id = auth.uid());

-- 10. RLS Policies for legal_vault
CREATE POLICY "legal_vault_legal_breakglass"
ON public.legal_vault FOR SELECT TO authenticated
USING (
    public.has_legal_access(auth.uid())
    AND (
        public.is_admin_master(auth.uid())
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_active_breakglass(auth.uid(), 'LEGAL_VAULT', family_id)
    )
);

CREATE POLICY "legal_vault_insert_admin"
ON public.legal_vault FOR INSERT TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 11. RLS Policies for legal_access_grants
CREATE POLICY "legal_access_grants_legal_select"
ON public.legal_access_grants FOR SELECT TO authenticated
USING (
    public.has_legal_access(auth.uid())
    AND (requested_by = auth.uid() OR public.is_admin_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "legal_access_grants_legal_insert"
ON public.legal_access_grants FOR INSERT TO authenticated
WITH CHECK (public.has_legal_access(auth.uid()) AND requested_by = auth.uid());

CREATE POLICY "legal_access_grants_admin_update"
ON public.legal_access_grants FOR UPDATE TO authenticated
USING (public.is_admin_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_admin_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 12. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_legal_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_master(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_identifier(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_breakglass(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_dashboard_access(UUID, TEXT, TEXT, UUID, UUID, TEXT, JSONB) TO authenticated;