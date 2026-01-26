import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LegalVaultEntry {
  id: string;
  target_user_id: string;
  family_id: string;
  data_type: 'AUDIT_EVIDENCE' | 'FRAUD' | 'DISPUTE' | 'COURT_ORDER' | 'INCIDENT';
  payload: Record<string, unknown>;
  retention_until: string;
  sealed: boolean;
  created_at: string;
  created_by: string;
}

interface BreakglassGrant {
  id: string;
  requested_by: string;
  approved_by: string | null;
  scope: 'LEGAL_VAULT' | 'FULL_EXPORT' | 'INCIDENT_DETAILS' | 'AUDIT_FULL';
  target_user_id: string | null;
  family_id: string | null;
  reason_code: 'DSAR' | 'FRAUD' | 'COURT' | 'SECURITY' | 'OTHER';
  reason_text: string;
  expires_at: string;
  mfa_verified: boolean;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'USED';
  created_at: string;
  updated_at: string;
}

export function useLegalVault() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['legal-vault'],
    queryFn: async (): Promise<LegalVaultEntry[]> => {
      const { data, error } = await supabase
        .from('legal_vault')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useLegalVault] Error:', error);
        throw error;
      }

      return data as LegalVaultEntry[];
    },
    enabled: !!user,
  });
}

export function useBreakglassGrants() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['breakglass-grants'],
    queryFn: async (): Promise<BreakglassGrant[]> => {
      const { data, error } = await supabase
        .from('legal_access_grants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useBreakglassGrants] Error:', error);
        throw error;
      }

      return data as BreakglassGrant[];
    },
    enabled: !!user,
  });
}

export function useRequestBreakglass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      scope: BreakglassGrant['scope'];
      reason_code: BreakglassGrant['reason_code'];
      reason_text: string;
      family_id?: string;
      target_user_id?: string;
      expires_hours?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (params.expires_hours || 24));

      const { data, error } = await supabase
        .from('legal_access_grants')
        .insert({
          requested_by: user.id,
          scope: params.scope,
          reason_code: params.reason_code,
          reason_text: params.reason_text,
          family_id: params.family_id || null,
          target_user_id: params.target_user_id || null,
          expires_at: expiresAt.toISOString(),
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakglass-grants'] });
    },
  });
}

export function useApproveBreakglass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { grantId: string; approved: boolean }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('legal_access_grants')
        .update({
          approved_by: user.id,
          status: params.approved ? 'APPROVED' : 'DENIED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.grantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakglass-grants'] });
    },
  });
}

export function useVerifyBreakglassMFA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grantId: string) => {
      const { error } = await supabase
        .from('legal_access_grants')
        .update({
          mfa_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', grantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakglass-grants'] });
    },
  });
}
