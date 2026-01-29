/**
 * Hook para gerenciar tickets LGPD (Contato com o DPO)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  LgpdTicket, 
  LgpdTicketMessage, 
  LgpdTicketType,
  LgpdTicketStatus,
  LgpdTicketPriority,
  LgpdMessageAuthorRole,
} from '@/types/lgpdTicket';

// Fetch user's own tickets
export function useUserTickets() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lgpd-tickets', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('lgpd_tickets')
        .select('*')
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LgpdTicket[];
    },
    enabled: !!user?.id,
  });
}

// Fetch single ticket with messages
export function useTicketDetail(ticketId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lgpd-ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      
      // Fetch ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('lgpd_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
      
      if (ticketError) throw ticketError;
      
      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from('lgpd_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      return {
        ticket: ticket as LgpdTicket,
        messages: messages as LgpdTicketMessage[],
      };
    },
    enabled: !!ticketId && !!user?.id,
  });
}

// Create new ticket
export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user, family, familyMember } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      ticket_type: LgpdTicketType;
      subject: string;
      message: string;
      data_category?: string;
    }) => {
      if (!user?.id || !family?.id) {
        throw new Error('Usuário não autenticado');
      }
      
      const insertData = {
        family_id: family.id,
        requester_user_id: user.id,
        requester_member_id: familyMember?.id || null,
        ticket_type: data.ticket_type,
        subject: data.subject,
        message: data.message,
        data_category: data.data_category || null,
        // protocol, status, priority são definidos automaticamente pelo trigger
      };
      
      const { data: ticket, error } = await supabase
        .from('lgpd_tickets')
        .insert(insertData as any)
        .select()
        .single();
      
      if (error) throw error;
      return ticket as LgpdTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-tickets'] });
    },
  });
}

// Add message to ticket (user)
export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  const { user, familyMember } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      ticket_id: string;
      message: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { data: msg, error } = await supabase
        .from('lgpd_ticket_messages')
        .insert({
          ticket_id: data.ticket_id,
          author_role: 'USER',
          author_user_id: user.id,
          author_name: familyMember?.display_name || 'Usuário',
          message: data.message,
          is_internal: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return msg as LgpdTicketMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-ticket', variables.ticket_id] });
    },
  });
}

// Mark ticket as read (clear unread flag)
export function useMarkTicketRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ticketId: string) => {
      // This would require admin access, so we'll handle it differently
      // For now, just return the ticketId
      return ticketId;
    },
    onSuccess: (ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['lgpd-tickets'] });
    },
  });
}

// Count unread tickets (for notification badge)
export function useUnreadTicketsCount() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lgpd-tickets', 'unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from('lgpd_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('requester_user_id', user.id)
        .eq('unread_by_user', true);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
}

// =====================================================
// ADMIN HOOKS (Dashboard)
// =====================================================

// Fetch all tickets (admin)
export function useAllTickets(filters?: {
  status?: LgpdTicketStatus;
  priority?: string;
}) {
  return useQuery({
    queryKey: ['lgpd-tickets', 'admin', filters],
    queryFn: async () => {
      let query = supabase
        .from('lgpd_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority as LgpdTicketPriority);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as LgpdTicket[];
    },
  });
}

// Update ticket status (admin)
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      ticketId: string;
      status: LgpdTicketStatus;
    }) => {
      const updates: Partial<LgpdTicket> = {
        status: data.status,
      };
      
      if (data.status === 'CLOSED') {
        updates.closed_at = new Date().toISOString();
        updates.closed_by = user?.id;
      }
      
      const { data: ticket, error } = await supabase
        .from('lgpd_tickets')
        .update(updates)
        .eq('id', data.ticketId)
        .select()
        .single();
      
      if (error) throw error;
      return ticket as LgpdTicket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['lgpd-ticket', variables.ticketId] });
    },
  });
}

// Add response to ticket (admin)
export function useAdminAddResponse() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      ticketId: string;
      message: string;
      authorRole?: LgpdMessageAuthorRole;
      isInternal?: boolean;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');
      
      // Insert message
      const { error: msgError } = await supabase
        .from('lgpd_ticket_messages')
        .insert({
          ticket_id: data.ticketId,
          author_role: data.authorRole || 'ADMIN',
          author_user_id: user.id,
          author_name: 'Equipe OIK',
          message: data.message,
          is_internal: data.isInternal || false,
        });
      
      if (msgError) throw msgError;
      
      // Update ticket
      const updates: Record<string, any> = {
        last_response_at: new Date().toISOString(),
      };
      
      // If not internal, mark as unread for user and change status to ANSWERED
      if (!data.isInternal) {
        updates.unread_by_user = true;
        updates.status = 'ANSWERED';
      }
      
      const { error: ticketError } = await supabase
        .from('lgpd_tickets')
        .update(updates)
        .eq('id', data.ticketId);
      
      if (ticketError) throw ticketError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['lgpd-ticket', variables.ticketId] });
    },
  });
}

// Assign ticket to admin
export function useAssignTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      ticketId: string;
      assignedTo: string | null;
    }) => {
      const { error } = await supabase
        .from('lgpd_tickets')
        .update({ assigned_to: data.assignedTo })
        .eq('id', data.ticketId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['lgpd-ticket', variables.ticketId] });
    },
  });
}
