-- Create monthly reports table for storing report data and closing status
CREATE TABLE public.monthly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  month_ref TEXT NOT NULL, -- Format: YYYY-MM
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  summary JSONB DEFAULT '{}'::jsonb,
  issues JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, month_ref)
);

-- Create report exports table for tracking PDF downloads
CREATE TABLE public.report_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  month_ref TEXT NOT NULL,
  requested_by UUID NOT NULL,
  file_path TEXT,
  signed_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

-- RLS for monthly_reports: family members can view/manage their reports
CREATE POLICY "Family members can view monthly reports"
ON public.monthly_reports FOR SELECT
USING (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Family admins can create monthly reports"
ON public.monthly_reports FOR INSERT
WITH CHECK (public.user_belongs_to_family(auth.uid(), family_id));

CREATE POLICY "Family admins can update monthly reports"
ON public.monthly_reports FOR UPDATE
USING (public.user_is_family_admin(auth.uid(), family_id));

-- RLS for report_exports: only the requester or family admins can access
CREATE POLICY "Users can view their own report exports"
ON public.report_exports FOR SELECT
USING (
  requested_by = auth.uid() 
  OR public.user_is_family_admin(auth.uid(), family_id)
);

CREATE POLICY "Family members can create report exports"
ON public.report_exports FOR INSERT
WITH CHECK (
  public.user_belongs_to_family(auth.uid(), family_id) 
  AND requested_by = auth.uid()
);

-- Indexes for performance
CREATE INDEX idx_monthly_reports_family_month ON public.monthly_reports(family_id, month_ref);
CREATE INDEX idx_report_exports_family ON public.report_exports(family_id);
CREATE INDEX idx_report_exports_expires ON public.report_exports(expires_at);

-- Trigger to update updated_at
CREATE TRIGGER update_monthly_reports_updated_at
BEFORE UPDATE ON public.monthly_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_openfinance_updated_at();

-- Create storage bucket for report PDFs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for report PDFs
CREATE POLICY "Users can download their family report PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'report-pdfs' 
  AND EXISTS (
    SELECT 1 FROM public.report_exports re
    WHERE re.file_path = name
    AND (re.requested_by = auth.uid() OR public.user_is_family_admin(auth.uid(), re.family_id))
    AND re.expires_at > now()
  )
);