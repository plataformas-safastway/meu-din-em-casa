import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useHasCpf } from "@/hooks/useSensitiveProfile";

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
  isLoadingCpf: boolean;
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

  // Use the new sensitive profile hook to check CPF
  const { hasCpf, isLoading: isLoadingCpf } = useHasCpf();

  // Check CPF and return whether to proceed
  const checkCpfAndProceed = useCallback((): boolean => {
    if (!hasCpf) {
      setNeedsCpfModal(true);
      return false;
    }
    return true;
  }, [hasCpf]);

  // Upload file and process with automatic type/bank detection
  // Uses supabase.functions.invoke (standardized, no direct fetch)
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

        // Use supabase.functions.invoke instead of direct fetch
        const { data, error } = await supabase.functions.invoke('import-process', {
          body: formData,
        });

        if (error) {
          console.error("[useImportWithCpf] Edge function error:", error);
          return {
            success: false,
            error: error.message || "Erro ao processar arquivo",
          };
        }

        // Handle password-protected files
        if (data?.needs_password || data?.needsPassword) {
          return {
            success: false,
            needsPassword: true,
          };
        }

        // Handle other errors in response
        if (data?.error) {
          return {
            success: false,
            error: data.error,
          };
        }

        return {
          success: true,
          importId: data.import_id,
          transactionsCount: data.transactions_count,
          detectedBank: data.detected_bank,
          detectedType: data.detected_type,
          patternUsed: data.pattern_used,
        };
      } catch (error) {
        console.error("[useImportWithCpf] Import error:", error);
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
    isLoadingCpf,
    needsCpfModal,
    setNeedsCpfModal,
    familyMemberId: familyMember?.id,
    checkCpfAndProceed,
    uploadAndProcess,
    isProcessing,
  };
}
