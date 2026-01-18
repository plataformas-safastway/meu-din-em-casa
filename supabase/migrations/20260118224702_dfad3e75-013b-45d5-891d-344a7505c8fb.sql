-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Add avatar_url column to family_members table (profile data)
ALTER TABLE public.family_members
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create audit_logs table for LGPD compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (user_id = auth.uid());

-- System can insert audit logs (via service role)
CREATE POLICY "Authenticated users can create audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if relevant fields changed
  IF OLD.display_name IS DISTINCT FROM NEW.display_name 
     OR OLD.cpf IS DISTINCT FROM NEW.cpf
     OR OLD.birth_date IS DISTINCT FROM NEW.birth_date
     OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    
    INSERT INTO public.audit_logs (user_id, family_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      NEW.user_id,
      NEW.family_id,
      'PROFILE_UPDATED',
      'family_member',
      NEW.id,
      jsonb_build_object(
        'display_name', OLD.display_name,
        'avatar_url', OLD.avatar_url
      ),
      jsonb_build_object(
        'display_name', NEW.display_name,
        'avatar_url', NEW.avatar_url
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile change auditing
DROP TRIGGER IF EXISTS trigger_log_profile_change ON public.family_members;
CREATE TRIGGER trigger_log_profile_change
AFTER UPDATE ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_change();