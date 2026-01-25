-- Create transaction change logs table for complete audit trail
CREATE TABLE public.transaction_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by_user_id UUID NOT NULL,
  changed_by_user_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  batch_id UUID -- Optional: group changes from same save
);

-- Enable RLS
ALTER TABLE public.transaction_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view change logs for their family"
ON public.transaction_change_logs
FOR SELECT
USING (public.is_family_member(family_id));

CREATE POLICY "Users can insert change logs for their family"
ON public.transaction_change_logs
FOR INSERT
WITH CHECK (public.is_family_member(family_id));

-- Indexes for performance
CREATE INDEX idx_transaction_change_logs_transaction_id ON public.transaction_change_logs(transaction_id);
CREATE INDEX idx_transaction_change_logs_family_id ON public.transaction_change_logs(family_id);
CREATE INDEX idx_transaction_change_logs_changed_at ON public.transaction_change_logs(changed_at DESC);
CREATE INDEX idx_transaction_change_logs_changed_by ON public.transaction_change_logs(changed_by_user_id);

-- Admin/CS access policy
CREATE POLICY "CS can view all change logs"
ON public.transaction_change_logs
FOR SELECT
USING (public.has_cs_access(auth.uid()) OR public.has_support_access(auth.uid()));