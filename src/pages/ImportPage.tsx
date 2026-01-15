import { useState } from "react";
import { ArrowLeft, Upload, FileSpreadsheet, File, AlertCircle, Check, Loader2, Lock, CreditCard, Building2, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ImportPageProps {
  onBack: () => void;
}

type FileType = "ofx" | "xls" | "xlsx" | "pdf";

interface UploadState {
  file: File | null;
  fileType: FileType | null;
  sourceId: string;
  password: string;
  needsPassword: boolean;
  loading: boolean;
  invoiceMonth: string;
}

const initialUploadState: UploadState = {
  file: null,
  fileType: null,
  sourceId: "",
  password: "",
  needsPassword: false,
  loading: false,
  invoiceMonth: "",
};

export function ImportPage({ onBack }: ImportPageProps) {
  const [bankUpload, setBankUpload] = useState<UploadState>(initialUploadState);
  const [cardUpload, setCardUpload] = useState<UploadState>(initialUploadState);
  const queryClient = useQueryClient();

  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "bank" | "card"
  ) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!['ofx', 'xls', 'xlsx', 'pdf'].includes(extension || '')) {
      toast.error("Formato não suportado", {
        description: "Use arquivos OFX, XLS, XLSX ou PDF"
      });
      return;
    }

    const setter = type === "bank" ? setBankUpload : setCardUpload;
    setter(prev => ({
      ...prev,
      file: selectedFile,
      fileType: extension as FileType,
      needsPassword: false,
      password: "",
    }));
  };

  const clearFile = (type: "bank" | "card") => {
    const setter = type === "bank" ? setBankUpload : setCardUpload;
    setter(prev => ({
      ...prev,
      file: null,
      fileType: null,
      password: "",
      needsPassword: false,
    }));
  };

  const handleImport = async (type: "bank" | "card") => {
    const upload = type === "bank" ? bankUpload : cardUpload;
    const setter = type === "bank" ? setBankUpload : setCardUpload;

    if (!upload.file || !upload.sourceId) {
      toast.error("Selecione o arquivo e a origem");
      return;
    }

    if (type === "card" && !upload.invoiceMonth) {
      toast.error("Selecione o mês de pagamento da fatura");
      return;
    }

    setter(prev => ({ ...prev, loading: true }));

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', upload.file);
      formData.append('importType', type === "bank" ? 'bank_statement' : 'credit_card_invoice');
      formData.append('sourceId', upload.sourceId);
      if (type === "card" && upload.invoiceMonth) {
        formData.append('invoiceMonth', upload.invoiceMonth);
      }

      // Get session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        setter(prev => ({ ...prev, loading: false }));
        return;
      }

      // Call edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-import`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar arquivo');
      }

      // Success!
      const monthLabel = type === "card" ? formatMonth(upload.invoiceMonth) : '';
      
      toast.success("Importação concluída! 🎉", {
        description: result.message,
      });

      if (result.needsReview) {
        toast.info("Recomendamos revisar", {
          description: `Arquivos ${upload.fileType?.toUpperCase()} podem ter imprecisões. Verifique as transações.`,
          duration: 5000,
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });

      setter(initialUploadState);
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Erro na importação", {
        description: error instanceof Error ? error.message : 'Tente novamente ou use outro formato de arquivo.',
      });
    } finally {
      setter(prev => ({ ...prev, loading: false }));
    }
  };

  const getConfidenceLevel = (type: FileType | null) => {
    switch (type) {
      case 'ofx': return { level: 'Alta', color: 'text-success' };
      case 'xls':
      case 'xlsx': return { level: 'Média', color: 'text-warning' };
      case 'pdf': return { level: 'Baixa', color: 'text-destructive' };
      default: return null;
    }
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    // Último mês, mês atual e próximos 3 meses
    for (let i = -1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  };

  const renderUploadSection = (
    type: "bank" | "card",
    upload: UploadState,
    setter: React.Dispatch<React.SetStateAction<UploadState>>
  ) => {
    const confidence = getConfidenceLevel(upload.fileType);
    const isBank = type === "bank";
    const items = isBank ? bankAccounts : creditCards;
    const emptyMessage = isBank ? "Nenhuma conta cadastrada" : "Nenhum cartão cadastrado";
    const placeholder = isBank ? "Escolha uma conta bancária" : "Escolha um cartão de crédito";
    const Icon = isBank ? Building2 : CreditCard;

    return (
      <div className="space-y-4 p-4 rounded-2xl bg-card border border-border">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isBank ? "bg-blue-500/10" : "bg-purple-500/10"
          )}>
            <Icon className={cn("w-5 h-5", isBank ? "text-blue-500" : "text-purple-500")} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isBank ? "Extrato Bancário" : "Fatura de Cartão"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isBank ? "Conta corrente ou poupança" : "Cartão de crédito"}
            </p>
          </div>
        </div>

        {/* Source Selection */}
        <div className="space-y-2">
          <Label className="text-sm">
            {isBank ? "Conta" : "Cartão"}
          </Label>
          <Select 
            value={upload.sourceId} 
            onValueChange={(v) => setter(prev => ({ ...prev, sourceId: v }))}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {items.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              ) : (
                items.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {isBank 
                      ? `${item.nickname} (${item.banks?.name || item.custom_bank_name})`
                      : item.card_name
                    }
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Invoice Month - Only for credit cards */}
        {!isBank && (
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Mês de pagamento da fatura
            </Label>
            <Select 
              value={upload.invoiceMonth} 
              onValueChange={(v) => setter(prev => ({ ...prev, invoiceMonth: v }))}
            >
              <SelectTrigger className="h-11">
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
              💡 Todas as compras serão lançadas neste mês, mesmo que tenham sido feitas antes.
            </p>
          </div>
        )}

        {/* File Upload */}
        <div className="space-y-2">
          <Label className="text-sm">Arquivo</Label>
          <label className={cn(
            "flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all relative",
            upload.file 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50"
          )}>
            <input
              type="file"
              accept=".ofx,.xls,.xlsx,.pdf"
              onChange={(e) => handleFileChange(e, type)}
              className="hidden"
            />
            {upload.file ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearFile(type);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  {upload.fileType === 'pdf' ? (
                    <File className="w-5 h-5 text-primary" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  )}
                </div>
                <p className="font-medium text-foreground text-sm">{upload.file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(upload.file.size / 1024).toFixed(1)} KB
                </p>
                {confidence && (
                  <p className={cn("text-xs mt-1", confidence.color)}>
                    Confiança: {confidence.level}
                  </p>
                )}
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="font-medium text-foreground text-sm">Clique para enviar</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  OFX, XLS, XLSX ou PDF
                </p>
              </>
            )}
          </label>
        </div>

        {/* Password field for protected files */}
        {upload.needsPassword && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm">Arquivo protegido</Label>
            </div>
            <Input
              type="password"
              placeholder="Digite a senha do arquivo"
              value={upload.password}
              onChange={(e) => setter(prev => ({ ...prev, password: e.target.value }))}
              className="h-11"
            />
          </div>
        )}

        {/* Info boxes */}
        {upload.fileType === 'pdf' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              PDF requer revisão manual. Recomendamos OFX para maior precisão.
            </p>
          </div>
        )}

        {upload.fileType === 'ofx' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              OFX oferece a melhor precisão na importação.
            </p>
          </div>
        )}

        {(upload.fileType === 'xls' || upload.fileType === 'xlsx') && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Arquivos Excel podem variar. Verifique as transações após importar.
            </p>
          </div>
        )}

        {/* Submit */}
        <Button
          className="w-full h-11"
          disabled={!upload.file || !upload.sourceId || upload.loading || (!isBank && !upload.invoiceMonth)}
          onClick={() => handleImport(type)}
        >
          {upload.loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Importar {isBank ? "extrato" : "fatura"}
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Importar</h1>
            <p className="text-sm text-muted-foreground">
              Extratos bancários e faturas de cartão
            </p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-4">
        {/* Bank Statement Section */}
        {renderUploadSection("bank", bankUpload, setBankUpload)}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">OU</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Credit Card Invoice Section */}
        {renderUploadSection("card", cardUpload, setCardUpload)}

        {/* Privacy note */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          Seus arquivos são privados e vinculados apenas à sua família
        </p>
      </main>
    </div>
  );
}
