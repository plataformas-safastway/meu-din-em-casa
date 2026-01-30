-- Create enum for institution types
CREATE TYPE public.institution_type AS ENUM (
  'retail_bank',
  'digital_bank', 
  'investment_bank',
  'cooperative',
  'international'
);

-- Create financial_institutions table
CREATE TABLE public.financial_institutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT, -- COMPE/Bacen code, nullable for digital banks
  type public.institution_type NOT NULL DEFAULT 'retail_bank',
  show_manual BOOLEAN NOT NULL DEFAULT true,
  logo_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create card_brands table
CREATE TABLE public.card_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_brands ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "Financial institutions are viewable by everyone"
  ON public.financial_institutions FOR SELECT USING (true);

CREATE POLICY "Card brands are viewable by everyone"
  ON public.card_brands FOR SELECT USING (true);

-- Insert card brands with logos
INSERT INTO public.card_brands (name, slug, logo_url) VALUES
  ('Mastercard', 'mastercard', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png'),
  ('Visa', 'visa', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png'),
  ('Elo', 'elo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Bandeira_Elo.png/200px-Bandeira_Elo.png'),
  ('American Express', 'amex', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/200px-American_Express_logo_%282018%29.svg.png'),
  ('Hipercard', 'hipercard', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Hipercard_logo.svg/200px-Hipercard_logo.svg.png');

-- Insert Brazilian financial institutions
INSERT INTO public.financial_institutions (name, code, type, logo_url) VALUES
  -- Retail Banks (Grandes Bancos)
  ('Banco do Brasil', '001', 'retail_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Banco_do_Brasil_logo.svg/200px-Banco_do_Brasil_logo.svg.png'),
  ('Bradesco', '237', 'retail_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Bradesco_logo_%28vertical%29.svg/200px-Bradesco_logo_%28vertical%29.svg.png'),
  ('Itaú Unibanco', '341', 'retail_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Itau_Unibanco_logo.svg/200px-Itau_Unibanco_logo.svg.png'),
  ('Santander', '033', 'retail_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Banco_Santander_Logotipo.svg/200px-Banco_Santander_Logotipo.svg.png'),
  ('Caixa Econômica Federal', '104', 'retail_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Caixa_Economica_Federal_logo.svg/200px-Caixa_Economica_Federal_logo.svg.png'),
  ('Banrisul', '041', 'retail_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Banrisul_logo.svg/200px-Banrisul_logo.svg.png'),
  ('BRB', '070', 'retail_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/BRB_logo.svg/200px-BRB_logo.svg.png'),
  
  -- Digital Banks (Bancos Digitais)
  ('Nubank', '260', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Nubank_logo_2021.svg/200px-Nubank_logo_2021.svg.png'),
  ('Inter', '077', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Banco_Inter_logo.svg/200px-Banco_Inter_logo.svg.png'),
  ('C6 Bank', '336', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/C6_Bank_logo.svg/200px-C6_Bank_logo.svg.png'),
  ('PagBank', '290', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/PagSeguro_logo.svg/200px-PagSeguro_logo.svg.png'),
  ('Neon', '735', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Neon_Fintech_logo.svg/200px-Neon_Fintech_logo.svg.png'),
  ('Next', '237', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Next_banco_logo.svg/200px-Next_banco_logo.svg.png'),
  ('Original', '212', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Banco_Original_logo.svg/200px-Banco_Original_logo.svg.png'),
  ('Digio', '335', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Digio_logo.svg/200px-Digio_logo.svg.png'),
  ('Will Bank', '280', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Will_bank_logo.svg/200px-Will_bank_logo.svg.png'),
  ('Mercado Pago', '323', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Mercado_Pago_logo.svg/200px-Mercado_Pago_logo.svg.png'),
  ('PicPay', '380', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/PicPay_logo.svg/200px-PicPay_logo.svg.png'),
  ('99Pay', NULL, 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/99_logo.svg/200px-99_logo.svg.png'),
  ('Iti', '341', 'digital_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Iti_logo.svg/200px-Iti_logo.svg.png'),
  
  -- Investment Banks (com conta digital)
  ('BTG Pactual', '208', 'investment_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/BTG_Pactual_logo.svg/200px-BTG_Pactual_logo.svg.png'),
  ('XP Investimentos', '102', 'investment_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/XP_Investimentos_logo.svg/200px-XP_Investimentos_logo.svg.png'),
  ('Rico', '102', 'investment_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Rico_logo.svg/200px-Rico_logo.svg.png'),
  ('Clear', '102', 'investment_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Clear_Corretora_logo.svg/200px-Clear_Corretora_logo.svg.png'),
  ('Genial Investimentos', '125', 'investment_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Genial_Investimentos_logo.svg/200px-Genial_Investimentos_logo.svg.png'),
  ('Safra', '422', 'investment_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Banco_Safra_logo.svg/200px-Banco_Safra_logo.svg.png'),
  ('Modal', '746', 'investment_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Banco_Modal_logo.svg/200px-Banco_Modal_logo.svg.png'),
  ('Toro Investimentos', NULL, 'investment_bank', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Toro_Investimentos_logo.svg/200px-Toro_Investimentos_logo.svg.png'),
  
  -- Cooperatives
  ('Sicoob', '756', 'cooperative', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Sicoob_logo.svg/200px-Sicoob_logo.svg.png'),
  ('Sicredi', '748', 'cooperative', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Sicredi_logo.svg/200px-Sicredi_logo.svg.png'),
  ('Unicred', '136', 'cooperative', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Unicred_logo.svg/200px-Unicred_logo.svg.png'),
  ('Cresol', '133', 'cooperative', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Cresol_logo.svg/200px-Cresol_logo.svg.png'),
  
  -- International
  ('Wise', NULL, 'international', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Wise_Logo.svg/200px-Wise_Logo.svg.png'),
  ('Nomad', NULL, 'international', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Nomad_Global_logo.svg/200px-Nomad_Global_logo.svg.png'),
  ('Avenue', NULL, 'international', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Avenue_Securities_logo.svg/200px-Avenue_Securities_logo.svg.png'),
  ('Remessa Online', NULL, 'international', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Remessa_Online_logo.svg/200px-Remessa_Online_logo.svg.png'),
  ('Revolut', NULL, 'international', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Revolut_logo.svg/200px-Revolut_logo.svg.png'),
  ('N26', NULL, 'international', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/N26_logo.svg/200px-N26_logo.svg.png');

-- Create indexes for matching
CREATE INDEX idx_financial_institutions_code ON public.financial_institutions(code) WHERE code IS NOT NULL;
CREATE INDEX idx_financial_institutions_name ON public.financial_institutions(LOWER(name));
CREATE INDEX idx_financial_institutions_active ON public.financial_institutions(active, show_manual);

-- Add foreign key from bank_accounts to financial_institutions (optional migration)
-- First update existing bank_accounts to reference new table
ALTER TABLE public.bank_accounts 
  ADD COLUMN institution_id UUID REFERENCES public.financial_institutions(id);

-- Add brand_id to credit_cards
ALTER TABLE public.credit_cards
  ADD COLUMN brand_id UUID REFERENCES public.card_brands(id);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_institutions_updated_at
  BEFORE UPDATE ON public.financial_institutions
  FOR EACH ROW EXECUTE FUNCTION public.update_openfinance_updated_at();