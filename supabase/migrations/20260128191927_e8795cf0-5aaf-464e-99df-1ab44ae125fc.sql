-- =====================================================
-- MERCHANT DIRECTORY: Cache local de comerciantes
-- =====================================================

-- Table for merchant enrichment cache (family-scoped and global)
CREATE TABLE IF NOT EXISTS public.merchant_directory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Scope: 'global' for common patterns, 'family' for user-confirmed
  scope TEXT NOT NULL DEFAULT 'family' CHECK (scope IN ('global', 'family')),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  
  -- Normalized key for matching (hash/slug of normalized descriptor)
  normalized_key TEXT NOT NULL,
  
  -- Original descriptor examples (for debugging)
  sample_descriptors TEXT[] DEFAULT '{}',
  
  -- Merchant identification
  merchant_name_display TEXT, -- Nome fantasia amigável
  legal_name TEXT, -- Razão social
  cnpj TEXT,
  
  -- Location (optional enrichment)
  address TEXT,
  city TEXT,
  state TEXT,
  
  -- Category suggestion
  category_id_suggested TEXT,
  subcategory_id_suggested TEXT,
  
  -- Confidence and evidence
  confidence_default DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence_default >= 0 AND confidence_default <= 1),
  evidence_summary TEXT, -- Human-readable evidence
  evidence_details JSONB DEFAULT '[]', -- Structured evidence array
  
  -- Source of this entry
  source TEXT NOT NULL DEFAULT 'HEURISTIC' CHECK (source IN ('USER_CONFIRMED', 'ENRICHED_EXTERNAL', 'HEURISTIC', 'PLATFORM_DETECTED')),
  
  -- Platform/gateway detection
  detected_platform TEXT, -- HOTMART, MERCADOPAGO, UBER, etc.
  is_intermediary BOOLEAN DEFAULT FALSE, -- True for gateways/marketplaces
  
  -- Match statistics
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one entry per normalized_key per scope/family
  CONSTRAINT merchant_directory_unique_key UNIQUE (scope, family_id, normalized_key)
);

-- Global entries must not have family_id
ALTER TABLE public.merchant_directory 
  ADD CONSTRAINT merchant_directory_scope_family_check 
  CHECK (
    (scope = 'global' AND family_id IS NULL) OR 
    (scope = 'family' AND family_id IS NOT NULL)
  );

-- Enable RLS
ALTER TABLE public.merchant_directory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view global merchant directory"
  ON public.merchant_directory
  FOR SELECT
  USING (scope = 'global');

CREATE POLICY "Users can view their family merchant directory"
  ON public.merchant_directory
  FOR SELECT
  USING (
    scope = 'family' AND 
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status::TEXT = 'ACTIVE'
    )
  );

CREATE POLICY "Users can insert family merchant entries"
  ON public.merchant_directory
  FOR INSERT
  WITH CHECK (
    scope = 'family' AND 
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status::TEXT = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update family merchant entries"
  ON public.merchant_directory
  FOR UPDATE
  USING (
    scope = 'family' AND 
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status::TEXT = 'ACTIVE'
    )
  );

-- Indexes for fast lookups
CREATE INDEX idx_merchant_directory_normalized_key ON public.merchant_directory(normalized_key);
CREATE INDEX idx_merchant_directory_family_key ON public.merchant_directory(family_id, normalized_key) WHERE scope = 'family';
CREATE INDEX idx_merchant_directory_global ON public.merchant_directory(normalized_key) WHERE scope = 'global';
CREATE INDEX idx_merchant_directory_platform ON public.merchant_directory(detected_platform) WHERE detected_platform IS NOT NULL;

-- Trigger to update updated_at
CREATE TRIGGER update_merchant_directory_updated_at
  BEFORE UPDATE ON public.merchant_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();