import { useState } from "react";
import { ArrowLeft, Upload, FileSpreadsheet, File, AlertCircle, Check, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportPageProps {
  onBack: () => void;
}

type ImportType = "statement" | "invoice";
type FileType = "ofx" | "xls" | "xlsx" | "pdf";

export function ImportPage({ onBack }: ImportPageProps) {
  const [importType, setImportType] = useState<ImportType>("statement");
  const [sourceId, setSourceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setNeedsPassword(false);
    setPassword("");
  };

  const handleImport = async () => {
    if (!file || !sourceId) {
      toast.error("Selecione o arquivo e a origem");
      return;
    }

    setLoading(true);

    // Simular processamento - a implementação real usaria edge function
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success("Importação iniciada! 📂", {
      description: "Processando o arquivo. Você receberá um aviso quando terminar."
    });

    setLoading(false);
    setFile(null);
    setSourceId("");
    onBack();
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

  const confidence = getConfidenceLevel(fileType);

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
              Importe extratos ou faturas
            </p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Import Type */}
        <div className="space-y-3">
          <Label>Tipo de importação</Label>
          <RadioGroup 
            value={importType} 
            onValueChange={(v) => {
              setImportType(v as ImportType);
              setSourceId("");
            }}
            className="grid grid-cols-2 gap-3"
          >
            <Label
              htmlFor="statement"
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                importType === "statement"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="statement" id="statement" />
              <div>
                <p className="font-medium">Extrato bancário</p>
                <p className="text-xs text-muted-foreground">Conta corrente ou poupança</p>
              </div>
            </Label>
            <Label
              htmlFor="invoice"
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                importType === "invoice"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="invoice" id="invoice" />
              <div>
                <p className="font-medium">Fatura de cartão</p>
                <p className="text-xs text-muted-foreground">Cartão de crédito</p>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {/* Source Selection */}
        <div className="space-y-3">
          <Label>
            {importType === "statement" ? "Selecione a conta" : "Selecione o cartão"}
          </Label>
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder={
                importType === "statement" 
                  ? "Escolha uma conta bancária" 
                  : "Escolha um cartão de crédito"
              } />
            </SelectTrigger>
            <SelectContent>
              {importType === "statement" ? (
                bankAccounts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">Nenhuma conta cadastrada</p>
                  </div>
                ) : (
                  bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nickname} ({account.banks?.name || account.custom_bank_name})
                    </SelectItem>
                  ))
                )
              ) : (
                creditCards.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">Nenhum cartão cadastrado</p>
                  </div>
                ) : (
                  creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.card_name}
                    </SelectItem>
                  ))
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <Label>Arquivo</Label>
          <label className={cn(
            "flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all",
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
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  {fileType === 'pdf' ? (
                    <File className="w-6 h-6 text-primary" />
                  ) : (
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  )}
                </div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                {confidence && (
                  <p className={cn("text-sm mt-2", confidence.color)}>
                    Confiança: {confidence.level}
                  </p>
                )}
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">Clique para enviar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  OFX, XLS, XLSX ou PDF
                </p>
              </>
            )}
          </label>
        </div>

        {/* Password field for protected files */}
        {needsPassword && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <Label>Arquivo protegido por senha</Label>
            </div>
            <Input
              type="password"
              placeholder="Digite a senha do arquivo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              A senha geralmente é definida pelo banco ao exportar o arquivo.
            </p>
          </div>
        )}

        {/* Info boxes */}
        {fileType === 'pdf' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning">PDF requer revisão</p>
              <p className="text-sm text-muted-foreground mt-1">
                Arquivos PDF podem exigir mais revisão manual. Recomendamos usar OFX quando possível.
              </p>
            </div>
          </div>
        )}

        {fileType === 'ofx' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
            <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-success">Formato recomendado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                OFX oferece a melhor precisão na importação dos lançamentos.
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold"
          disabled={!file || !sourceId || loading}
          onClick={handleImport}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Importar arquivo
            </>
          )}
        </Button>

        {/* Privacy note */}
        <p className="text-center text-xs text-muted-foreground">
          Seus arquivos são privados e vinculados apenas à sua família
        </p>
      </main>
    </div>
  );
}
