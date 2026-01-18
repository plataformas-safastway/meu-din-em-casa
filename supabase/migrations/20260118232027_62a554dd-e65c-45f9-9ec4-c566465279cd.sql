-- Create pix_keys table for storing Pix keys linked to bank accounts
CREATE TABLE public.pix_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  key_type TEXT NOT NULL CHECK (key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  key_value_masked TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pix_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view pix keys" ON public.pix_keys
FOR SELECT USING (is_family_member(family_id));

CREATE POLICY "Members can create pix keys" ON public.pix_keys
FOR INSERT WITH CHECK (is_family_member(family_id));

CREATE POLICY "Members can update pix keys" ON public.pix_keys
FOR UPDATE USING (is_family_member(family_id));

CREATE POLICY "Members can delete pix keys" ON public.pix_keys
FOR DELETE USING (is_family_member(family_id));

-- Create index for faster lookups
CREATE INDEX idx_pix_keys_bank_account ON public.pix_keys(bank_account_id);
CREATE INDEX idx_pix_keys_family ON public.pix_keys(family_id);