import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ImportResult {
  success: boolean;
  importId?: string;
  transactionsCount?: number;
  needsPassword?: boolean;
  detectedBank?: string;
  detectedType?: string;
  patternUsed?: number;
  error?: string;
}

interface UseImportWithCpfReturn {
  hasCpf: boolean;
  needsCpfModal: boolean;
  setNeedsCpfModal: (value: boolean) => void;
  familyMemberId: string | undefined;
  checkCpfAndProceed: () => boolean;
  uploadAndProcess: (
    file: File,
    sourceId: string,
    invoiceMonth?: string
  ) => Promise<ImportResult>;
  isProcessing: boolean;
}

export function useImportWithCpf(): UseImportWithCpfReturn {
  const { familyMember } = useAuth();
  const [needsCpfModal, setNeedsCpfModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user has CPF registered (familyMember may have cpf field)
  const hasCpf = !!(familyMember as { cpf?: string })?.cpf && ((familyMember as { cpf?: string })?.cpf?.length || 0) === 11;

  // Check CPF and return whether to proceed
  const checkCpfAndProceed = useCallback((): boolean => {
    if (!hasCpf) {
      setNeedsCpfModal(true);
      return false;
    }
    return true;
  }, [hasCpf]);

  // Upload file and process with automatic type/bank detection
  const uploadAndProcess = useCallback(
    async (
      file: File,
      sourceId: string,
      invoiceMonth?: string
    ): Promise<ImportResult> => {
      setIsProcessing(true);

      try {
        // Prepare FormData
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sourceId", sourceId);
        
        // Let the backend detect the type automatically
        formData.append("autoDetect", "true");
        
        if (invoiceMonth) {
          formData.append("invoiceMonth", invoiceMonth);
        }

        // Get auth token
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          return {
            success: false,
            error: "Sessão expirada. Faça login novamente.",
          };
        }

        // Send to edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-process`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          if (result.needs_password || result.needsPassword) {
            return {
              success: false,
              needsPassword: true,
            };
          }
          return {
            success: false,
            error: result.error || "Erro ao processar arquivo",
          };
        }

        return {
          success: true,
          importId: result.import_id,
          transactionsCount: result.transactions_count,
          detectedBank: result.detected_bank,
          detectedType: result.detected_type,
          patternUsed: result.pattern_used,
        };
      } catch (error) {
        console.error("Import error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    hasCpf,
    needsCpfModal,
    setNeedsCpfModal,
    familyMemberId: familyMember?.id,
    checkCpfAndProceed,
    uploadAndProcess,
    isProcessing,
  };
}
