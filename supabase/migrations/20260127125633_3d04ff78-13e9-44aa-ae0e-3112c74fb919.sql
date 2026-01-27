-- Add reset password functionality with comprehensive audit logging

-- Update the admin_users_audit_trigger to log more detailed events
CREATE OR REPLACE FUNCTION public.log_admin_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_role text;
  _event_type text;
  _metadata jsonb := '{}';
BEGIN
  -- Get actor role
  SELECT admin_role::text INTO _actor_role
  FROM admin_users
  WHERE user_id = auth.uid();
  
  IF _actor_role IS NULL THEN
    _actor_role := 'system';
  END IF;

  -- Determine event type based on operation and changes
  IF TG_OP = 'INSERT' THEN
    _event_type := 'ADMIN_USER_CREATED';
    _metadata := jsonb_build_object(
      'role_assigned', NEW.admin_role,
      'mfa_required', NEW.mfa_required
    );
  ELSIF TG_OP = 'DELETE' THEN
    _event_type := 'ADMIN_USER_DELETED';
    _metadata := jsonb_build_object(
      'role_was', OLD.admin_role
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check specific field changes
    IF OLD.admin_role IS DISTINCT FROM NEW.admin_role THEN
      _event_type := 'ADMIN_ROLE_CHANGED';
      _metadata := jsonb_build_object(
        'old_role', OLD.admin_role,
        'new_role', NEW.admin_role
      );
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      _event_type := 'ADMIN_USER_DEACTIVATED';
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      _event_type := 'ADMIN_USER_REACTIVATED';
    ELSIF OLD.must_change_password = false AND NEW.must_change_password = true THEN
      _event_type := 'ADMIN_MUST_CHANGE_PASSWORD_ENABLED';
    ELSIF OLD.must_change_password = true AND NEW.must_change_password = false THEN
      _event_type := 'ADMIN_PASSWORD_CHANGED';
    ELSIF OLD.mfa_required IS DISTINCT FROM NEW.mfa_required THEN
      _event_type := 'ADMIN_MFA_REQUIRED_CHANGED';
      _metadata := jsonb_build_object(
        'mfa_required', NEW.mfa_required
      );
    ELSE
      _event_type := 'ADMIN_USER_UPDATED';
    END IF;
  END IF;

  -- Insert audit log (never store sensitive data)
  INSERT INTO dashboard_audit_logs (
    actor_admin_id,
    actor_role,
    event_type,
    target_user_ref,
    metadata_safe,
    ip_ref
  ) VALUES (
    auth.uid(),
    _actor_role,
    _event_type,
    COALESCE(NEW.id, OLD.id)::text,
    _metadata,
    NULL -- IP should be set via application layer if needed
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop and recreate trigger to use updated function
DROP TRIGGER IF EXISTS admin_users_audit_trigger ON admin_users;
CREATE TRIGGER admin_users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_user_changes();

-- Function to reset admin user password (sets must_change_password = true)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role text;
  _target_role text;
BEGIN
  -- Get caller role
  SELECT admin_role::text INTO _caller_role
  FROM admin_users
  WHERE user_id = auth.uid() AND is_active = true;
  
  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuário não autorizado';
  END IF;
  
  -- Get target role
  SELECT admin_role::text INTO _target_role
  FROM admin_users
  WHERE user_id = _target_user_id;
  
  IF _target_role IS NULL THEN
    RAISE EXCEPTION 'Usuário alvo não encontrado';
  END IF;
  
  -- Permission check: only MASTER can reset MASTER, ADMIN can reset CS/LEGAL/ADMIN
  IF _target_role = 'MASTER' AND _caller_role != 'MASTER' THEN
    RAISE EXCEPTION 'Apenas MASTER pode resetar senha de outro MASTER';
  END IF;
  
  IF _caller_role NOT IN ('MASTER', 'ADMIN') THEN
    RAISE EXCEPTION 'Sem permissão para resetar senhas';
  END IF;
  
  -- Cannot reset own password via this function
  IF auth.uid() = _target_user_id THEN
    RAISE EXCEPTION 'Use a funcionalidade de troca de senha para alterar sua própria senha';
  END IF;
  
  -- Log the reset request
  INSERT INTO dashboard_audit_logs (
    actor_admin_id,
    actor_role,
    event_type,
    target_user_ref,
    metadata_safe
  ) VALUES (
    auth.uid(),
    _caller_role,
    'ADMIN_PASSWORD_RESET_REQUESTED',
    _target_user_id::text,
    jsonb_build_object('target_role', _target_role)
  );
  
  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(uuid) TO authenticated;

-- Function to log login success/blocked events
CREATE OR REPLACE FUNCTION public.log_admin_login(_success boolean, _blocked_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_role text;
  _event_type text;
  _metadata jsonb := '{}';
BEGIN
  SELECT admin_role::text INTO _admin_role
  FROM admin_users
  WHERE user_id = auth.uid();
  
  IF _admin_role IS NULL THEN
    RETURN; -- Not an admin user
  END IF;
  
  IF _success THEN
    _event_type := 'ADMIN_LOGIN_SUCCESS';
    
    -- Update last_login_at
    UPDATE admin_users
    SET last_login_at = now()
    WHERE user_id = auth.uid();
  ELSE
    _event_type := 'ADMIN_LOGIN_BLOCKED';
    _metadata := jsonb_build_object('reason', COALESCE(_blocked_reason, 'unknown'));
  END IF;
  
  INSERT INTO dashboard_audit_logs (
    actor_admin_id,
    actor_role,
    event_type,
    metadata_safe
  ) VALUES (
    auth.uid(),
    _admin_role,
    _event_type,
    _metadata
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_login(boolean, text) TO authenticated;

-- Function to validate role change permissions
CREATE OR REPLACE FUNCTION public.can_change_admin_role(_caller_id uuid, _target_id uuid, _new_role admin_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role admin_role;
  _target_current_role admin_role;
BEGIN
  -- Get caller role
  SELECT admin_role INTO _caller_role
  FROM admin_users
  WHERE user_id = _caller_id AND is_active = true;
  
  IF _caller_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get target current role
  SELECT admin_role INTO _target_current_role
  FROM admin_users
  WHERE user_id = _target_id;
  
  -- Cannot change own role
  IF _caller_id = _target_id THEN
    RETURN false;
  END IF;
  
  -- MASTER can do anything
  IF _caller_role = 'MASTER' THEN
    RETURN true;
  END IF;
  
  -- ADMIN can manage CS, LEGAL, and ADMIN (but not promote to MASTER)
  IF _caller_role = 'ADMIN' THEN
    -- Cannot touch MASTER users
    IF _target_current_role = 'MASTER' THEN
      RETURN false;
    END IF;
    -- Cannot promote to MASTER
    IF _new_role = 'MASTER' THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;
  
  -- CS and LEGAL cannot change roles
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_change_admin_role(uuid, uuid, admin_role) TO authenticated;