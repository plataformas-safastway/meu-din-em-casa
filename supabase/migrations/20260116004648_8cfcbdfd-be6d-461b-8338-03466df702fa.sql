-- 1. Tabela de metas de orçamento por categoria
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  monthly_limit NUMERIC NOT NULL CHECK (monthly_limit > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  use_income_reference BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, category_id, subcategory_id)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view budgets" ON public.budgets FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create budgets" ON public.budgets FOR INSERT WITH CHECK (is_family_member(family_id));
CREATE POLICY "Members can update budgets" ON public.budgets FOR UPDATE USING (is_family_member(family_id));
CREATE POLICY "Members can delete budgets" ON public.budgets FOR DELETE USING (is_family_member(family_id));

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Tabela de transações recorrentes
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL,
  end_date DATE,
  payment_method TEXT NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('cash', 'debit', 'credit', 'pix', 'transfer')),
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view recurring_transactions" ON public.recurring_transactions FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create recurring_transactions" ON public.recurring_transactions FOR INSERT WITH CHECK (is_family_member(family_id));
CREATE POLICY "Members can update recurring_transactions" ON public.recurring_transactions FOR UPDATE USING (is_family_member(family_id));
CREATE POLICY "Members can delete recurring_transactions" ON public.recurring_transactions FOR DELETE USING (is_family_member(family_id));

CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Adicionar flag de geração automática nas transações
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS recurring_transaction_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- 4. Tabela de eBooks/CTAs para educação
CREATE TABLE public.ebook_ctas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Ver eBook',
  cta_link TEXT NOT NULL,
  theme TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ebook_ctas ENABLE ROW LEVEL SECURITY;

-- eBooks são públicos para leitura, mas apenas admins podem gerenciar
CREATE POLICY "Anyone can view active ebooks" ON public.ebook_ctas FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage ebooks" ON public.ebook_ctas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid() AND role = 'owner')
);

CREATE TRIGGER update_ebook_ctas_updated_at BEFORE UPDATE ON public.ebook_ctas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Mapeamento Places → Categoria
CREATE TABLE public.place_category_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_type TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.place_category_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mappings" ON public.place_category_mapping FOR SELECT USING (true);

-- Inserir mapeamentos padrão
INSERT INTO public.place_category_mapping (place_type, category_id, subcategory_id) VALUES
  ('restaurant', 'lazer', 'l-restaurantes'),
  ('cafe', 'lazer', 'l-restaurantes'),
  ('bar', 'lazer', 'l-restaurantes'),
  ('supermarket', 'alimentacao', 'a-supermercado'),
  ('grocery_or_supermarket', 'alimentacao', 'a-supermercado'),
  ('pharmacy', 'vida-saude', 'vs-medicamentos'),
  ('gas_station', 'transporte', 't-combustivel'),
  ('shopping_mall', 'diversos', 'div-outros'),
  ('clothing_store', 'roupas-estetica', 're-roupas'),
  ('beauty_salon', 'roupas-estetica', 're-cabeleireiro'),
  ('gym', 'vida-saude', 'vs-academia'),
  ('hospital', 'vida-saude', 'vs-consultas'),
  ('dentist', 'vida-saude', 'vs-consultas'),
  ('veterinary_care', 'pet', 'pet-veterinario'),
  ('pet_store', 'pet', 'pet-racao'),
  ('school', 'educacao-formacao', 'ef-cursos'),
  ('university', 'educacao-formacao', 'ef-cursos'),
  ('movie_theater', 'lazer', 'l-cinema'),
  ('bakery', 'alimentacao', 'a-padaria')
ON CONFLICT (place_type) DO NOTHING;

-- 6. Log de notificações (anti-spam)
CREATE TABLE public.notifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  place_id TEXT,
  category_id TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view notifications" ON public.notifications_log FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create notifications" ON public.notifications_log FOR INSERT WITH CHECK (is_family_member(family_id));

-- Index para consulta anti-spam
CREATE INDEX idx_notifications_log_spam ON public.notifications_log (family_id, place_id, created_at DESC);

-- 7. Tabela de regras de categorização aprendidas
CREATE TABLE public.category_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, keyword)
);

ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rules" ON public.category_rules FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create rules" ON public.category_rules FOR INSERT WITH CHECK (is_family_member(family_id));
CREATE POLICY "Members can update rules" ON public.category_rules FOR UPDATE USING (is_family_member(family_id));
CREATE POLICY "Members can delete rules" ON public.category_rules FOR DELETE USING (is_family_member(family_id));