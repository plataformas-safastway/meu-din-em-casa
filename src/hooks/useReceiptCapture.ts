import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface TransactionAttachment {
  id: string;
  transactionId: string | null;
  familyId: string;
  type: 'RECEIPT' | 'INVOICE' | 'PROOF' | 'OTHER';
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string;
  visibility: 'ALL' | 'OWNER_ONLY';
  ocrExtractedData: Record<string, unknown> | null;
  createdAt: string;
}

interface AttachmentRow {
  id: string;
  transaction_id: string | null;
  family_id: string;
  type: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  visibility: string;
  ocr_extracted_data: Record<string, unknown> | null;
  created_at: string;
}

export interface OcrExtractedData {
  amount: number | null;
  date: string | null;
  description: string | null;
  establishment: string | null;
  paymentMethod: 'CREDIT' | 'DEBIT' | 'PIX' | 'CASH' | null;
  cnpj: string | null;
  confidence: number;
}

// Get attachments for a transaction
export function useTransactionAttachments(transactionId: string | undefined) {
  return useQuery({
    queryKey: ["transaction-attachments", transactionId],
    queryFn: async (): Promise<TransactionAttachment[]> => {
      if (!transactionId) return [];

      const { data, error } = await supabase
        .from("transaction_attachments" as any)
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching attachments:", error);
        return [];
      }

      return (data as unknown as AttachmentRow[]).map(row => ({
        id: row.id,
        transactionId: row.transaction_id,
        familyId: row.family_id,
        type: row.type as TransactionAttachment['type'],
        fileUrl: row.file_url,
        fileName: row.file_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        uploadedBy: row.uploaded_by,
        visibility: row.visibility as TransactionAttachment['visibility'],
        ocrExtractedData: row.ocr_extracted_data,
        createdAt: row.created_at,
      }));
    },
    enabled: !!transactionId,
  });
}

// Upload image to storage
export function useUploadReceiptImage() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      file, 
      fileName 
    }: { 
      file: File | Blob; 
      fileName?: string 
    }): Promise<string> => {
      if (!user) throw new Error("Not authenticated");

      const fileExt = fileName?.split('.').pop() || 'jpg';
      const uniqueName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(uniqueName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket
      const { data: signedData, error: signError } = await supabase.storage
        .from("receipts")
        .createSignedUrl(uniqueName, 60 * 60 * 24 * 365); // 1 year

      if (signError) throw signError;

      return signedData.signedUrl;
    },
  });
}

// Extract data from receipt image using OCR
export function useExtractReceiptData() {
  return useMutation({
    mutationFn: async ({ 
      imageBase64, 
      mimeType 
    }: { 
      imageBase64: string; 
      mimeType: string 
    }): Promise<OcrExtractedData> => {
      const { data, error } = await supabase.functions.invoke("receipt-ocr", {
        body: { imageBase64, mimeType },
      });

      if (error) throw error;

      if (!data.success) {
        console.warn("OCR extraction failed:", data.error);
      }

      return data.data as OcrExtractedData;
    },
    onError: (error) => {
      console.error("OCR error:", error);
      toast({
        title: "Erro na extração",
        description: "Não foi possível ler o recibo. Você pode preencher manualmente.",
        variant: "destructive",
      });
    },
  });
}

// Save attachment record
export function useSaveAttachment() {
  const queryClient = useQueryClient();
  const { user, family } = useAuth();

  return useMutation({
    mutationFn: async ({
      transactionId,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      type = 'RECEIPT',
      visibility = 'ALL',
      ocrExtractedData,
    }: {
      transactionId: string;
      fileUrl: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      type?: TransactionAttachment['type'];
      visibility?: TransactionAttachment['visibility'];
      ocrExtractedData?: Record<string, unknown>;
    }) => {
      if (!user || !family) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("transaction_attachments" as any)
        .insert({
          transaction_id: transactionId,
          family_id: family.id,
          type,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
          uploaded_by: user.id,
          visibility,
          ocr_extracted_data: ocrExtractedData || null,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["transaction-attachments", variables.transactionId] });
    },
  });
}

// Delete attachment
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from("transaction_attachments" as any)
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-attachments"] });
      toast({
        title: "Comprovante removido",
        description: "O anexo foi excluído com sucesso.",
      });
    },
  });
}

// Update attachment visibility
export function useUpdateAttachmentVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      attachmentId, 
      visibility 
    }: { 
      attachmentId: string; 
      visibility: 'ALL' | 'OWNER_ONLY' 
    }) => {
      const { error } = await supabase
        .from("transaction_attachments" as any)
        .update({ visibility })
        .eq("id", attachmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-attachments"] });
    },
  });
}

// Helper to convert file to base64
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get pure base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

// Helper to compress image
export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
