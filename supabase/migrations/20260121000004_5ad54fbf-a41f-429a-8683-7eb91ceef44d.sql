-- Allow users to update their own profile (needed for phone updates)
CREATE POLICY "Users can update their own profile"
ON public.family_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update audit trigger to include phone changes
CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if relevant fields changed
  IF OLD.display_name IS DISTINCT FROM NEW.display_name 
     OR OLD.cpf IS DISTINCT FROM NEW.cpf
     OR OLD.birth_date IS DISTINCT FROM NEW.birth_date
     OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
     OR OLD.phone_e164 IS DISTINCT FROM NEW.phone_e164
     OR OLD.phone_country IS DISTINCT FROM NEW.phone_country THEN
    
    INSERT INTO public.audit_logs (user_id, family_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      NEW.user_id,
      NEW.family_id,
      'PROFILE_UPDATED',
      'family_member',
      NEW.id,
      jsonb_build_object(
        'display_name', OLD.display_name,
        'avatar_url', OLD.avatar_url,
        'phone_country', OLD.phone_country
        -- Note: phone_e164 masked for security
      ),
      jsonb_build_object(
        'display_name', NEW.display_name,
        'avatar_url', NEW.avatar_url,
        'phone_country', NEW.phone_country
        -- Note: phone_e164 masked for security
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS log_profile_changes ON public.family_members;
CREATE TRIGGER log_profile_changes
  AFTER UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_change();