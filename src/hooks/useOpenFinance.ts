import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OpenFinanceConnection {
  id: string;
  family_id: string;
  provider_name: string;
  institution_id: string;
  institution_name: string;
  institution_logo_url: string | null;
  status: 'PENDING' | 'ACTIVE' | 'NEEDS_RECONNECT' | 'EXPIRED' | 'DISCONNECTED' | 'ERROR';
  consent_scopes: string[];
  consent_created_at: string | null;
  consent_expires_at: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  error_message: string | null;
  external_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpenFinanceAccount {
  id: string;
  connection_id: string;
  external_account_id: string;
  account_type: string;
  nickname: string | null;
  currency: string;
  current_balance: number | null;
  available_balance: number | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpenFinanceCard {
  id: string;
  connection_id: string;
  external_card_id: string;
  brand: string | null;
  display_name: string | null;
  last4: string | null;
  credit_limit: number | null;
  available_limit: number | null;
  statement_close_day: number | null;
  due_day: number | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpenFinanceSyncLog {
  id: string;
  connection_id: string;
  sync_type: 'FULL' | 'INCREMENTAL';
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at: string | null;
  transactions_imported: number;
  accounts_synced: number;
  cards_synced: number;
  error_message: string | null;
  created_at: string;
}

export interface PluggyInstitution {
  id: number;
  name: string;
  imageUrl: string;
  primaryColor: string;
  type: string;
  country: string;
  credentials: Array<{
    label: string;
    name: string;
    type: string;
    placeholder?: string;
  }>;
}

// Hook para verificar se o Pluggy está configurado
export function usePluggyConfig() {
  return useQuery({
    queryKey: ["pluggy-config"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pluggy-check-config");
      if (error) throw error;
      return data as { configured: boolean; hasClientId: boolean; hasClientSecret: boolean };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook para buscar instituições disponíveis
export function usePluggyInstitutions(search?: string) {
  return useQuery({
    queryKey: ["pluggy-institutions", search],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pluggy-institutions", {
        body: { search },
      });
      if (error) throw error;
      return data as { connectors: PluggyInstitution[] };
    },
    enabled: true,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook para buscar conexões da família
export function useOpenFinanceConnections() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["openfinance-connections", family?.id],
    queryFn: async () => {
      if (!family?.id) return [];
      
      const { data, error } = await supabase
        .from("openfinance_connections")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OpenFinanceConnection[];
    },
    enabled: !!family?.id,
  });
}

// Hook para buscar contas de uma conexão
export function useOpenFinanceAccounts(connectionId?: string) {
  return useQuery({
    queryKey: ["openfinance-accounts", connectionId],
    queryFn: async () => {
      if (!connectionId) return [];

      const { data, error } = await supabase
        .from("openfinance_accounts")
        .select("*")
        .eq("connection_id", connectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OpenFinanceAccount[];
    },
    enabled: !!connectionId,
  });
}

// Hook para buscar cartões de uma conexão
export function useOpenFinanceCards(connectionId?: string) {
  return useQuery({
    queryKey: ["openfinance-cards", connectionId],
    queryFn: async () => {
      if (!connectionId) return [];

      const { data, error } = await supabase
        .from("openfinance_cards")
        .select("*")
        .eq("connection_id", connectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OpenFinanceCard[];
    },
    enabled: !!connectionId,
  });
}

// Hook para buscar logs de sincronização
export function useOpenFinanceSyncLogs(connectionId?: string) {
  return useQuery({
    queryKey: ["openfinance-sync-logs", connectionId],
    queryFn: async () => {
      if (!connectionId) return [];

      const { data, error } = await supabase
        .from("openfinance_sync_logs")
        .select("*")
        .eq("connection_id", connectionId)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as OpenFinanceSyncLog[];
    },
    enabled: !!connectionId,
  });
}

// Hook para criar/atualizar conexão
export function useCreateConnection() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      institutionId: string;
      institutionName: string;
      institutionLogoUrl?: string;
      scopes: string[];
    }) => {
      if (!family?.id) throw new Error("Família não encontrada");

      const { data, error } = await supabase
        .from("openfinance_connections")
        .insert({
          family_id: family.id,
          institution_id: params.institutionId,
          institution_name: params.institutionName,
          institution_logo_url: params.institutionLogoUrl,
          consent_scopes: params.scopes,
          status: "PENDING",
        })
        .select()
        .single();

      if (error) throw error;
      return data as OpenFinanceConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openfinance-connections"] });
    },
    onError: (error) => {
      toast.error("Erro ao criar conexão: " + error.message);
    },
  });
}

// Hook para iniciar fluxo de consentimento
export function useStartConsentFlow() {
  return useMutation({
    mutationFn: async (params: {
      connectionId: string;
      institutionId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("pluggy-connect", {
        body: {
          connectionId: params.connectionId,
          institutionId: params.institutionId,
        },
      });

      if (error) throw error;
      return data as { connectUrl: string; accessToken: string };
    },
    onError: (error) => {
      toast.error("Erro ao iniciar conexão: " + error.message);
    },
  });
}

// Hook para sincronizar conexão
export function useSyncConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("pluggy-sync", {
        body: { connectionId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openfinance-connections"] });
      queryClient.invalidateQueries({ queryKey: ["openfinance-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["openfinance-cards"] });
      queryClient.invalidateQueries({ queryKey: ["openfinance-sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Sincronização iniciada!");
    },
    onError: (error) => {
      toast.error("Erro na sincronização: " + error.message);
    },
  });
}

// Hook para desconectar
export function useDisconnectConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("openfinance_connections")
        .update({ status: "DISCONNECTED" })
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openfinance-connections"] });
      toast.success("Conexão desconectada");
    },
    onError: (error) => {
      toast.error("Erro ao desconectar: " + error.message);
    },
  });
}

// Hook para deletar conexão
export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("openfinance_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openfinance-connections"] });
      toast.success("Conexão removida");
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });
}

// Hook para toggle conta ativa
export function useToggleAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { accountId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("openfinance_accounts")
        .update({ is_active: params.isActive })
        .eq("id", params.accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openfinance-accounts"] });
    },
  });
}

// Hook para toggle cartão ativo
export function useToggleCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { cardId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("openfinance_cards")
        .update({ is_active: params.isActive })
        .eq("id", params.cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openfinance-cards"] });
    },
  });
}
