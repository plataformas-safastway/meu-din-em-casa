import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MonthlyReport {
  id: string;
  family_id: string;
  month: number;
  year: number;
  report_content: {
    income: number;
    expenses: number;
    balance: number;
    categories: { categoryId: string; name: string; amount: number; percentage: number }[];
    topCategories: { name: string; amount: number }[];
    previousMonth: { income: number; expenses: number };
    aiReport: {
      diagnosis: string;
      recommendations: string[];
      impact: string;
      positives: string[];
    };
    generatedAt: string;
  };
  email_sent_at: string | null;
  email_recipient: string | null;
  created_at: string;
}

export function useMonthlyReports() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["monthly-reports", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("monthly_ai_reports")
        .select("*")
        .eq("family_id", family.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;
      return data as MonthlyReport[];
    },
    enabled: !!family,
  });
}

export function useLatestMonthlyReport() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["monthly-report-latest", family?.id],
    queryFn: async () => {
      if (!family) return null;

      const { data, error } = await supabase
        .from("monthly_ai_reports")
        .select("*")
        .eq("family_id", family.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MonthlyReport | null;
    },
    enabled: !!family,
  });
}

export function useGenerateMonthlyReport() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async ({ month, year }: { month?: number; year?: number } = {}) => {
      if (!family) throw new Error("No family");

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-monthly-report`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            familyId: family.id,
            month,
            year,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate report");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report-latest"] });
      toast.success("Relatório gerado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao gerar relatório", {
        description: error.message,
      });
    },
  });
}

export function useReportSettings() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["report-settings", family?.id],
    queryFn: async () => {
      if (!family) return null;

      const { data, error } = await supabase
        .from("families")
        .select("email_report_enabled, email_report_day, email_report_recipient")
        .eq("id", family.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function useUpdateReportSettings() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      email_report_enabled?: boolean;
      email_report_day?: number;
      email_report_recipient?: string;
    }) => {
      if (!family) throw new Error("No family");

      const { error } = await supabase
        .from("families")
        .update(settings)
        .eq("id", family.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-settings"] });
      toast.success("Configurações salvas!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar configurações", {
        description: error.message,
      });
    },
  });
}
