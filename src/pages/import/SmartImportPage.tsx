import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { CpfVerificationModal } from "@/components/import/CpfVerificationModal";
import { ImportOwnershipConfirmation } from "@/components/import/ImportOwnershipConfirmation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type FileType = "ofx" | "xlsx" | "pdf" | null;

interface SmartImportPageProps {
  onBack: () => void;
}

export function SmartImportPage({ onBack }: SmartImportPageProps) {
  const navigate = useNavigate();
  const { familyMember, family } = useAuth();
  const { data: bankAccounts } = useBankAccounts();
  const { data: creditCards } = useCreditCards();

  // States
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCpfModal, setShowCpfModal] = useState(false);

  // Check if user has CPF registered
  const hasCpf = !!((familyMember as { cpf?: string })?.cpf) && ((familyMember as { cpf?: string })?.cpf?.length || 0) === 11;

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    let detectedType: FileType = null;

    if (fileName.endsWith(".ofx")) {
      detectedType = "ofx";
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      detectedType = "xlsx";
    } else if (fileName.endsWith(".pdf")) {
      detectedType = "pdf";
    }

    if (!detectedType) {
      toast.error("Formato não suportado", {
        description: "Envie arquivos OFX, XLS, XLSX ou PDF.",
      });
      return;
    }

    setFile(selectedFile);
    setFileType(detectedType);
  }, []);

  // Clear file
  const clearFile = useCallback(() => {
    setFile(null);
    setFileType(null);
    setOwnershipConfirmed(false);
  }, []);

  // Get file type info
  const getFileTypeInfo = useMemo(() => {
    switch (fileType) {
      case "ofx":
        return {
          icon: FileText,
          label: "OFX",
          color: "text-green-600",
          bg: "bg-green-100 dark:bg-green-900/30",
          description: "Formato padrão bancário • Alta precisão",
        };
      case "xlsx":
        return {
          icon: FileSpreadsheet,
          label: "Excel",
          color: "text-emerald-600",
          bg: "bg-emerald-100 dark:bg-emerald-900/30",
          description: "Planilha • Precisão média",
        };
      case "pdf":
        return {
          icon: File,
          label: "PDF",
          color: "text-orange-600",
          bg: "bg-orange-100 dark:bg-orange-900/30",
          description: "Requer revisão • Pode precisar de senha",
        };
      default:
        return null;
    }
  }, [fileType]);

  // Handle submit
  const handleSubmit = async () => {
    if (!file || !fileType || !ownershipConfirmed) return;

    // Check CPF for PDF/XLSX files
    if ((fileType === "pdf" || fileType === "xlsx") && !hasCpf) {
      setShowCpfModal(true);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("autoDetect", "true");
      
      // Use first bank account as default source if available, otherwise use a placeholder
      const defaultSourceId = bankAccounts?.[0]?.id || creditCards?.[0]?.id;
      if (defaultSourceId) {
        formData.append("sourceId", defaultSourceId);
      }

      const { data, error } = await supabase.functions.invoke('import-process', {
        body: formData,
      });

      if (error) {
        const errAny = error as unknown as { context?: any; message?: string };
        const ctx = errAny?.context;
        if (ctx?.needs_password || ctx?.needsPassword) {
          // Handle password-protected file
          toast.info("Arquivo protegido", {
            description: "Tentando desbloquear automaticamente...",
          });
          
          // Try with auto password
          formData.append("useAutoPassword", "true");

          const { data: retryData, error: retryError } = await supabase.functions.invoke('import-process', {
            body: formData,
          });

          const retryCtx = (retryError as any)?.context;
          if (retryError && (retryCtx?.needs_password || retryCtx?.needsPassword)) {
            toast.error("Não foi possível desbloquear", {
              description: "Verifique se seu CPF está cadastrado corretamente.",
            });
            setLoading(false);
            return;
          }

          const retryResult: any = retryData;
          if (retryResult?.import_id || retryResult?.importId) {
            toast.success("Arquivo processado!", {
              description: `${retryResult?.transactions_count || 0} transações encontradas.`,
            });
            const importId = retryResult?.import_id || retryResult?.importId;
            navigate(`/app/import/${importId}/review`);
            return;
          }
        }

        throw new Error(errAny?.message || "Erro ao processar arquivo");
      }

      const result: any = data;
      const importId = result?.import_id || result?.importId;
      if (importId) {
        toast.success("Arquivo processado!", {
          description: `${result.transactions_count || 0} transações encontradas.${
            result.detected_bank ? ` Banco: ${result.detected_bank}` : ""
          }`,
        });
        navigate(`/app/import/${importId}/review`);
      } else {
        toast.error("Nenhuma transação encontrada", {
          description: "Verifique se o arquivo está no formato correto.",
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro ao importar", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle CPF modal success
  const handleCpfSuccess = () => {
    setShowCpfModal(false);
    // Retry submission after CPF is saved
    handleSubmit();
  };

  const canSubmit = file && fileType && ownershipConfirmed && !loading;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Importar Extrato</h1>
              <p className="text-sm text-muted-foreground">
                Detecção automática de banco e tipo
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Smart Import Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Importação Inteligente</h3>
              <p className="text-sm text-muted-foreground mt-1">
                O OIK detecta automaticamente o banco, tipo de documento (extrato ou fatura), 
                e tenta desbloquear arquivos protegidos por senha usando seu CPF cadastrado.
              </p>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        {!file ? (
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              accept=".ofx,.xlsx,.xls,.pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <label
              htmlFor="file-upload"
              className={cn(
                "flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed",
                "border-border hover:border-primary/50 transition-colors cursor-pointer",
                "bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="font-medium text-foreground mb-1">
                Toque para selecionar arquivo
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Suportamos OFX, XLS, XLSX e PDF
              </p>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected File Card */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFileTypeInfo && (
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", getFileTypeInfo.bg)}>
                      <getFileTypeInfo.icon className={cn("w-6 h-6", getFileTypeInfo.color)} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getFileTypeInfo?.description}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Security Info for PDF/XLSX */}
            {(fileType === "pdf" || fileType === "xlsx") && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Desbloqueio automático
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Se o arquivo estiver protegido, tentaremos desbloquear usando seu CPF 
                      cadastrado. Seu CPF nunca é exibido ou registrado em logs.
                    </p>
                    {!hasCpf && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                        ⚠️ Você ainda não cadastrou seu CPF. Será solicitado ao prosseguir.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Ownership Confirmation */}
            <ImportOwnershipConfirmation
              confirmed={ownershipConfirmed}
              onConfirmChange={setOwnershipConfirmed}
            />

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-14 text-base"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Importar e revisar
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            O que acontece ao importar?
          </h3>
          <div className="space-y-2">
            {[
              { icon: "🔍", text: "Detectamos automaticamente o banco emissor" },
              { icon: "📋", text: "Identificamos se é extrato ou fatura" },
              { icon: "🔓", text: "Tentamos desbloquear com seu CPF (se protegido)" },
              { icon: "🏷️", text: "Categorizamos as transações com IA" },
              { icon: "👀", text: "Você revisa antes de confirmar" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* CPF Verification Modal */}
      <CpfVerificationModal
        open={showCpfModal}
        onOpenChange={setShowCpfModal}
        onSuccess={handleCpfSuccess}
        familyMemberId={familyMember?.id}
      />
    </div>
  );
}
