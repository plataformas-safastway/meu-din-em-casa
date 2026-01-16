-- Corrigir política de ebooks para ser mais restritiva
DROP POLICY IF EXISTS "Owners can manage ebooks" ON public.ebook_ctas;

-- Políticas específicas por operação
CREATE POLICY "Owners can insert ebooks" ON public.ebook_ctas FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "Owners can update ebooks" ON public.ebook_ctas FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "Owners can delete ebooks" ON public.ebook_ctas FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid() AND role = 'owner'));