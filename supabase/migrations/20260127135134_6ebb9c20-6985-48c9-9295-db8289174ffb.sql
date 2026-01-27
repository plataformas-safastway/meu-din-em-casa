
-- Fix the trigger to handle system/console insertions where auth.uid() is null
CREATE OR REPLACE FUNCTION public.log_admin_user_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor_id uuid;
  _actor_role text;
  _event_type text;
  _metadata jsonb := '{}';
BEGIN
  -- Get actor ID (may be null for system operations)
  _actor_id := auth.uid();
  
  -- Get actor role if authenticated
  IF _actor_id IS NOT NULL THEN
    SELECT admin_role::text INTO _actor_role
    FROM admin_users
    WHERE user_id = _actor_id;
  END IF;
  
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
    ELSIF OLD.mfa_required IS DISTINCT FROM NEW.mfa_required THEN
      _event_type := 'ADMIN_MFA_REQUIRED_CHANGED';
      _metadata := jsonb_build_object(
        'old_value', OLD.mfa_required,
        'new_value', NEW.mfa_required
      );
    ELSE
      _event_type := 'ADMIN_USER_UPDATED';
    END IF;
  END IF;

  -- Only insert audit log if we have an event type
  IF _event_type IS NOT NULL THEN
    INSERT INTO dashboard_audit_logs (
      actor_admin_id,
      actor_role,
      event_type,
      target_user_ref,
      metadata_safe
    ) VALUES (
      COALESCE(_actor_id, COALESCE(NEW.user_id, OLD.user_id)), -- Use target user if no actor
      _actor_role,
      _event_type,
      COALESCE(NEW.id, OLD.id)::text,
      _metadata
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
