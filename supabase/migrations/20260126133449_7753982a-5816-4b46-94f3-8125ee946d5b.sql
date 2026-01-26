-- Remove the public access policy on education_content
DROP POLICY IF EXISTS "Anyone can read active education content" ON public.education_content;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can read education content"
ON public.education_content
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Also secure education_tips_shown table (ensure only authenticated users)
DROP POLICY IF EXISTS "Users can read their own tips" ON public.education_tips_shown;
DROP POLICY IF EXISTS "Users can insert their own tips" ON public.education_tips_shown;
DROP POLICY IF EXISTS "Users can update their own tips" ON public.education_tips_shown;

CREATE POLICY "Users can read their own tips"
ON public.education_tips_shown
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tips"
ON public.education_tips_shown
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tips"
ON public.education_tips_shown
FOR UPDATE
USING (auth.uid() = user_id);