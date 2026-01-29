-- Add accounting_regime column to families table
-- Default is 'cash_basis' (Fluxo de Caixa) as per requirements
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS accounting_regime TEXT NOT NULL DEFAULT 'cash_basis' 
CHECK (accounting_regime IN ('cash_basis', 'accrual_basis'));

-- Add comment for documentation
COMMENT ON COLUMN public.families.accounting_regime IS 'Regime contábil: cash_basis (Fluxo de Caixa - padrão) ou accrual_basis (Competência)';