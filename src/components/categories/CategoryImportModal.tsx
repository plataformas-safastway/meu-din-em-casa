import { useState, useCallback } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useImportCategories, ParsedCategoryData } from "@/hooks/useCategoryImport";
import { CategoryImportPreview } from "./CategoryImportPreview";
import { CategoryHistoryDecisionModal } from "./CategoryHistoryDecisionModal";
import { CategoryMappingSheet } from "./CategoryMappingSheet";

interface CategoryImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'upload' | 'preview' | 'decision' | 'mapping' | 'processing' | 'complete';

export function CategoryImportModal({ open, onOpenChange }: CategoryImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCategoryData | null>(null);
  const [historyDecision, setHistoryDecision] = useState<'reclassify' | 'forward_only' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { parseFile, importCategories, isLoading, progress } = useImportCategories();

  const handleClose = () => {
    // Reset state
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setHistoryDecision(null);
    onOpenChange(false);
  };

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file type
    if (!selectedFile.name.endsWith('.xlsx')) {
      toast.error('Arquivo inválido', {
        description: 'Por favor, selecione um arquivo .xlsx',
      });
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo é 5MB',
      });
      return;
    }

    setFile(selectedFile);

    try {
      const data = await parseFile(selectedFile);
      setParsedData(data);
      setStep('preview');
    } catch (error: any) {
      toast.error('Erro ao ler arquivo', {
        description: error.message || 'Verifique se o arquivo está no formato correto',
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleConfirmPreview = () => {
    setStep('decision');
  };

  const handleHistoryDecision = (decision: 'reclassify' | 'forward_only') => {
    setHistoryDecision(decision);
    
    if (decision === 'reclassify') {
      setStep('mapping');
    } else {
      // Forward only - proceed directly
      handleImport('forward_only');
    }
  };

  const handleMappingComplete = async (mappings: Record<string, { categoryId: string; subcategoryId?: string }>) => {
    await handleImport('reclassify', mappings);
  };

  const handleImport = async (
    mode: 'reclassify' | 'forward_only',
    mappings?: Record<string, { categoryId: string; subcategoryId?: string }>
  ) => {
    if (!parsedData) return;

    setStep('processing');

    try {
      await importCategories(parsedData, mode, mappings);
      setStep('complete');
      toast.success('Categorias importadas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao importar', {
        description: error.message,
      });
      setStep('preview');
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/Modelo_Categorias_OIK.xlsx';
    link.download = 'Modelo_Categorias_OIK.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Dialog open={open && step !== 'decision' && step !== 'mapping'} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              {step === 'upload' && 'Importar Categorias'}
              {step === 'preview' && 'Pré-visualização'}
              {step === 'processing' && 'Importando...'}
              {step === 'complete' && 'Importação Concluída'}
            </DialogTitle>
            <DialogDescription>
              {step === 'upload' && 'Envie uma planilha no modelo oficial do OIK.'}
              {step === 'preview' && 'Confira as categorias que serão importadas.'}
              {step === 'processing' && 'Aguarde enquanto processamos suas categorias.'}
              {step === 'complete' && 'Suas categorias foram importadas com sucesso!'}
            </DialogDescription>
          </DialogHeader>

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                  id="category-file-upload"
                />
                <label
                  htmlFor="category-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Arraste o arquivo ou clique para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Apenas arquivos .xlsx (máx. 5MB)
                    </p>
                  </div>
                </label>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-warning">
                  Suas categorias atuais poderão ser substituídas. Você poderá escolher como tratar o histórico de transações.
                </p>
              </div>

              {/* Download Template */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadTemplate}
              >
                <Download className="w-4 h-4" />
                Baixar Modelo Excel
              </Button>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && parsedData && (
            <div className="space-y-4">
              <CategoryImportPreview data={parsedData} />
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-info/10 border border-info/20">
                <AlertCircle className="w-5 h-5 text-info shrink-0 mt-0.5" />
                <p className="text-sm text-info">
                  Suas categorias atuais serão substituídas pelas da planilha. Na próxima etapa, você escolherá como tratar suas transações anteriores.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>
                  Voltar
                </Button>
                <Button className="flex-1" onClick={handleConfirmPreview}>
                  Confirmar Importação
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                Processando categorias... {progress}%
              </p>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">
                  Importação concluída!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {parsedData?.categories.length || 0} categorias e{' '}
                  {parsedData?.totalSubcategories || 0} subcategorias foram importadas.
                </p>
              </div>
              <Button className="w-full" onClick={handleClose}>
                Concluir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Decision Modal */}
      <CategoryHistoryDecisionModal
        open={step === 'decision'}
        onClose={() => setStep('preview')}
        onDecision={handleHistoryDecision}
        isImport
      />

      {/* Mapping Sheet */}
      <CategoryMappingSheet
        open={step === 'mapping'}
        onClose={() => setStep('decision')}
        parsedData={parsedData}
        onComplete={handleMappingComplete}
      />
    </>
  );
}
