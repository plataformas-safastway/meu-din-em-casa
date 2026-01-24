-- Create member permissions table for granular access control
CREATE TABLE public.member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  can_view_all BOOLEAN DEFAULT true,
  can_edit_all BOOLEAN DEFAULT false,
  can_insert_transactions BOOLEAN DEFAULT true,
  can_delete_transactions BOOLEAN DEFAULT false,
  can_view_projection BOOLEAN DEFAULT true,
  can_view_budget BOOLEAN DEFAULT true,
  can_manage_family BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id)
);

-- Create family activity table for member notifications
CREATE TABLE public.family_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  actor_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'transaction_created', 'transaction_updated', 'transaction_deleted', 'budget_updated', etc.
  entity_type TEXT NOT NULL, -- 'transaction', 'budget', 'goal', etc.
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE public.member_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  push_transactions BOOLEAN DEFAULT true,
  push_budget_alerts BOOLEAN DEFAULT true,
  push_location_context BOOLEAN DEFAULT false,
  push_subscription JSONB, -- Web Push subscription object
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id)
);

-- Enable RLS on all tables
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for member_permissions
CREATE POLICY "Members can view own family permissions"
  ON public.member_permissions FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners/admins can manage permissions"
  ON public.member_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members 
      WHERE user_id = auth.uid() 
      AND family_id = member_permissions.family_id 
      AND role = 'owner'
    )
  );

-- RLS policies for family_activities
CREATE POLICY "Members can view own family activities"
  ON public.family_activities FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert activities in their family"
  ON public.family_activities FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for notification_preferences
CREATE POLICY "Members can view own notification prefs"
  ON public.member_notification_preferences FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage own notification prefs"
  ON public.member_notification_preferences FOR ALL
  USING (
    member_id IN (
      SELECT id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_member_permissions_family ON public.member_permissions(family_id);
CREATE INDEX idx_member_permissions_member ON public.member_permissions(member_id);
CREATE INDEX idx_family_activities_family ON public.family_activities(family_id);
CREATE INDEX idx_family_activities_created ON public.family_activities(created_at DESC);
CREATE INDEX idx_notification_prefs_member ON public.member_notification_preferences(member_id);

-- Function to check member permission
CREATE OR REPLACE FUNCTION public.check_member_permission(
  _user_id UUID,
  _family_id UUID,
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Owner has all permissions
    WHEN EXISTS (
      SELECT 1 FROM family_members 
      WHERE user_id = _user_id AND family_id = _family_id AND role = 'owner'
    ) THEN true
    -- Check specific permission
    ELSE COALESCE(
      (SELECT 
        CASE _permission
          WHEN 'view_all' THEN can_view_all
          WHEN 'edit_all' THEN can_edit_all
          WHEN 'insert_transactions' THEN can_insert_transactions
          WHEN 'delete_transactions' THEN can_delete_transactions
          WHEN 'view_projection' THEN can_view_projection
          WHEN 'view_budget' THEN can_view_budget
          WHEN 'manage_family' THEN can_manage_family
          ELSE false
        END
      FROM member_permissions mp
      JOIN family_members fm ON fm.id = mp.member_id
      WHERE fm.user_id = _user_id AND mp.family_id = _family_id
      ), false)
  END;
$$;

-- Function to get all permissions for a member
CREATE OR REPLACE FUNCTION public.get_member_permissions(_user_id UUID, _family_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Owner has all permissions
    WHEN EXISTS (
      SELECT 1 FROM family_members 
      WHERE user_id = _user_id AND family_id = _family_id AND role = 'owner'
    ) THEN jsonb_build_object(
      'is_owner', true,
      'can_view_all', true,
      'can_edit_all', true,
      'can_insert_transactions', true,
      'can_delete_transactions', true,
      'can_view_projection', true,
      'can_view_budget', true,
      'can_manage_family', true
    )
    -- Check member permissions
    ELSE COALESCE(
      (SELECT jsonb_build_object(
        'is_owner', false,
        'can_view_all', mp.can_view_all,
        'can_edit_all', mp.can_edit_all,
        'can_insert_transactions', mp.can_insert_transactions,
        'can_delete_transactions', mp.can_delete_transactions,
        'can_view_projection', mp.can_view_projection,
        'can_view_budget', mp.can_view_budget,
        'can_manage_family', mp.can_manage_family
      )
      FROM member_permissions mp
      JOIN family_members fm ON fm.id = mp.member_id
      WHERE fm.user_id = _user_id AND mp.family_id = _family_id
      ), jsonb_build_object(
        'is_owner', false,
        'can_view_all', true,
        'can_edit_all', false,
        'can_insert_transactions', true,
        'can_delete_transactions', false,
        'can_view_projection', true,
        'can_view_budget', true,
        'can_manage_family', false
      ))
  END;
$$;

-- Trigger to auto-create permissions when member joins
CREATE OR REPLACE FUNCTION public.create_default_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO member_permissions (member_id, family_id, can_manage_family)
  VALUES (
    NEW.id, 
    NEW.family_id,
    NEW.role = 'owner'
  );
  
  INSERT INTO member_notification_preferences (member_id, family_id)
  VALUES (NEW.id, NEW.family_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new family members
DROP TRIGGER IF EXISTS trigger_create_member_permissions ON family_members;
CREATE TRIGGER trigger_create_member_permissions
  AFTER INSERT ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION create_default_permissions();