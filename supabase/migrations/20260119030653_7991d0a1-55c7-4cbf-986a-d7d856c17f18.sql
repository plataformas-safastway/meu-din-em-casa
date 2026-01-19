-- Drop the existing constraint and recreate with the new value
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_source_check 
  CHECK (source = ANY (ARRAY['MANUAL'::text, 'UPLOAD'::text, 'OPEN_FINANCE'::text, 'GOAL_CONTRIBUTION'::text]));