-- Create OCR batches table
CREATE TABLE public.ocr_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'review', 'completed', 'failed')),
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  ready_items INTEGER DEFAULT 0,
  error_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create OCR items table
CREATE TABLE public.ocr_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.ocr_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_path TEXT, -- storage path for cleanup
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  extracted_data JSONB DEFAULT '{}',
  normalized_amount NUMERIC(12,2),
  normalized_date DATE,
  normalized_merchant TEXT,
  normalized_description TEXT,
  normalized_payment_method TEXT,
  normalized_cnpj TEXT,
  confidence INTEGER DEFAULT 0,
  suggested_category_id UUID,
  suggested_subcategory_id UUID,
  final_category_id UUID,
  final_subcategory_id UUID,
  final_payment_method TEXT,
  final_bank_account_id UUID REFERENCES public.bank_accounts(id),
  final_credit_card_id UUID REFERENCES public.credit_cards(id),
  is_recurring BOOLEAN DEFAULT false,
  is_duplicate_suspect BOOLEAN DEFAULT false,
  duplicate_reason TEXT,
  error_message TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_ocr_batches_family_id ON public.ocr_batches(family_id);
CREATE INDEX idx_ocr_batches_user_id ON public.ocr_batches(user_id);
CREATE INDEX idx_ocr_batches_status ON public.ocr_batches(status);
CREATE INDEX idx_ocr_items_batch_id ON public.ocr_items(batch_id);
CREATE INDEX idx_ocr_items_family_id ON public.ocr_items(family_id);
CREATE INDEX idx_ocr_items_status ON public.ocr_items(status);
CREATE INDEX idx_ocr_items_normalized_date ON public.ocr_items(normalized_date);

-- Enable RLS
ALTER TABLE public.ocr_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for ocr_batches
CREATE POLICY "Users can view their family's batches"
  ON public.ocr_batches FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can create batches for their family"
  ON public.ocr_batches FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update their family's batches"
  ON public.ocr_batches FOR UPDATE
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can delete their family's batches"
  ON public.ocr_batches FOR DELETE
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

-- RLS policies for ocr_items
CREATE POLICY "Users can view their family's items"
  ON public.ocr_items FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can create items for their family"
  ON public.ocr_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update their family's items"
  ON public.ocr_items FOR UPDATE
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can delete their family's items"
  ON public.ocr_items FOR DELETE
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

-- Trigger to update batch counts
CREATE OR REPLACE FUNCTION public.update_ocr_batch_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    UPDATE public.ocr_batches
    SET 
      total_items = (SELECT COUNT(*) FROM public.ocr_items WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)),
      processed_items = (SELECT COUNT(*) FROM public.ocr_items WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id) AND status IN ('ready', 'error')),
      ready_items = (SELECT COUNT(*) FROM public.ocr_items WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id) AND status = 'ready'),
      error_items = (SELECT COUNT(*) FROM public.ocr_items WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id) AND status = 'error'),
      updated_at = now()
    WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_ocr_batch_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.ocr_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ocr_batch_counts();

-- Trigger to update timestamps
CREATE TRIGGER update_ocr_batches_updated_at
  BEFORE UPDATE ON public.ocr_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ocr_items_updated_at
  BEFORE UPDATE ON public.ocr_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();