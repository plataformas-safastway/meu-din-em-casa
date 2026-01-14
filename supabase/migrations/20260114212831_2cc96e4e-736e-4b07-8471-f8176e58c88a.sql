-- Create enum for family member roles
CREATE TYPE public.family_role AS ENUM ('owner', 'member');

-- Create enum for bank account types
CREATE TYPE public.bank_account_type AS ENUM ('checking', 'savings', 'digital', 'salary');

-- Create enum for card types
CREATE TYPE public.card_type AS ENUM ('credit', 'debit', 'both');

-- Create enum for card brands
CREATE TYPE public.card_brand AS ENUM ('visa', 'mastercard', 'elo', 'amex', 'hipercard');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Create enum for payment methods
CREATE TYPE public.payment_method AS ENUM ('cash', 'debit', 'credit', 'pix', 'transfer');

-- Create enum for import file types
CREATE TYPE public.import_file_type AS ENUM ('ofx', 'xls', 'xlsx', 'pdf');

-- Create enum for import status
CREATE TYPE public.import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create families table
CREATE TABLE public.families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  members_count INTEGER NOT NULL DEFAULT 1,
  income_range TEXT,
  primary_objective TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family_members table (junction for users <-> families)
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role public.family_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);

-- Create banks reference table (pre-populated list)
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES public.banks(id),
  custom_bank_name TEXT,
  account_type public.bank_account_type NOT NULL DEFAULT 'checking',
  nickname TEXT NOT NULL,
  initial_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  card_name TEXT NOT NULL,
  brand public.card_brand NOT NULL DEFAULT 'visa',
  card_type public.card_type NOT NULL DEFAULT 'credit',
  credit_limit DECIMAL(15,2),
  closing_day INTEGER CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  description TEXT,
  date DATE NOT NULL,
  payment_method public.payment_method NOT NULL DEFAULT 'pix',
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  import_id UUID,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency_fund table
CREATE TABLE public.emergency_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE UNIQUE,
  target_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  target_months INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import_history table
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type public.import_file_type NOT NULL,
  file_size INTEGER,
  storage_path TEXT,
  source_type TEXT NOT NULL, -- 'bank_statement' or 'card_invoice'
  source_id UUID, -- bank_account_id or credit_card_id
  status public.import_status NOT NULL DEFAULT 'pending',
  total_transactions INTEGER DEFAULT 0,
  imported_transactions INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_family_members_user ON public.family_members(user_id);
CREATE INDEX idx_family_members_family ON public.family_members(family_id);
CREATE INDEX idx_bank_accounts_family ON public.bank_accounts(family_id);
CREATE INDEX idx_credit_cards_family ON public.credit_cards(family_id);
CREATE INDEX idx_transactions_family ON public.transactions(family_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);
CREATE INDEX idx_import_history_family ON public.import_history(family_id);

-- Enable RLS on all tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Create helper function to check family membership
CREATE OR REPLACE FUNCTION public.is_family_member(f_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = f_id
      AND user_id = auth.uid()
  )
$$;

-- Create helper function to check family ownership
CREATE OR REPLACE FUNCTION public.is_family_owner(f_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = f_id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
$$;

-- Create helper function to get user's family id
CREATE OR REPLACE FUNCTION public.get_user_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id
  FROM public.family_members
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- RLS Policies for families
CREATE POLICY "Users can view their own families"
  ON public.families
  FOR SELECT
  USING (public.is_family_member(id));

CREATE POLICY "Authenticated users can create families"
  ON public.families
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can update their families"
  ON public.families
  FOR UPDATE
  USING (public.is_family_owner(id));

-- RLS Policies for family_members
CREATE POLICY "Members can view family members"
  ON public.family_members
  FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Users can add themselves as owner when creating family"
  ON public.family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can manage other members"
  ON public.family_members
  FOR UPDATE
  USING (public.is_family_owner(family_id) AND user_id != auth.uid());

CREATE POLICY "Owners can remove other members"
  ON public.family_members
  FOR DELETE
  USING (public.is_family_owner(family_id) AND user_id != auth.uid());

-- RLS Policies for banks (public read, system managed)
CREATE POLICY "Anyone can view banks"
  ON public.banks
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for bank_accounts
CREATE POLICY "Members can view bank accounts"
  ON public.bank_accounts
  FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can create bank accounts"
  ON public.bank_accounts
  FOR INSERT
  WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Members can update bank accounts"
  ON public.bank_accounts
  FOR UPDATE
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can delete bank accounts"
  ON public.bank_accounts
  FOR DELETE
  USING (public.is_family_member(family_id));

-- RLS Policies for credit_cards
CREATE POLICY "Members can view credit cards"
  ON public.credit_cards
  FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can create credit cards"
  ON public.credit_cards
  FOR INSERT
  WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Members can update credit cards"
  ON public.credit_cards
  FOR UPDATE
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can delete credit cards"
  ON public.credit_cards
  FOR DELETE
  USING (public.is_family_member(family_id));

-- RLS Policies for transactions
CREATE POLICY "Members can view transactions"
  ON public.transactions
  FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can create transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Members can update transactions"
  ON public.transactions
  FOR UPDATE
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can delete transactions"
  ON public.transactions
  FOR DELETE
  USING (public.is_family_member(family_id));

-- RLS Policies for emergency_funds
CREATE POLICY "Members can view emergency fund"
  ON public.emergency_funds
  FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can create emergency fund"
  ON public.emergency_funds
  FOR INSERT
  WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Members can update emergency fund"
  ON public.emergency_funds
  FOR UPDATE
  USING (public.is_family_member(family_id));

-- RLS Policies for import_history
CREATE POLICY "Members can view import history"
  ON public.import_history
  FOR SELECT
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can create import history"
  ON public.import_history
  FOR INSERT
  WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Members can update import history"
  ON public.import_history
  FOR UPDATE
  USING (public.is_family_member(family_id));

CREATE POLICY "Members can delete import history"
  ON public.import_history
  FOR DELETE
  USING (public.is_family_member(family_id));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_funds_updated_at
  BEFORE UPDATE ON public.emergency_funds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Brazilian banks
INSERT INTO public.banks (name) VALUES
  ('Banco do Brasil'),
  ('Caixa Econômica Federal'),
  ('Bradesco'),
  ('Itaú Unibanco'),
  ('Santander Brasil'),
  ('Nubank'),
  ('Banco Inter'),
  ('C6 Bank'),
  ('BTG Pactual'),
  ('Banco Safra'),
  ('Sicredi'),
  ('Sicoob'),
  ('Banrisul'),
  ('Banco Original'),
  ('Neon'),
  ('PagBank'),
  ('Mercado Pago');

-- Create storage bucket for file imports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('financial_imports', 'financial_imports', false);

-- Storage RLS policies
CREATE POLICY "Members can view their family imports"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'financial_imports' AND public.is_family_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can upload to their family folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'financial_imports' AND public.is_family_member((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can delete their family imports"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'financial_imports' AND public.is_family_member((storage.foldername(name))[1]::uuid));