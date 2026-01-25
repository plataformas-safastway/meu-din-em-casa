import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CategorySelector } from "@/components/transaction/CategorySelector";
import { PaymentMethodSelector } from "@/components/transaction/PaymentMethodSelector";
import { 
  Camera, 
  Loader2, 
  Save,
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  DollarSign
} from "lucide-react";
import { OcrExtractedData } from "@/hooks/useReceiptCapture";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useUploadReceiptImage, useSaveAttachment } from "@/hooks/useReceiptCapture";
import { useCategorySuggestion } from "@/hooks/useCategorySuggestion";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PaymentMethod, TransactionClassification } from "@/types/finance";

interface ReceiptReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: OcrExtractedData | null;
  imageFile: File | Blob | null;
  imagePreview: string | null;
  onSuccess?: () => void;
}

const paymentMethodMap: Record<string, PaymentMethod> = {
  'CREDIT': 'credit',
  'DEBIT': 'debit',
  'PIX': 'pix',
  'CASH': 'cash',
};

// Format value for display
function formatCurrencyInput(value: number): string {
  if (value <= 0) return "";
  return value.toFixed(2).replace('.', ',');
}

// Parse display value to number
function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function ReceiptReviewSheet({
  open,
  onOpenChange,
  extractedData,
  imageFile,
  imagePreview,
  onSuccess,
}: ReceiptReviewSheetProps) {
  // Form state
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("debit");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Hooks
  const createTransaction = useCreateTransaction();
  const uploadImage = useUploadReceiptImage();
  const saveAttachment = useSaveAttachment();
  
  // Get category suggestion based on description
  const { getSuggestion, isLoading: isLoadingSuggestion } = useCategorySuggestion();

  // Initialize form with extracted data
  useEffect(() => {
    if (extractedData && open) {
      if (extractedData.amount && extractedData.amount > 0) {
        setAmountStr(formatCurrencyInput(extractedData.amount));
      }
      if (extractedData.date) {
        setDate(extractedData.date);
      }
      if (extractedData.description || extractedData.establishment) {
        const desc = extractedData.establishment 
          ? `${extractedData.establishment}${extractedData.description ? ` - ${extractedData.description}` : ''}`
          : extractedData.description || '';
        setDescription(desc);
        
        // Get suggestion for the extracted description
        const suggestion = getSuggestion(desc);
        if (suggestion.categoryId && !categoryId) {
          setCategoryId(suggestion.categoryId);
        }
      }
      if (extractedData.paymentMethod) {
        const mapped = paymentMethodMap[extractedData.paymentMethod];
        if (mapped) setPaymentMethod(mapped);
      }
    }
  }, [extractedData, open, getSuggestion, categoryId]);

  // Get suggestion when description changes
  useEffect(() => {
    if (description && description.length >= 3 && !categoryId) {
      const suggestion = getSuggestion(description);
      if (suggestion.categoryId) {
        setCategoryId(suggestion.categoryId);
      }
    }
  }, [description, getSuggestion, categoryId]);

  const handleSave = async () => {
    const amount = parseCurrencyInput(amountStr);
    
    if (!amount || amount <= 0) {
      toast({
        title: "Valor obrigatório",
        description: "Informe o valor da transação.",
        variant: "destructive",
      });
      return;
    }

    if (!categoryId) {
      toast({
        title: "Categoria obrigatória",
        description: "Selecione uma categoria.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Create the transaction with OCR source
      const transaction = await createTransaction.mutateAsync({
        type: "expense",
        amount,
        category_id: categoryId,
        subcategory_id: null,
        description: description || null,
        date,
        payment_method: paymentMethod as "cash" | "credit" | "debit" | "pix" | "transfer",
        source: "OCR", // Mark as captured via photo
        ocr_confidence: extractedData?.confidence || undefined,
        original_description: extractedData?.description || extractedData?.establishment || undefined,
      });

      // 2. Upload the image if available
      if (imageFile && transaction?.id) {
        try {
          const fileUrl = await uploadImage.mutateAsync({
            file: imageFile,
            fileName: `receipt-${Date.now()}.jpg`,
          });

          // 3. Save the attachment record
          await saveAttachment.mutateAsync({
            transactionId: transaction.id,
            fileUrl,
            fileName: `receipt-${Date.now()}.jpg`,
            fileSize: imageFile.size,
            mimeType: 'image/jpeg',
            type: 'RECEIPT',
            visibility: isPrivate ? 'OWNER_ONLY' : 'ALL',
            ocrExtractedData: extractedData as unknown as Record<string, unknown>,
          });
        } catch (uploadError) {
          console.error("Failed to upload receipt:", uploadError);
          // Transaction was created, just warn about attachment
          toast({
            title: "Lançamento salvo",
            description: "Transação registrada, mas o comprovante não foi anexado.",
          });
        }
      }

      toast({
        title: "Lançamento registrado! 📸",
        description: "Despesa salva com comprovante anexado.",
      });

      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setAmountStr("");
      setDescription("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setCategoryId("");
      setPaymentMethod("debit");
      setIsPrivate(false);
    } catch (error) {
      console.error("Failed to save transaction:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível registrar a transação.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confidence = extractedData?.confidence || 0;
  const amount = parseCurrencyInput(amountStr);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Revisar Lançamento
          </SheetTitle>
          <SheetDescription>
            Confira os dados extraídos e ajuste se necessário
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Image preview */}
          {imagePreview && (
            <div className="relative rounded-lg overflow-hidden border bg-muted/30">
              <img 
                src={imagePreview} 
                alt="Recibo" 
                className="w-full h-32 object-cover"
              />
              <div className="absolute bottom-2 right-2">
                <Badge 
                  variant={confidence >= 70 ? "default" : confidence >= 40 ? "secondary" : "outline"}
                  className="text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {confidence}% confiança
                </Badge>
              </div>
            </div>
          )}

          {/* Low confidence warning */}
          {confidence < 50 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/50 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Alguns dados podem precisar de ajuste manual.</p>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-destructive">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^\d,]/g, ""))}
                className="pl-14 text-2xl font-bold h-14 text-center rounded-xl"
                autoFocus={!amountStr}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Supermercado, Restaurante..."
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Category */}
          <CategorySelector
            value={categoryId}
            onChange={setCategoryId}
            classification="expense"
          />

          {/* Payment method */}
          <PaymentMethodSelector
            value={paymentMethod}
            onChange={setPaymentMethod}
            classification="expense"
          />

          {/* Privacy toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              {isPrivate ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Comprovante privado</p>
                <p className="text-xs text-muted-foreground">
                  {isPrivate ? "Só você verá o anexo" : "Visível para a família"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving || !amount || !categoryId}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
