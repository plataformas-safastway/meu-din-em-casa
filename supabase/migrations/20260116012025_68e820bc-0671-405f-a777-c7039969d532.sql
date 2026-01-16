-- Fix function search path
CREATE OR REPLACE FUNCTION public.update_openfinance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Drop overly permissive ALL policies and create specific ones
DROP POLICY IF EXISTS "Members can manage accounts" ON public.openfinance_accounts;
DROP POLICY IF EXISTS "Members can manage cards" ON public.openfinance_cards;
DROP POLICY IF EXISTS "Members can manage raw transactions" ON public.openfinance_transactions_raw;
DROP POLICY IF EXISTS "Members can manage sync logs" ON public.openfinance_sync_logs;

-- Create specific policies for openfinance_accounts
CREATE POLICY "Members can insert accounts" ON public.openfinance_accounts
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

CREATE POLICY "Members can update accounts" ON public.openfinance_accounts
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

CREATE POLICY "Members can delete accounts" ON public.openfinance_accounts
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

-- Create specific policies for openfinance_cards
CREATE POLICY "Members can insert cards" ON public.openfinance_cards
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

CREATE POLICY "Members can update cards" ON public.openfinance_cards
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

CREATE POLICY "Members can delete cards" ON public.openfinance_cards
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

-- Create specific policies for openfinance_transactions_raw
CREATE POLICY "Members can insert raw transactions" ON public.openfinance_transactions_raw
  FOR INSERT WITH CHECK (is_family_member(family_id));

CREATE POLICY "Members can update raw transactions" ON public.openfinance_transactions_raw
  FOR UPDATE USING (is_family_member(family_id));

CREATE POLICY "Members can delete raw transactions" ON public.openfinance_transactions_raw
  FOR DELETE USING (is_family_member(family_id));

-- Create specific policies for openfinance_sync_logs
CREATE POLICY "Members can insert sync logs" ON public.openfinance_sync_logs
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

CREATE POLICY "Members can update sync logs" ON public.openfinance_sync_logs
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));

CREATE POLICY "Members can delete sync logs" ON public.openfinance_sync_logs
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.openfinance_connections c 
    WHERE c.id = connection_id AND is_family_member(c.family_id)
  ));