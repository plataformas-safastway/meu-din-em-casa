import { useState, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle,
  Upload,
  Smartphone
} from "lucide-react";
import { 
  useExtractReceiptData, 
  fileToBase64, 
  compressImage,
  OcrExtractedData 
} from "@/hooks/useReceiptCapture";
import { toast } from "@/hooks/use-toast";

interface ReceiptCaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: OcrExtractedData, imageFile: File | Blob, imagePreview: string) => void;
}

export function ReceiptCaptureSheet({
  open,
  onOpenChange,
  onDataExtracted,
}: ReceiptCaptureSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const extractData = useExtractReceiptData();

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!validTypes.includes(file.type)) {
        throw new Error("Formato não suportado. Use JPG, PNG ou HEIC.");
      }

      // Validate file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Imagem muito grande. Máximo 10MB.");
      }

      // Compress image for faster processing
      const compressedBlob = await compressImage(file, 1200, 0.85);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedBlob);

      // Convert to base64 for OCR
      const base64 = await fileToBase64(compressedBlob);

      // Extract data using OCR
      const extractedData = await extractData.mutateAsync({
        imageBase64: base64,
        mimeType: 'image/jpeg',
      });

      // Success - pass data to parent
      onDataExtracted(extractedData, compressedBlob, previewUrl);
      onOpenChange(false);

      if (extractedData.confidence < 50) {
        toast({
          title: "Extração parcial",
          description: "Alguns campos não foram identificados. Revise os dados.",
        });
      }
    } catch (err) {
      console.error("Image processing error:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar imagem");
    } finally {
      setIsProcessing(false);
    }
  }, [extractData, onDataExtracted, onOpenChange]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
    // Reset input for future selections
    event.target.value = '';
  }, [processImage]);

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const openGallery = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Foto de Recibo
          </SheetTitle>
          <SheetDescription>
            Fotografe ou selecione um recibo, nota fiscal ou comprovante
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Processing state */}
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary/50" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium">Analisando imagem...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Extraindo valor, data e descrição
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Camera button */}
              <Button
                variant="default"
                size="lg"
                className="w-full h-24 flex-col gap-2"
                onClick={openCamera}
              >
                <Camera className="w-8 h-8" />
                <span>Tirar Foto</span>
              </Button>

              {/* Gallery button */}
              <Button
                variant="outline"
                size="lg"
                className="w-full h-20 flex-col gap-2"
                onClick={openGallery}
              >
                <ImageIcon className="w-6 h-6" />
                <span>Escolher da Galeria</span>
              </Button>

              {/* Tips */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Dicas para melhor leitura:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>• Enquadre todo o recibo na foto</li>
                  <li>• Evite sombras e reflexos</li>
                  <li>• Mantenha o documento reto</li>
                  <li>• Garanta boa iluminação</li>
                </ul>
              </div>

              {/* Supported formats */}
              <p className="text-xs text-center text-muted-foreground">
                Formatos: JPG, PNG, HEIC • Máximo 10MB
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
