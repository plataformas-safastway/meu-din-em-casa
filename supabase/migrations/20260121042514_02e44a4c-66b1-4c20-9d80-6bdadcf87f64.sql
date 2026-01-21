-- Add IMPORT to the transactions source check constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check 
CHECK (source IN ('MANUAL', 'UPLOAD', 'IMPORT', 'OPEN_FINANCE', 'GOAL_CONTRIBUTION'));