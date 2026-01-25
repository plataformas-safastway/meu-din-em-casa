-- Create function to validate and get invite info (accessible to anyone with token)
CREATE OR REPLACE FUNCTION public.validate_invite_token(invite_token TEXT)
RETURNS TABLE (
  invite_id UUID,
  family_id UUID,
  family_name TEXT,
  invited_email TEXT,
  inviter_name TEXT,
  role TEXT,
  permissions JSONB,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_family RECORD;
  v_inviter RECORD;
BEGIN
  -- Get invite record
  SELECT * INTO v_invite
  FROM family_invites fi
  WHERE fi.token = invite_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::JSONB,
      FALSE, 'Convite não encontrado'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF v_invite.expires_at < now() THEN
    -- Mark as expired
    UPDATE family_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN QUERY SELECT 
      v_invite.id, v_invite.family_id, NULL::TEXT, v_invite.invited_email, NULL::TEXT, v_invite.role, v_invite.permissions,
      FALSE, 'Convite expirado'::TEXT;
    RETURN;
  END IF;

  -- Check if already used
  IF v_invite.status != 'pending' THEN
    RETURN QUERY SELECT 
      v_invite.id, v_invite.family_id, NULL::TEXT, v_invite.invited_email, NULL::TEXT, v_invite.role, v_invite.permissions,
      FALSE, 'Convite já utilizado'::TEXT;
    RETURN;
  END IF;

  -- Get family info
  SELECT * INTO v_family
  FROM families f
  WHERE f.id = v_invite.family_id;

  -- Get inviter info
  SELECT display_name INTO v_inviter
  FROM family_members fm
  WHERE fm.user_id = v_invite.invited_by_user_id
    AND fm.family_id = v_invite.family_id
  LIMIT 1;

  RETURN QUERY SELECT 
    v_invite.id,
    v_invite.family_id,
    v_family.name,
    v_invite.invited_email,
    COALESCE(v_inviter.display_name, 'Membro'),
    v_invite.role,
    v_invite.permissions,
    TRUE,
    NULL::TEXT;
END;
$$;

-- Create function to accept invite
CREATE OR REPLACE FUNCTION public.accept_family_invite(
  invite_token TEXT,
  p_display_name TEXT,
  p_phone_e164 TEXT DEFAULT NULL,
  p_phone_country TEXT DEFAULT 'BR',
  p_birth_date DATE DEFAULT NULL,
  p_profession TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  family_id UUID,
  member_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_invite RECORD;
  v_existing_member RECORD;
  v_new_member_id UUID;
  v_role family_role;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'Usuário não autenticado'::TEXT;
    RETURN;
  END IF;

  -- Validate invite
  SELECT * INTO v_invite
  FROM family_invites fi
  WHERE fi.token = invite_token
    AND fi.status = 'pending'
    AND fi.expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'Convite inválido ou expirado'::TEXT;
    RETURN;
  END IF;

  -- Determine role (only owner and member exist)
  v_role := 'member'::family_role;

  -- Check if user already member of this family
  SELECT * INTO v_existing_member
  FROM family_members fm
  WHERE fm.family_id = v_invite.family_id
    AND fm.user_id = v_user_id;

  IF FOUND AND v_existing_member.status = 'active' THEN
    RETURN QUERY SELECT FALSE, v_invite.family_id, v_existing_member.id, 'Você já é membro desta família'::TEXT;
    RETURN;
  END IF;

  -- If member exists but was removed, reactivate
  IF FOUND THEN
    UPDATE family_members
    SET 
      status = 'active',
      role = v_role,
      display_name = p_display_name,
      phone_e164 = p_phone_e164,
      phone_country = p_phone_country,
      birth_date = p_birth_date,
      profession = p_profession,
      removed_at = NULL,
      removed_by_user_id = NULL,
      removed_reason = NULL,
      last_active_at = now(),
      updated_at = now()
    WHERE id = v_existing_member.id
    RETURNING id INTO v_new_member_id;
  ELSE
    -- Create new family member
    INSERT INTO family_members (
      family_id,
      user_id,
      display_name,
      role,
      phone_e164,
      phone_country,
      birth_date,
      profession,
      status,
      added_by_user_id,
      added_at,
      last_active_at
    ) VALUES (
      v_invite.family_id,
      v_user_id,
      p_display_name,
      v_role,
      p_phone_e164,
      p_phone_country,
      p_birth_date,
      p_profession,
      'active',
      v_invite.invited_by_user_id,
      now(),
      now()
    )
    RETURNING id INTO v_new_member_id;
  END IF;

  -- Mark invite as accepted
  UPDATE family_invites
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by_user_id = v_user_id,
    updated_at = now()
  WHERE id = v_invite.id;

  -- Log the acceptance in audit
  INSERT INTO audit_logs (
    user_id,
    family_id,
    entity_type,
    entity_id,
    action,
    module,
    metadata,
    severity
  ) VALUES (
    v_user_id,
    v_invite.family_id,
    'family_invite',
    v_invite.id::text,
    'accept_invite',
    'family',
    jsonb_build_object(
      'invited_by', v_invite.invited_by_user_id,
      'role', v_invite.role,
      'display_name', p_display_name
    ),
    'info'
  );

  RETURN QUERY SELECT TRUE, v_invite.family_id, v_new_member_id, NULL::TEXT;
END;
$$;

-- Create function to generate secure invite token
CREATE OR REPLACE FUNCTION public.create_family_invite(
  p_family_id UUID,
  p_invited_email TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'member',
  p_permissions JSONB DEFAULT '{}'
)
RETURNS TABLE (
  invite_id UUID,
  token TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_token TEXT;
  v_invite_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 'Usuário não autenticado'::TEXT;
    RETURN;
  END IF;

  -- Check if user is admin/owner of family (using existing function)
  v_is_admin := user_is_family_admin(v_user_id, p_family_id);

  IF NOT v_is_admin THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 'Sem permissão para criar convites'::TEXT;
    RETURN;
  END IF;

  -- Generate secure token (base64 of random bytes)
  v_token := encode(gen_random_bytes(32), 'base64');
  -- Make URL-safe
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
  
  v_expires_at := now() + interval '7 days';

  -- Create invite
  INSERT INTO family_invites (
    family_id,
    token,
    invited_email,
    invited_by_user_id,
    role,
    permissions,
    expires_at
  ) VALUES (
    p_family_id,
    v_token,
    p_invited_email,
    v_user_id,
    p_role,
    p_permissions,
    v_expires_at
  )
  RETURNING id INTO v_invite_id;

  -- Log creation
  INSERT INTO audit_logs (
    user_id,
    family_id,
    entity_type,
    entity_id,
    action,
    module,
    metadata,
    severity
  ) VALUES (
    v_user_id,
    p_family_id,
    'family_invite',
    v_invite_id::text,
    'create_invite',
    'family',
    jsonb_build_object(
      'invited_email', p_invited_email,
      'role', p_role
    ),
    'info'
  );

  RETURN QUERY SELECT v_invite_id, v_token, v_expires_at, NULL::TEXT;
END;
$$;