-- Fix the family_members INSERT policy to allow first-time family creation
DROP POLICY IF EXISTS "Users can add themselves as owner when creating family" ON public.family_members;

-- Allow authenticated users to add themselves as a member
-- They must be adding themselves (user_id = auth.uid())
CREATE POLICY "Users can add themselves as family member" 
ON public.family_members 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());