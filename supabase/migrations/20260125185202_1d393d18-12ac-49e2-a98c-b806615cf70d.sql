-- Create transaction_attachments table for receipts/invoices
CREATE TABLE IF NOT EXISTS public.transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'RECEIPT' CHECK (type IN ('RECEIPT', 'INVOICE', 'PROOF', 'OTHER')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'ALL' CHECK (visibility IN ('ALL', 'OWNER_ONLY')),
  ocr_extracted_data JSONB, -- Store raw OCR results for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for their family (respecting visibility)
CREATE POLICY "Users can view family attachments" 
ON public.transaction_attachments 
FOR SELECT 
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid()
  ) AND (
    visibility = 'ALL' OR uploaded_by = auth.uid()
  )
);

-- Policy: Users can insert attachments for their family
CREATE POLICY "Users can insert attachments" 
ON public.transaction_attachments 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() AND
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Only uploader can update their attachments
CREATE POLICY "Uploader can update attachments" 
ON public.transaction_attachments 
FOR UPDATE 
USING (uploaded_by = auth.uid());

-- Policy: Only uploader can delete their attachments
CREATE POLICY "Uploader can delete attachments" 
ON public.transaction_attachments 
FOR DELETE 
USING (uploaded_by = auth.uid());

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction 
ON public.transaction_attachments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_attachments_family 
ON public.transaction_attachments(family_id);

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 
  'receipts', 
  false, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts bucket
CREATE POLICY "Users can upload receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own receipts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own receipts" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger to update updated_at
CREATE TRIGGER update_transaction_attachments_updated_at
BEFORE UPDATE ON public.transaction_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();