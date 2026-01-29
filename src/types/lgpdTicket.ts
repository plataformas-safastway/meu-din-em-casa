/**
 * LGPD Tickets - Types
 * Contato com o DPO (Data Protection Officer)
 */

export type LgpdTicketType = 
  | 'PRIVACY_QUESTION'
  | 'DATA_ACCESS'
  | 'DATA_CORRECTION'
  | 'DATA_DELETION'
  | 'CONSENT_REVOCATION'
  | 'DATA_PORTABILITY'
  | 'OTHER';

export type LgpdTicketStatus = 
  | 'OPEN'
  | 'IN_REVIEW'
  | 'ANSWERED'
  | 'CLOSED';

export type LgpdTicketPriority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export type LgpdMessageAuthorRole = 
  | 'USER'
  | 'ADMIN'
  | 'DPO'
  | 'SYSTEM';

export interface LgpdTicket {
  id: string;
  protocol: string;
  family_id: string;
  requester_user_id: string;
  requester_member_id: string | null;
  ticket_type: LgpdTicketType;
  subject: string;
  message: string;
  data_category: string | null;
  status: LgpdTicketStatus;
  priority: LgpdTicketPriority;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  last_response_at: string | null;
  unread_by_user: boolean;
}

export interface LgpdTicketMessage {
  id: string;
  ticket_id: string;
  author_role: LgpdMessageAuthorRole;
  author_user_id: string | null;
  author_name: string | null;
  message: string;
  is_internal: boolean;
  created_at: string;
}

// Labels para exibição
export const TICKET_TYPE_LABELS: Record<LgpdTicketType, string> = {
  PRIVACY_QUESTION: 'Dúvida sobre privacidade/LGPD',
  DATA_ACCESS: 'Acesso aos meus dados',
  DATA_CORRECTION: 'Correção de dados',
  DATA_DELETION: 'Exclusão/encerramento de conta',
  CONSENT_REVOCATION: 'Revogação de consentimento',
  DATA_PORTABILITY: 'Portabilidade de dados',
  OTHER: 'Outro assunto',
};

export const TICKET_STATUS_LABELS: Record<LgpdTicketStatus, string> = {
  OPEN: 'Aberto',
  IN_REVIEW: 'Em análise',
  ANSWERED: 'Respondido',
  CLOSED: 'Encerrado',
};

export const TICKET_PRIORITY_LABELS: Record<LgpdTicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

export const DATA_CATEGORY_OPTIONS = [
  { value: 'cadastro', label: 'Dados cadastrais' },
  { value: 'financeiro', label: 'Dados financeiros' },
  { value: 'familia', label: 'Dados da família' },
  { value: 'acesso', label: 'Dados de acesso/login' },
  { value: 'outros', label: 'Outros' },
];
