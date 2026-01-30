-- ========================================================
-- PADRONIZAÇÃO DE CONTAS BANCÁRIAS E CARTÕES DE CRÉDITO
-- Estrutura para cadastro manual, importação e Open Finance
-- ========================================================

-- 1. Adicionar código do banco à tabela banks
ALTER TABLE public.banks 
ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10);

-- Atualizar códigos dos bancos principais (FEBRABAN)
UPDATE public.banks SET bank_code = '341' WHERE LOWER(name) LIKE '%itaú%' OR LOWER(name) LIKE '%itau%';
UPDATE public.banks SET bank_code = '237' WHERE LOWER(name) LIKE '%bradesco%';
UPDATE public.banks SET bank_code = '033' WHERE LOWER(name) LIKE '%santander%';
UPDATE public.banks SET bank_code = '001' WHERE LOWER(name) LIKE '%brasil%' AND LOWER(name) NOT LIKE '%inter%';
UPDATE public.banks SET bank_code = '104' WHERE LOWER(name) LIKE '%caixa%' OR LOWER(name) LIKE '%cef%';
UPDATE public.banks SET bank_code = '260' WHERE LOWER(name) LIKE '%nubank%';
UPDATE public.banks SET bank_code = '077' WHERE LOWER(name) LIKE '%inter%';
UPDATE public.banks SET bank_code = '212' WHERE LOWER(name) LIKE '%original%';
UPDATE public.banks SET bank_code = '756' WHERE LOWER(name) LIKE '%sicoob%';
UPDATE public.banks SET bank_code = '748' WHERE LOWER(name) LIKE '%sicredi%';
UPDATE public.banks SET bank_code = '208' WHERE LOWER(name) LIKE '%btg%';
UPDATE public.banks SET bank_code = '336' WHERE LOWER(name) LIKE '%c6%';
UPDATE public.banks SET bank_code = '380' WHERE LOWER(name) LIKE '%picpay%';
UPDATE public.banks SET bank_code = '290' WHERE LOWER(name) LIKE '%pagbank%' OR LOWER(name) LIKE '%pagseguro%';
UPDATE public.banks SET bank_code = '735' WHERE LOWER(name) LIKE '%neon%';
UPDATE public.banks SET bank_code = '623' WHERE LOWER(name) LIKE '%safra%';

-- 2. Criar enum para tipo de titularidade
DO $$ BEGIN
  CREATE TYPE public.account_ownership_type AS ENUM ('individual', 'joint');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Adicionar novos campos à tabela bank_accounts
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS agency VARCHAR(10),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS account_digit VARCHAR(2),
ADD COLUMN IF NOT EXISTS ownership_type public.account_ownership_type DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS titleholders TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);

-- 4. Adicionar novos campos à tabela credit_cards
ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id),
ADD COLUMN IF NOT EXISTS card_holder VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_four_digits VARCHAR(4),
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);

-- 5. Criar índices para matching em importações/Open Finance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_matching 
ON public.bank_accounts(family_id, bank_id, agency, account_number) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_credit_cards_matching 
ON public.credit_cards(family_id, bank_id, last_four_digits, card_holder) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_banks_code 
ON public.banks(bank_code) 
WHERE bank_code IS NOT NULL;

-- 6. Comentários para documentação
COMMENT ON COLUMN public.bank_accounts.agency IS 'Agência bancária (opcional no cadastro manual, obrigatório em importações)';
COMMENT ON COLUMN public.bank_accounts.account_number IS 'Número da conta (opcional no cadastro manual, obrigatório em importações)';
COMMENT ON COLUMN public.bank_accounts.account_digit IS 'Dígito verificador da conta';
COMMENT ON COLUMN public.bank_accounts.ownership_type IS 'Tipo de titularidade: individual ou conjunta';
COMMENT ON COLUMN public.bank_accounts.titleholders IS 'Lista de titulares da conta (ex: ["Thiago", "Suellen"])';
COMMENT ON COLUMN public.bank_accounts.source IS 'Origem do cadastro: manual, import, openfinance';
COMMENT ON COLUMN public.bank_accounts.external_id IS 'ID externo para integração (Open Finance)';

COMMENT ON COLUMN public.credit_cards.bank_id IS 'Banco emissor do cartão';
COMMENT ON COLUMN public.credit_cards.card_holder IS 'Nome do titular do cartão';
COMMENT ON COLUMN public.credit_cards.last_four_digits IS 'Últimos 4 dígitos do cartão';
COMMENT ON COLUMN public.credit_cards.source IS 'Origem do cadastro: manual, import, openfinance';
COMMENT ON COLUMN public.credit_cards.external_id IS 'ID externo para integração (Open Finance)';

COMMENT ON COLUMN public.banks.bank_code IS 'Código FEBRABAN do banco (ex: 341 para Itaú)';