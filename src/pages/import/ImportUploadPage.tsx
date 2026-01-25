import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, File, AlertCircle, Check, Loader2, CreditCard, Building2, Calendar, X, TableIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { savePendingImportId } from "@/hooks/useImportFlow";

type FileType = "ofx" | "xls" | "xlsx" | "pdf";
type ImportType = "bank_statement" | "credit_card";

export function ImportUploadPage() {
  const navigate = useNavigate();
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [invoiceMonth, setInvoiceMonth] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!['ofx', 'xls', 'xlsx', 'pdf'].includes(extension || '')) {
      toast.error("Formato não suportado", {
        description: "Use arquivos OFX, XLS, XLSX ou PDF"
      });
      return;
    }

    setFile(selectedFile);
    setFileType(extension as FileType);
  };

  const clearFile = () => {
    setFile(null);
    setFileType(null);
  };

  const getConfidenceInfo = (type: FileType | null) => {
    switch (type) {
      case 'ofx': return { level: 'Alta precisão', color: 'text-success', bg: 'bg-success/10' };
      case 'xls':
      case 'xlsx': return { level: 'Precisão média', color: 'text-warning', bg: 'bg-warning/10' };
      case 'pdf': return { level: 'Requer revisão', color: 'text-destructive', bg: 'bg-destructive/10' };
      default: return null;
    }
  };

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

  const handleSubmit = async () => {
    if (!importType || !sourceId || !file) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (importType === 'credit_card' && !invoiceMonth) {
      toast.error("Selecione o mês de pagamento da fatura");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importType', importType);
      formData.append('sourceId', sourceId);
      if (invoiceMonth) formData.append('invoiceMonth', invoiceMonth);

      const { data, error } = await supabase.functions.invoke('import-process', {
        body: formData,
      });

      if (error) {
        // Normalize password-protected signal
        const errAny = error as unknown as { context?: any; message?: string };
        const ctx = errAny?.context;
        const needsPassword = !!(ctx?.needs_password || ctx?.needsPassword);
        if (needsPassword) {
          toast.info("Arquivo protegido por senha", {
            description: "Abra a importação inteligente para tentar senha automática (CPF) ou digitar manualmente.",
          });
          return;
        }

        throw new Error(errAny?.message || 'Erro ao processar arquivo');
      }

      const result: any = data;

      // Handle backend-declared failure that still returns HTTP 200
      if (result?.success === false) {
        throw new Error(result?.error || 'Erro ao processar arquivo');
      }

      // Save import ID to localStorage for recovery
      const importId = result?.import_id || result?.importId;
      if (!importId) {
        throw new Error('Importação sem ID retornado pelo backend');
      }
      savePendingImportId(importId);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });

      // Navigate to review page
      toast.success(`${result.transactions_count} transações encontradas!`);
      navigate(`/app/import/${importId}/review`);

    } catch (error) {
      console.error('Import error:', error);
      toast.error("Não conseguimos ler este arquivo", {
        description: error instanceof Error ? error.message : 'Tente outro formato (OFX é o mais recomendado).',
      });
    } finally {
      setLoading(false);
    }
  };

  const confidence = getConfidenceInfo(fileType);
  const sources = importType === 'bank_statement' ? bankAccounts : creditCards;
  const isFormValid = importType && sourceId && file && 
    (importType === 'bank_statement' || invoiceMonth);

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
              <h1 className="text-lg font-semibold">Importar Arquivo</h1>
              <p className="text-xs text-muted-foreground">
                Extrato bancário ou fatura de cartão
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="space-y-6 max-w-lg mx-auto">
          {/* Import Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">O que você quer importar?</Label>
            <RadioGroup
              value={importType || ""}
              onValueChange={(v) => {
                setImportType(v as ImportType);
                setSourceId("");
              }}
              className="grid grid-cols-2 gap-3"
            >
              <label 
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  importType === 'bank_statement' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="bank_statement" className="sr-only" />
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  importType === 'bank_statement' ? "bg-primary/20" : "bg-muted"
                )}>
                  <Building2 className={cn(
                    "w-6 h-6",
                    importType === 'bank_statement' ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className={cn(
                  "font-medium text-sm",
                  importType === 'bank_statement' ? "text-primary" : "text-foreground"
                )}>
                  Extrato de Conta
                </span>
              </label>

              <label 
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  importType === 'credit_card' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="credit_card" className="sr-only" />
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  importType === 'credit_card' ? "bg-primary/20" : "bg-muted"
                )}>
                  <CreditCard className={cn(
                    "w-6 h-6",
                    importType === 'credit_card' ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className={cn(
                  "font-medium text-sm",
                  importType === 'credit_card' ? "text-primary" : "text-foreground"
                )}>
                  Fatura de Cartão
                </span>
              </label>
            </RadioGroup>
          </div>

          {/* Source Selection */}
          {importType && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {importType === 'bank_statement' ? 'Conta bancária' : 'Cartão de crédito'}
              </Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={
                    importType === 'bank_statement' 
                      ? 'Escolha a conta bancária' 
                      : 'Escolha o cartão'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {sources.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <p className="text-sm">
                        {importType === 'bank_statement' 
                          ? 'Nenhuma conta cadastrada' 
                          : 'Nenhum cartão cadastrado'}
                      </p>
                    </div>
                  ) : (
                    sources.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        {importType === 'bank_statement'
                          ? `${item.nickname} (${item.banks?.name || item.custom_bank_name || 'Banco'})`
                          : item.card_name
                        }
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Invoice Month - Credit Card Only */}
          {importType === 'credit_card' && sourceId && (
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

          {/* File Upload */}
          {importType && sourceId && (importType === 'bank_statement' || invoiceMonth) && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Arquivo</Label>
              <label className={cn(
                "flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all relative",
                file 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}>
                <input
                  type="file"
                  accept=".ofx,.xls,.xlsx,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearFile();
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      {fileType === 'pdf' ? (
                        <File className="w-6 h-6 text-primary" />
                      ) : (
                        <FileSpreadsheet className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <p className="font-medium text-foreground text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    {confidence && (
                      <p className={cn("text-xs mt-2 px-2 py-1 rounded-full", confidence.bg, confidence.color)}>
                        {confidence.level}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="font-medium text-foreground">Clique para enviar</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      OFX, XLS, XLSX ou PDF
                    </p>
                  </>
                )}
              </label>
            </div>
          )}

          {/* Info boxes */}
          {fileType === 'pdf' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                PDFs precisam de revisão manual. Recomendamos usar OFX quando possível.
              </p>
            </div>
          )}

          {fileType === 'ofx' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Ótima escolha! OFX oferece a melhor precisão na importação.
              </p>
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full h-12"
            disabled={!isFormValid || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Processar arquivo
              </>
            )}
          </Button>

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
        </div>
      </main>
    </div>
  );
}
