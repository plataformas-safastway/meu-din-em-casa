-- =====================================================
-- LGPD TICKETS (Contato com o DPO)
-- =====================================================

-- Enum para tipos de solicitação
CREATE TYPE lgpd_ticket_type AS ENUM (
  'PRIVACY_QUESTION',      -- Dúvida sobre privacidade/LGPD
  'DATA_ACCESS',           -- Acesso/relatório dos meus dados
  'DATA_CORRECTION',       -- Correção de dados
  'DATA_DELETION',         -- Exclusão/encerramento de conta
  'CONSENT_REVOCATION',    -- Revogação de consentimento
  'DATA_PORTABILITY',      -- Portabilidade
  'OTHER'                  -- Outro
);

-- Enum para status do ticket
CREATE TYPE lgpd_ticket_status AS ENUM (
  'OPEN',        -- Aberto
  'IN_REVIEW',   -- Em análise
  'ANSWERED',    -- Respondido
  'CLOSED'       -- Encerrado
);

-- Enum para prioridade
CREATE TYPE lgpd_ticket_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

-- Enum para autor da mensagem
CREATE TYPE lgpd_message_author_role AS ENUM (
  'USER',
  'ADMIN',
  'DPO',
  'SYSTEM'
);

-- Tabela principal de tickets
CREATE TABLE public.lgpd_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol TEXT NOT NULL UNIQUE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL,
  requester_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  ticket_type lgpd_ticket_type NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  data_category TEXT, -- cadastro, financeiro, família, acesso/login, outros
  status lgpd_ticket_status NOT NULL DEFAULT 'OPEN',
  priority lgpd_ticket_priority NOT NULL DEFAULT 'LOW',
  assigned_to UUID, -- admin user assigned to handle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  last_response_at TIMESTAMPTZ,
  unread_by_user BOOLEAN DEFAULT false -- para notificação de resposta
);

-- Tabela de mensagens do ticket
CREATE TABLE public.lgpd_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.lgpd_tickets(id) ON DELETE CASCADE,
  author_role lgpd_message_author_role NOT NULL,
  author_user_id UUID,
  author_name TEXT, -- nome do autor para exibição
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- notas internas (não visíveis ao usuário)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_lgpd_tickets_family ON public.lgpd_tickets(family_id);
CREATE INDEX idx_lgpd_tickets_requester ON public.lgpd_tickets(requester_user_id);
CREATE INDEX idx_lgpd_tickets_status ON public.lgpd_tickets(status);
CREATE INDEX idx_lgpd_tickets_priority ON public.lgpd_tickets(priority);
CREATE INDEX idx_lgpd_tickets_created ON public.lgpd_tickets(created_at DESC);
CREATE INDEX idx_lgpd_ticket_messages_ticket ON public.lgpd_ticket_messages(ticket_id);

-- Enable RLS
ALTER TABLE public.lgpd_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_ticket_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - TICKETS
-- =====================================================

-- Usuário pode ver seus próprios tickets
CREATE POLICY "Users can view own tickets" ON public.lgpd_tickets
  FOR SELECT USING (requester_user_id = auth.uid());

-- Usuário pode criar tickets para sua família
CREATE POLICY "Users can create tickets" ON public.lgpd_tickets
  FOR INSERT WITH CHECK (
    requester_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE user_id = auth.uid() AND family_id = lgpd_tickets.family_id
    )
  );

-- Admin/Legal pode ver todos os tickets
CREATE POLICY "Admins can view all tickets" ON public.lgpd_tickets
  FOR SELECT USING (
    public.has_legal_access(auth.uid()) OR
    public.is_admin_master(auth.uid())
  );

-- Admin/Legal pode atualizar tickets
CREATE POLICY "Admins can update tickets" ON public.lgpd_tickets
  FOR UPDATE USING (
    public.has_legal_access(auth.uid()) OR
    public.is_admin_master(auth.uid())
  );

-- =====================================================
-- RLS POLICIES - MESSAGES
-- =====================================================

-- Usuário pode ver mensagens não-internas dos seus tickets
CREATE POLICY "Users can view non-internal messages" ON public.lgpd_ticket_messages
  FOR SELECT USING (
    is_internal = false AND
    EXISTS (
      SELECT 1 FROM public.lgpd_tickets
      WHERE id = lgpd_ticket_messages.ticket_id
      AND requester_user_id = auth.uid()
    )
  );

-- Usuário pode criar mensagens nos seus tickets (tipo USER)
CREATE POLICY "Users can create messages" ON public.lgpd_ticket_messages
  FOR INSERT WITH CHECK (
    author_role = 'USER' AND
    author_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.lgpd_tickets
      WHERE id = lgpd_ticket_messages.ticket_id
      AND requester_user_id = auth.uid()
    )
  );

-- Admin/Legal pode ver todas as mensagens
CREATE POLICY "Admins can view all messages" ON public.lgpd_ticket_messages
  FOR SELECT USING (
    public.has_legal_access(auth.uid()) OR
    public.is_admin_master(auth.uid())
  );

-- Admin/Legal pode criar mensagens
CREATE POLICY "Admins can create messages" ON public.lgpd_ticket_messages
  FOR INSERT WITH CHECK (
    public.has_legal_access(auth.uid()) OR
    public.is_admin_master(auth.uid())
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Função para gerar protocolo único
CREATE OR REPLACE FUNCTION public.generate_lgpd_ticket_protocol()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_year TEXT;
  v_sequence INT;
  v_protocol TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  -- Get next sequence for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(protocol FROM 'DPO-' || v_year || '-(\d+)') AS INT)
  ), 0) + 1
  INTO v_sequence
  FROM public.lgpd_tickets
  WHERE protocol LIKE 'DPO-' || v_year || '-%';
  
  v_protocol := 'DPO-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');
  
  NEW.protocol := v_protocol;
  RETURN NEW;
END;
$$;

-- Trigger para gerar protocolo
CREATE TRIGGER generate_protocol_trigger
  BEFORE INSERT ON public.lgpd_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_lgpd_ticket_protocol();

-- Função para definir prioridade automaticamente
CREATE OR REPLACE FUNCTION public.set_lgpd_ticket_priority()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- HIGH: exclusão, revogação, acesso aos dados
  IF NEW.ticket_type IN ('DATA_DELETION', 'CONSENT_REVOCATION', 'DATA_ACCESS') THEN
    NEW.priority := 'HIGH';
  -- MEDIUM: correção, portabilidade
  ELSIF NEW.ticket_type IN ('DATA_CORRECTION', 'DATA_PORTABILITY') THEN
    NEW.priority := 'MEDIUM';
  -- LOW: dúvidas gerais
  ELSE
    NEW.priority := 'LOW';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para definir prioridade
CREATE TRIGGER set_priority_trigger
  BEFORE INSERT ON public.lgpd_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lgpd_ticket_priority();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_lgpd_ticket_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Trigger para atualizar timestamp
CREATE TRIGGER update_timestamp_trigger
  BEFORE UPDATE ON public.lgpd_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lgpd_ticket_timestamp();

-- Função para registrar auditoria de tickets
CREATE OR REPLACE FUNCTION public.audit_lgpd_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_action TEXT;
  v_metadata JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'LGPD_TICKET_CREATED';
    v_metadata := jsonb_build_object(
      'protocol', NEW.protocol,
      'type', NEW.ticket_type,
      'priority', NEW.priority
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      v_action := 'LGPD_TICKET_STATUS_CHANGED';
      v_metadata := jsonb_build_object(
        'protocol', NEW.protocol,
        'old_status', OLD.status,
        'new_status', NEW.status
      );
    ELSE
      v_action := 'LGPD_TICKET_UPDATED';
      v_metadata := jsonb_build_object('protocol', NEW.protocol);
    END IF;
  END IF;
  
  INSERT INTO public.audit_logs (
    user_id,
    family_id,
    action,
    entity_type,
    entity_id,
    metadata,
    module,
    severity
  ) VALUES (
    COALESCE(auth.uid(), NEW.requester_user_id),
    NEW.family_id,
    v_action,
    'lgpd_ticket',
    NEW.id::TEXT,
    v_metadata,
    'LGPD',
    CASE NEW.priority WHEN 'HIGH' THEN 'high' ELSE 'medium' END
  );
  
  RETURN NEW;
END;
$$;

-- Trigger de auditoria
CREATE TRIGGER audit_ticket_trigger
  AFTER INSERT OR UPDATE ON public.lgpd_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_lgpd_ticket_changes();