import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_cycle: string;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  family_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'inactive' | 'cancelled' | 'overdue';
  started_at: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  payment_method: string | null;
  external_customer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  plan?: SubscriptionPlan;
  family?: {
    id: string;
    name: string;
    members_count: number;
  };
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  family_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_method: string | null;
  external_payment_id: string | null;
  paid_at: string | null;
  due_date: string;
  attempts: number;
  last_attempt_at: string | null;
  failure_reason: string | null;
  refund_amount: number | null;
  refunded_at: string | null;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  subscription?: UserSubscription;
  family?: {
    id: string;
    name: string;
  };
}

export interface Invoice {
  id: string;
  payment_id: string | null;
  family_id: string;
  invoice_number: string | null;
  external_invoice_id: string | null;
  status: 'pending' | 'processing' | 'issued' | 'error' | 'cancelled';
  amount: number;
  service_description: string;
  customer_name: string;
  customer_document: string;
  customer_email: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  issued_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  error_message: string | null;
  error_code: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  family?: {
    id: string;
    name: string;
  };
}

export interface FinancialMetrics {
  mrr: number;
  arr: number;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  trialUsers: number;
  overdueUsers: number;
  cancelledUsers: number;
  ticketMedio: number;
  churnRate: number;
  inadimplenciaRate: number;
  inadimplenciaValue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number;
}

// ==================== PLANS ====================
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      return (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : []
      })) as SubscriptionPlan[];
    },
  });
}

// ==================== SUBSCRIPTIONS ====================
export function useUserSubscriptions(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['user-subscriptions', filters],
    queryFn: async (): Promise<UserSubscription[]> => {
      let query = supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*),
          family:families(id, name, members_count)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as UserSubscription[];
    },
  });
}

export function useUpdateSubscriptionStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ subscriptionId, status, notes }: { 
      subscriptionId: string; 
      status: string; 
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        if (notes) updateData.cancellation_reason = notes;
      }
      
      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'SUBSCRIPTION_STATUS_CHANGED',
        entity_type: 'user_subscription',
        entity_id: subscriptionId,
        module: 'financial',
        new_value: { status, notes }
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
      toast.success('Status da assinatura atualizado');
    },
    onError: (error) => {
      console.error('Error updating subscription:', error);
      toast.error('Erro ao atualizar status');
    },
  });
}

// ==================== PAYMENTS ====================
export function useSubscriptionPayments(filters?: { status?: string; month?: string }) {
  return useQuery({
    queryKey: ['subscription-payments', filters],
    queryFn: async (): Promise<SubscriptionPayment[]> => {
      let query = supabase
        .from('subscription_payments')
        .select(`
          *,
          subscription:user_subscriptions(*, plan:subscription_plans(*)),
          family:families(id, name)
        `)
        .order('due_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as SubscriptionPayment[];
    },
  });
}

export function useRetryPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      // Get current payment to increment attempts
      const { data: currentPayment } = await supabase
        .from('subscription_payments')
        .select('attempts')
        .eq('id', paymentId)
        .single();

      // Update payment to processing and increment attempts
      const { error } = await supabase
        .from('subscription_payments')
        .update({
          status: 'processing',
          attempts: (currentPayment?.attempts || 0) + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'PAYMENT_RETRY',
        entity_type: 'subscription_payment',
        entity_id: paymentId,
        module: 'financial'
      });

      // TODO: Call payment gateway to reprocess
      // For now, simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-payments'] });
      toast.success('Cobrança reenviada para processamento');
    },
    onError: (error) => {
      console.error('Error retrying payment:', error);
      toast.error('Erro ao reprocessar cobrança');
    },
  });
}

// ==================== INVOICES ====================
export function useInvoices(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async (): Promise<Invoice[]> => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          family:families(id, name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Invoice[];
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (invoiceData: {
      payment_id?: string;
      family_id: string;
      amount: number;
      customer_name: string;
      customer_document: string;
      customer_email?: string;
      service_description?: string;
    }) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'INVOICE_CREATED',
        entity_type: 'invoice',
        entity_id: data.id,
        module: 'financial',
        new_value: { amount: invoiceData.amount, family_id: invoiceData.family_id }
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Nota fiscal criada');
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
      toast.error('Erro ao criar nota fiscal');
    },
  });
}

export function useEmitInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Update status to processing
      await supabase
        .from('invoices')
        .update({ status: 'processing' })
        .eq('id', invoiceId);

      // TODO: Call Enotas API to emit invoice
      // For now, simulate emission
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful emission
      const mockInvoiceNumber = `NF-${Date.now()}`;
      
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'issued',
          invoice_number: mockInvoiceNumber,
          issued_at: new Date().toISOString(),
          pdf_url: `https://storage.example.com/invoices/${mockInvoiceNumber}.pdf`,
          xml_url: `https://storage.example.com/invoices/${mockInvoiceNumber}.xml`
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'INVOICE_EMITTED',
        entity_type: 'invoice',
        entity_id: invoiceId,
        module: 'financial',
        new_value: { invoice_number: mockInvoiceNumber }
      });

      return { invoice_number: mockInvoiceNumber };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Nota fiscal emitida com sucesso');
    },
    onError: (error) => {
      console.error('Error emitting invoice:', error);
      toast.error('Erro ao emitir nota fiscal');
    },
  });
}

// ==================== METRICS ====================
export function useFinancialMetrics() {
  return useQuery({
    queryKey: ['financial-metrics'],
    queryFn: async (): Promise<FinancialMetrics> => {
      // Fetch subscriptions with plans
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*, plan:subscription_plans(*)');

      if (subError) throw subError;

      // Fetch payments this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

      const { data: paymentsThisMonth } = await supabase
        .from('subscription_payments')
        .select('amount, status')
        .gte('paid_at', startOfMonth.toISOString())
        .eq('status', 'paid');

      const { data: paymentsLastMonth } = await supabase
        .from('subscription_payments')
        .select('amount, status')
        .gte('paid_at', startOfLastMonth.toISOString())
        .lt('paid_at', startOfMonth.toISOString())
        .eq('status', 'paid');

      const { data: overduePayments } = await supabase
        .from('subscription_payments')
        .select('amount')
        .eq('status', 'failed');

      // Calculate metrics
      const subs = subscriptions || [];
      const totalUsers = subs.length;
      const activeUsers = subs.filter(s => s.status === 'active').length;
      const trialUsers = subs.filter(s => s.status === 'trial').length;
      const inactiveUsers = subs.filter(s => s.status === 'inactive').length;
      const overdueUsers = subs.filter(s => s.status === 'overdue').length;
      const cancelledUsers = subs.filter(s => s.status === 'cancelled').length;

      // MRR = sum of active subscription prices
      const mrr = subs
        .filter(s => s.status === 'active' && s.plan)
        .reduce((sum, s) => sum + (s.plan?.price || 0), 0);

      const arr = mrr * 12;

      const ticketMedio = activeUsers > 0 ? mrr / activeUsers : 0;

      // Churn = cancelled this month / total at start of month
      // Simplified: cancelled / (active + cancelled)
      const churnRate = (activeUsers + cancelledUsers) > 0 
        ? (cancelledUsers / (activeUsers + cancelledUsers)) * 100 
        : 0;

      const revenueThisMonth = (paymentsThisMonth || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const revenueLastMonth = (paymentsLastMonth || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const revenueGrowth = revenueLastMonth > 0 
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
        : 0;

      const inadimplenciaValue = (overduePayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const inadimplenciaRate = mrr > 0 ? (inadimplenciaValue / mrr) * 100 : 0;

      return {
        mrr,
        arr,
        totalUsers,
        activeUsers,
        inactiveUsers,
        trialUsers,
        overdueUsers,
        cancelledUsers,
        ticketMedio,
        churnRate,
        inadimplenciaRate,
        inadimplenciaValue,
        revenueThisMonth,
        revenueLastMonth,
        revenueGrowth,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== AUDIT LOGS ====================
export function useFinancialAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ['financial-audit-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('module', 'financial')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}
