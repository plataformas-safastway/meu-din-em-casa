import { useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  X,
  TableIcon,
  Download,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CpfVerificationModal } from "@/components/import/CpfVerificationModal";
import { ImportOwnershipConfirmation } from "@/components/import/ImportOwnershipConfirmation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { savePendingImportId } from "@/hooks/useImportFlow";
import { useQueryClient } from "@tanstack/react-query";

type FileType = "ofx" | "xlsx" | "xls" | "pdf" | null;

export function ImportUploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { familyMember } = useAuth();

  // States
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCpfModal, setShowCpfModal] = useState(false);
  
  // Optional: Invoice month for credit card statements
  const [isCreditCardStatement, setIsCreditCardStatement] = useState(false);
  const [invoiceMonth, setInvoiceMonth] = useState("");

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
    } else if (fileName.endsWith(".xlsx")) {
      detectedType = "xlsx";
    } else if (fileName.endsWith(".xls")) {
      detectedType = "xls";
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
    
    // Try to detect if it's a credit card statement from filename
    const isCreditCard = /fatura|cartao|credit|invoice/i.test(fileName);
    setIsCreditCardStatement(isCreditCard);
  }, []);

  // Clear file
  const clearFile = useCallback(() => {
    setFile(null);
    setFileType(null);
    setOwnershipConfirmed(false);
    setIsCreditCardStatement(false);
    setInvoiceMonth("");
  }, []);

  // Get file type info
  const getFileTypeInfo = useMemo(() => {
    switch (fileType) {
      case "ofx":
        return {
          icon: FileText,
          label: "OFX",
          color: "text-success",
          bg: "bg-success/10",
          description: "Formato padrão bancário • Alta precisão",
        };
      case "xlsx":
      case "xls":
        return {
          icon: FileSpreadsheet,
          label: "Excel",
          color: "text-warning",
          bg: "bg-warning/10",
          description: "Planilha • Precisão média",
        };
      case "pdf":
        return {
          icon: File,
          label: "PDF",
          color: "text-destructive",
          bg: "bg-destructive/10",
          description: "Requer revisão • Pode precisar de senha",
        };
      default:
        return null;
    }
  }, [fileType]);

  // Get month options for credit card invoice
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = -1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!file || !fileType || !ownershipConfirmed) return;

    // Check CPF for PDF/XLSX files that might be password protected
    if ((fileType === "pdf" || fileType === "xlsx" || fileType === "xls") && !hasCpf) {
      setShowCpfModal(true);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("autoDetect", "true");
      
      // If user marked as credit card and selected invoice month
      if (isCreditCardStatement && invoiceMonth) {
        formData.append("invoiceMonth", invoiceMonth);
        formData.append("importType", "credit_card");
      }

      const { data, error } = await supabase.functions.invoke('import-process', {
        body: formData,
      });

      if (error) {
        const errAny = error as unknown as { context?: any; message?: string };
        const ctx = errAny?.context;
        if (ctx?.needs_password || ctx?.needsPassword) {
          // Handle password-protected file - try auto password
          toast.info("Arquivo protegido", {
            description: "Tentando desbloquear automaticamente...",
          });
          
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
          if (retryResult?.success === false) {
            throw new Error(retryResult?.error || "Erro ao processar arquivo");
          }

          if (retryResult?.import_id || retryResult?.importId) {
            const importId = retryResult?.import_id || retryResult?.importId;
            savePendingImportId(importId);
            queryClient.invalidateQueries({ queryKey: ['imports'] });
            
            toast.success("Arquivo processado!", {
              description: `${retryResult?.transactions_count || 0} transações encontradas.`,
            });
            navigate(`/app/import/${importId}/review`);
            return;
          }
        }

        throw new Error(errAny?.message || "Erro ao processar arquivo");
      }

      const result: any = data;

      if (result?.success === false) {
        throw new Error(result?.error || "Erro ao processar arquivo");
      }

      const importId = result?.import_id || result?.importId;
      if (!importId) {
        throw new Error("Importação sem ID retornado pelo backend");
      }

      savePendingImportId(importId);
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });

      toast.success("Arquivo processado!", {
        description: `${result.transactions_count || 0} transações encontradas.${
          result.detected_bank ? ` Banco: ${result.detected_bank}` : ""
        }`,
      });
      navigate(`/app/import/${importId}/review`);

    } catch (error) {
      console.error("Import error:", error);
      toast.error("Não conseguimos ler este arquivo", {
        description: error instanceof Error ? error.message : "Tente outro formato (OFX é o mais recomendado).",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle CPF modal success
  const handleCpfSuccess = () => {
    setShowCpfModal(false);
    handleSubmit();
  };

  const canSubmit = file && fileType && ownershipConfirmed && !loading &&
    (!isCreditCardStatement || invoiceMonth);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
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

      <main className="container px-4 py-6 space-y-6 max-w-lg mx-auto">
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
                e cria a conta/cartão se ainda não existir.
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

            {/* Credit Card Toggle */}
            <div 
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all",
                isCreditCardStatement
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
              onClick={() => setIsCreditCardStatement(!isCreditCardStatement)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">É fatura de cartão?</p>
                  <p className="text-sm text-muted-foreground">
                    Marque se for fatura de cartão de crédito
                  </p>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  isCreditCardStatement 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground/30"
                )}>
                  {isCreditCardStatement && (
                    <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Month - Credit Card Only */}
            {isCreditCardStatement && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Mês de pagamento da fatura
                </Label>
                <Select value={invoiceMonth} onValueChange={setInvoiceMonth}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione o mês de vencimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  💡 Todas as compras serão lançadas neste mês.
                </p>
              </div>
            )}

            {/* Security Info for PDF/XLSX */}
            {(fileType === "pdf" || fileType === "xlsx" || fileType === "xls") && (
              <div className="p-4 rounded-xl bg-info/10 border border-info/20">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-info shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      Desbloqueio automático
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Se o arquivo estiver protegido, tentaremos desbloquear usando seu CPF cadastrado.
                    </p>
                    {!hasCpf && (
                      <p className="text-sm text-warning mt-2 font-medium">
                        ⚠️ CPF não cadastrado. Será solicitado ao prosseguir.
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
        {!file && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              O que acontece ao importar?
            </h3>
            <div className="space-y-2">
              {[
                { icon: "🔍", text: "Detectamos automaticamente o banco emissor" },
                { icon: "📋", text: "Identificamos se é extrato ou fatura" },
                { icon: "🏦", text: "Criamos a conta/cartão se não existir" },
                { icon: "🔓", text: "Tentamos desbloquear com seu CPF (se protegido)" },
                { icon: "🏷️", text: "Categorizamos as transações automaticamente" },
                { icon: "👀", text: "Você revisa antes de confirmar" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy note */}
        <p className="text-center text-xs text-muted-foreground">
          Seus arquivos são privados e vinculados apenas à sua família
        </p>

        {/* Spreadsheet Import CTA */}
        <Link
          to="/app/import/spreadsheet"
          className="block p-4 rounded-xl bg-info/10 border border-info/20 hover:bg-info/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center shrink-0">
              <TableIcon className="w-5 h-5 text-info" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Já usa planilha?</p>
              <p className="text-sm text-muted-foreground">
                Traga para o OIK. Nós identificamos as colunas.
              </p>
            </div>
          </div>
        </Link>

        {/* Download Template CTA */}
        <a
          href="/downloads/Planilha_Padrao_OIK.xlsx"
          download="Planilha_Padrao_OIK.xlsx"
          className="block p-4 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Planilha padrão OIK</p>
              <p className="text-sm text-muted-foreground">
                Baixe o modelo e importe quando quiser.
              </p>
            </div>
          </div>
        </a>
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
