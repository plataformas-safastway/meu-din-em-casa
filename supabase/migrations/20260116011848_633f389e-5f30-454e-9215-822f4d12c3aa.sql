-- Open Finance Connections table
CREATE TABLE public.openfinance_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL DEFAULT 'pluggy',
  institution_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  institution_logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'NEEDS_RECONNECT', 'EXPIRED', 'DISCONNECTED', 'ERROR')),
  consent_scopes TEXT[] DEFAULT '{}',
  consent_created_at TIMESTAMPTZ,
  consent_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  error_message TEXT,
  external_item_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Open Finance Accounts table
CREATE TABLE public.openfinance_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.openfinance_connections(id) ON DELETE CASCADE,
  external_account_id TEXT NOT NULL,
  account_type TEXT NOT NULL,
  nickname TEXT,
  currency TEXT DEFAULT 'BRL',
  current_balance NUMERIC,
  available_balance NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Open Finance Cards table
CREATE TABLE public.openfinance_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.openfinance_connections(id) ON DELETE CASCADE,
  external_card_id TEXT NOT NULL,
  brand TEXT,
  display_name TEXT,
  last4 TEXT,
  credit_limit NUMERIC,
  available_limit NUMERIC,
  statement_close_day INTEGER,
  due_day INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Open Finance Raw Transactions (for audit)
CREATE TABLE public.openfinance_transactions_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('ACCOUNT', 'CARD')),
  source_id UUID NOT NULL,
  external_transaction_id TEXT,
  date DATE NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BRL',
  merchant TEXT,
  category_hint TEXT,
  raw_payload JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_id, external_transaction_id)
);

-- Open Finance Sync Logs
CREATE TABLE public.openfinance_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.openfinance_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('FULL', 'INCREMENTAL')),
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  transactions_imported INTEGER DEFAULT 0,
  accounts_synced INTEGER DEFAULT 0,
  cards_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.openfinance_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openfinance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openfinance_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openfinance_transactions_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openfinance_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for openfinance_connections
CREATE POLICY "Members can view connections" ON public.openfinance_connections
  FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create connections" ON public.openfinance_connections
  FOR INSERT WITH CHECK (is_family_member(family_id));
CREATE POLICY "Members can update connections" ON public.openfinance_connections
  FOR UPDATE USING (is_family_member(family_id));
CREATE POLICY "Members can delete connections" ON public.openfinance_connections
  FOR DELETE USING (is_family_member(family_id));

-- RLS Policies for openfinance_accounts
CREATE POLICY "Members can view accounts" ON public.openfinance_accounts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));
CREATE POLICY "Members can manage accounts" ON public.openfinance_accounts
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

-- RLS Policies for openfinance_cards
CREATE POLICY "Members can view cards" ON public.openfinance_cards
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));
CREATE POLICY "Members can manage cards" ON public.openfinance_cards
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

-- RLS Policies for openfinance_transactions_raw
CREATE POLICY "Members can view raw transactions" ON public.openfinance_transactions_raw
  FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can manage raw transactions" ON public.openfinance_transactions_raw
  FOR ALL USING (is_family_member(family_id));

-- RLS Policies for openfinance_sync_logs
CREATE POLICY "Members can view sync logs" ON public.openfinance_sync_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));
CREATE POLICY "Members can manage sync logs" ON public.openfinance_sync_logs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

-- Add source column to transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'source') THEN
    ALTER TABLE public.transactions ADD COLUMN source TEXT DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'UPLOAD', 'OPEN_FINANCE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'source_ref_id') THEN
    ALTER TABLE public.transactions ADD COLUMN source_ref_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'review_status') THEN
    ALTER TABLE public.transactions ADD COLUMN review_status TEXT DEFAULT 'CONFIRMED' CHECK (review_status IN ('CONFIRMED', 'NEEDS_REVIEW'));
  END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_openfinance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_openfinance_connections_updated_at
  BEFORE UPDATE ON public.openfinance_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_openfinance_updated_at();

CREATE TRIGGER update_openfinance_accounts_updated_at
  BEFORE UPDATE ON public.openfinance_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_openfinance_updated_at();

CREATE TRIGGER update_openfinance_cards_updated_at
  BEFORE UPDATE ON public.openfinance_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_openfinance_updated_at();