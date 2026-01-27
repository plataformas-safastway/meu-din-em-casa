import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { compressImage, fileToBase64, OcrExtractedData } from "./useReceiptCapture";

// Types
export interface OCRBatch {
  id: string;
  userId: string;
  familyId: string;
  status: 'draft' | 'processing' | 'review' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  readyItems: number;
  errorItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface OCRItem {
  id: string;
  batchId: string;
  userId: string;
  familyId: string;
  imageUrl: string;
  imagePath: string | null;
  status: 'pending' | 'processing' | 'ready' | 'error';
  extractedData: Record<string, unknown>;
  normalizedAmount: number | null;
  normalizedDate: string | null;
  normalizedMerchant: string | null;
  normalizedDescription: string | null;
  normalizedPaymentMethod: string | null;
  normalizedCnpj: string | null;
  confidence: number;
  suggestedCategoryId: string | null;
  suggestedSubcategoryId: string | null;
  finalCategoryId: string | null;
  finalSubcategoryId: string | null;
  finalPaymentMethod: string | null;
  finalBankAccountId: string | null;
  finalCreditCardId: string | null;
  isRecurring: boolean;
  isDuplicateSuspect: boolean;
  duplicateReason: string | null;
  errorMessage: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  // Local state for UI
  localPreview?: string;
}

interface BatchRow {
  id: string;
  user_id: string;
  family_id: string;
  status: string;
  total_items: number;
  processed_items: number;
  ready_items: number;
  error_items: number;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  batch_id: string;
  user_id: string;
  family_id: string;
  image_url: string;
  image_path: string | null;
  status: string;
  extracted_data: Record<string, unknown>;
  normalized_amount: number | null;
  normalized_date: string | null;
  normalized_merchant: string | null;
  normalized_description: string | null;
  normalized_payment_method: string | null;
  normalized_cnpj: string | null;
  confidence: number | null;
  suggested_category_id: string | null;
  suggested_subcategory_id: string | null;
  final_category_id: string | null;
  final_subcategory_id: string | null;
  final_payment_method: string | null;
  final_bank_account_id: string | null;
  final_credit_card_id: string | null;
  is_recurring: boolean | null;
  is_duplicate_suspect: boolean | null;
  duplicate_reason: string | null;
  error_message: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_BATCH_SIZE = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper to convert database rows to typed objects
function rowToBatch(row: BatchRow): OCRBatch {
  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    status: row.status as OCRBatch['status'],
    totalItems: row.total_items,
    processedItems: row.processed_items,
    readyItems: row.ready_items,
    errorItems: row.error_items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToItem(row: ItemRow): OCRItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    userId: row.user_id,
    familyId: row.family_id,
    imageUrl: row.image_url,
    imagePath: row.image_path,
    status: row.status as OCRItem['status'],
    extractedData: row.extracted_data || {},
    normalizedAmount: row.normalized_amount,
    normalizedDate: row.normalized_date,
    normalizedMerchant: row.normalized_merchant,
    normalizedDescription: row.normalized_description,
    normalizedPaymentMethod: row.normalized_payment_method,
    normalizedCnpj: row.normalized_cnpj,
    confidence: row.confidence ?? 0,
    suggestedCategoryId: row.suggested_category_id,
    suggestedSubcategoryId: row.suggested_subcategory_id,
    finalCategoryId: row.final_category_id,
    finalSubcategoryId: row.final_subcategory_id,
    finalPaymentMethod: row.final_payment_method,
    finalBankAccountId: row.final_bank_account_id,
    finalCreditCardId: row.final_credit_card_id,
    isRecurring: row.is_recurring ?? false,
    isDuplicateSuspect: row.is_duplicate_suspect ?? false,
    duplicateReason: row.duplicate_reason,
    errorMessage: row.error_message,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Hook to get current batch for draft/processing/review status
export function useCurrentBatch() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["ocr-current-batch", family?.id],
    queryFn: async (): Promise<OCRBatch | null> => {
      if (!family) return null;

      const { data, error } = await supabase
        .from("ocr_batches")
        .select("*")
        .eq("family_id", family.id)
        .in("status", ["draft", "processing", "review"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching current batch:", error);
        return null;
      }

      return data ? rowToBatch(data as unknown as BatchRow) : null;
    },
    enabled: !!family,
  });
}

// Hook to get items for a batch
export function useBatchItems(batchId: string | undefined) {
  return useQuery({
    queryKey: ["ocr-batch-items", batchId],
    queryFn: async (): Promise<OCRItem[]> => {
      if (!batchId) return [];

      const { data, error } = await supabase
        .from("ocr_items")
        .select("*")
        .eq("batch_id", batchId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Error fetching batch items:", error);
        return [];
      }

      return (data as unknown as ItemRow[]).map(rowToItem);
    },
    enabled: !!batchId,
    refetchInterval: (query) => {
      // Refetch every 2s if there are processing items
      const items = query.state.data;
      if (items?.some(item => item.status === 'processing')) {
        return 2000;
      }
      return false;
    },
  });
}

// Hook to create a new batch
export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { user, family } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<OCRBatch> => {
      if (!user || !family) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ocr_batches")
        .insert({
          user_id: user.id,
          family_id: family.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return rowToBatch(data as unknown as BatchRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-current-batch"] });
    },
  });
}

// Hook to add images to a batch
export function useAddBatchImages() {
  const queryClient = useQueryClient();
  const { user, family } = useAuth();
  const processingRef = useRef(false);

  return useMutation({
    mutationFn: async ({ 
      batchId, 
      files 
    }: { 
      batchId: string; 
      files: File[] 
    }): Promise<OCRItem[]> => {
      if (!user || !family) throw new Error("Not authenticated");
      if (processingRef.current) throw new Error("Already processing");
      
      processingRef.current = true;

      try {
        const validFiles = files.filter(file => {
          const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
          if (!validTypes.includes(file.type)) return false;
          if (file.size > MAX_FILE_SIZE) return false;
          return true;
        }).slice(0, MAX_BATCH_SIZE);

        const items: OCRItem[] = [];

        for (const file of validFiles) {
          // Compress and upload image
          const compressedBlob = await compressImage(file, 1200, 0.85);
          const fileExt = 'jpg';
          const uniqueName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("receipts")
            .upload(uniqueName, compressedBlob, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          // Get signed URL
          const { data: signedData, error: signError } = await supabase.storage
            .from("receipts")
            .createSignedUrl(uniqueName, 60 * 60 * 24 * 30); // 30 days

          if (signError) {
            console.error("Sign error:", signError);
            continue;
          }

          // Create item record
          const { data: itemData, error: itemError } = await supabase
            .from("ocr_items")
            .insert({
              batch_id: batchId,
              user_id: user.id,
              family_id: family.id,
              image_url: signedData.signedUrl,
              image_path: uniqueName,
              status: "pending",
            })
            .select()
            .single();

          if (itemError) {
            console.error("Item error:", itemError);
            continue;
          }

          items.push(rowToItem(itemData as unknown as ItemRow));
        }

        return items;
      } finally {
        processingRef.current = false;
      }
    },
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: ["ocr-batch-items", batchId] });
      queryClient.invalidateQueries({ queryKey: ["ocr-current-batch"] });
    },
  });
}

// Hook to process a single item via OCR
export function useProcessOCRItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string): Promise<OCRItem> => {
      // Mark as processing
      await supabase
        .from("ocr_items")
        .update({ status: "processing" })
        .eq("id", itemId);

      // Get the item to get the image URL
      const { data: item, error: fetchError } = await supabase
        .from("ocr_items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (fetchError || !item) throw new Error("Item not found");

      try {
        // Fetch image and convert to base64
        const imageResponse = await fetch((item as unknown as ItemRow).image_url);
        const imageBlob = await imageResponse.blob();
        const base64 = await fileToBase64(imageBlob);

        // Call OCR edge function
        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke("receipt-ocr", {
          body: { imageBase64: base64, mimeType: "image/jpeg" },
        });

        if (ocrError) throw ocrError;

        const extractedData: OcrExtractedData = ocrResult.data;

        // Update item with extracted data
        const { data: updatedItem, error: updateError } = await supabase
          .from("ocr_items")
          .update({
            status: "ready",
            extracted_data: JSON.parse(JSON.stringify(extractedData)),
            normalized_amount: extractedData.amount,
            normalized_date: extractedData.date,
            normalized_merchant: extractedData.establishment,
            normalized_description: extractedData.description,
            normalized_payment_method: extractedData.paymentMethod,
            normalized_cnpj: extractedData.cnpj,
            confidence: extractedData.confidence,
          } as any)
          .eq("id", itemId)
          .select()
          .single();

        if (updateError) throw updateError;

        return rowToItem(updatedItem as unknown as ItemRow);
      } catch (error) {
        // Mark as error
        const errorMessage = error instanceof Error ? error.message : "Erro ao processar imagem";
        await supabase
          .from("ocr_items")
          .update({ 
            status: "error",
            error_message: errorMessage.substring(0, 500),
          })
          .eq("id", itemId);

        throw error;
      }
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["ocr-batch-items", item.batchId] });
    },
    onError: (error) => {
      console.error("OCR processing error:", error);
    },
  });
}

// Hook to process all pending items in a batch
export function useProcessBatch() {
  const queryClient = useQueryClient();
  const processItem = useProcessOCRItem();

  return useMutation({
    mutationFn: async (batchId: string): Promise<void> => {
      // Update batch status
      await supabase
        .from("ocr_batches")
        .update({ status: "processing" })
        .eq("id", batchId);

      // Get pending items
      const { data: items, error } = await supabase
        .from("ocr_items")
        .select("id")
        .eq("batch_id", batchId)
        .eq("status", "pending");

      if (error) throw error;

      // Process items sequentially to avoid rate limits
      for (const item of items || []) {
        try {
          await processItem.mutateAsync(item.id);
        } catch (e) {
          console.error("Error processing item:", e);
          // Continue with next item
        }
      }

      // Update batch status to review
      await supabase
        .from("ocr_batches")
        .update({ status: "review" })
        .eq("id", batchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-current-batch"] });
    },
  });
}

// Hook to update item fields (bulk or single)
export function useUpdateOCRItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemIds, 
      updates 
    }: { 
      itemIds: string[]; 
      updates: Partial<{
        finalCategoryId: string | null;
        finalSubcategoryId: string | null;
        finalPaymentMethod: string | null;
        finalBankAccountId: string | null;
        finalCreditCardId: string | null;
        isRecurring: boolean;
        normalizedDate: string | null;
        normalizedAmount: number | null;
        normalizedDescription: string | null;
      }>;
    }): Promise<void> => {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.finalCategoryId !== undefined) dbUpdates.final_category_id = updates.finalCategoryId;
      if (updates.finalSubcategoryId !== undefined) dbUpdates.final_subcategory_id = updates.finalSubcategoryId;
      if (updates.finalPaymentMethod !== undefined) dbUpdates.final_payment_method = updates.finalPaymentMethod;
      if (updates.finalBankAccountId !== undefined) dbUpdates.final_bank_account_id = updates.finalBankAccountId;
      if (updates.finalCreditCardId !== undefined) dbUpdates.final_credit_card_id = updates.finalCreditCardId;
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
      if (updates.normalizedDate !== undefined) dbUpdates.normalized_date = updates.normalizedDate;
      if (updates.normalizedAmount !== undefined) dbUpdates.normalized_amount = updates.normalizedAmount;
      if (updates.normalizedDescription !== undefined) dbUpdates.normalized_description = updates.normalizedDescription;

      const { error } = await supabase
        .from("ocr_items")
        .update(dbUpdates)
        .in("id", itemIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-batch-items"] });
    },
  });
}

// Hook to remove an item from batch
export function useRemoveOCRItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string): Promise<void> => {
      // Get item to delete storage file
      const { data: item } = await supabase
        .from("ocr_items")
        .select("image_path, batch_id")
        .eq("id", itemId)
        .single();

      // Delete from storage if path exists
      if (item?.image_path) {
        await supabase.storage
          .from("receipts")
          .remove([item.image_path]);
      }

      // Delete the record
      const { error } = await supabase
        .from("ocr_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-batch-items"] });
      queryClient.invalidateQueries({ queryKey: ["ocr-current-batch"] });
    },
  });
}

// Hook to detect duplicates in batch
export function useDetectDuplicates() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (batchId: string): Promise<void> => {
      if (!family) throw new Error("Not authenticated");

      // Get all ready items in batch
      const { data: items, error: fetchError } = await supabase
        .from("ocr_items")
        .select("*")
        .eq("batch_id", batchId)
        .eq("status", "ready");

      if (fetchError) throw fetchError;

      const typedItems = (items as unknown as ItemRow[]).map(rowToItem);

      // Get recent transactions for comparison (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentTx, error: txError } = await supabase
        .from("transactions")
        .select("id, date, amount, description")
        .eq("family_id", family.id)
        .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

      if (txError) throw txError;

      // Check for duplicates
      for (const item of typedItems) {
        let isDuplicate = false;
        let duplicateReason: string | null = null;

        // Check within batch
        const batchDuplicates = typedItems.filter(
          other => 
            other.id !== item.id &&
            other.normalizedDate === item.normalizedDate &&
            other.normalizedAmount === item.normalizedAmount &&
            other.normalizedMerchant === item.normalizedMerchant
        );

        if (batchDuplicates.length > 0) {
          isDuplicate = true;
          duplicateReason = "Possível duplicado dentro deste lote";
        }

        // Check against recent transactions
        if (!isDuplicate && item.normalizedDate && item.normalizedAmount) {
          const txDuplicates = (recentTx || []).filter(
            tx => 
              tx.date === item.normalizedDate &&
              Math.abs(tx.amount) === Math.abs(item.normalizedAmount!)
          );

          if (txDuplicates.length > 0) {
            isDuplicate = true;
            duplicateReason = "Possível duplicado com transação existente";
          }
        }

        // Update item if duplicate found
        if (isDuplicate) {
          await supabase
            .from("ocr_items")
            .update({
              is_duplicate_suspect: true,
              duplicate_reason: duplicateReason,
            })
            .eq("id", item.id);
        }
      }
    },
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({ queryKey: ["ocr-batch-items", batchId] });
    },
  });
}

// Hook to save batch as transactions
export function useSaveBatchTransactions() {
  const queryClient = useQueryClient();
  const { user, family } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      batchId, 
      itemIds 
    }: { 
      batchId: string; 
      itemIds: string[] 
    }): Promise<number> => {
      if (!user || !family) throw new Error("Not authenticated");

      // Get items to save
      const { data: items, error: fetchError } = await supabase
        .from("ocr_items")
        .select("*")
        .in("id", itemIds)
        .eq("status", "ready");

      if (fetchError) throw fetchError;

      const typedItems = (items as unknown as ItemRow[]).map(rowToItem);
      let savedCount = 0;

      for (const item of typedItems) {
        if (!item.normalizedAmount || !item.normalizedDate) continue;

        // Determine transaction type based on amount
        const isExpense = item.normalizedAmount > 0; // OCR amounts are positive for expenses
        const type = isExpense ? "EXPENSE" : "INCOME";

        // Create transaction - using 'as any' since types are auto-generated
        const { data: tx, error: txError } = await (supabase
          .from("transactions")
          .insert({
            date: item.normalizedDate,
            amount: Math.abs(item.normalizedAmount) * (isExpense ? -1 : 1),
            description: item.normalizedDescription || item.normalizedMerchant || "Lançamento via OCR",
            category_id: item.finalCategoryId || "outros",
            subcategory_id: item.finalSubcategoryId || null,
            type,
            payment_method: (item.finalPaymentMethod?.toLowerCase() || "pix"),
            bank_account_id: item.finalBankAccountId || null,
            credit_card_id: item.finalCreditCardId || null,
            source: "MANUAL",
            is_recurring: item.isRecurring,
          } as any)
          .select("id")
          .single());

        if (txError) {
          console.error("Error creating transaction:", txError);
          continue;
        }

        // Link item to transaction
        await supabase
          .from("ocr_items")
          .update({ transaction_id: tx.id })
          .eq("id", item.id);

        // Save receipt attachment if table exists
        try {
          await supabase
            .from("transaction_attachments" as any)
            .insert({
              transaction_id: tx.id,
              family_id: family.id,
              type: "RECEIPT",
              file_url: item.imageUrl,
              uploaded_by: user.id,
              visibility: "ALL",
              ocr_extracted_data: item.extractedData as any,
            });
        } catch (attachErr) {
          console.warn("Could not save attachment:", attachErr);
        }

        savedCount++;
      }

      // Update batch status if all items processed
      const { data: remaining } = await supabase
        .from("ocr_items")
        .select("id")
        .eq("batch_id", batchId)
        .is("transaction_id", null)
        .eq("status", "ready");

      if (!remaining || remaining.length === 0) {
        await supabase
          .from("ocr_batches")
          .update({ status: "completed" })
          .eq("id", batchId);
      }

      return savedCount;
    },
    onSuccess: (count, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: ["ocr-batch-items", batchId] });
      queryClient.invalidateQueries({ queryKey: ["ocr-current-batch"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      toast({
        title: "Transações salvas",
        description: `${count} transação(ões) criada(s) com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
}

// Hook to cancel/delete a batch
export function useDeleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string): Promise<void> => {
      // Get all items to delete storage files
      const { data: items } = await supabase
        .from("ocr_items")
        .select("image_path")
        .eq("batch_id", batchId);

      // Delete storage files
      if (items && items.length > 0) {
        const paths = items
          .map(i => i.image_path)
          .filter((p): p is string => !!p);
        
        if (paths.length > 0) {
          await supabase.storage
            .from("receipts")
            .remove(paths);
        }
      }

      // Delete batch (cascade deletes items)
      const { error } = await supabase
        .from("ocr_batches")
        .delete()
        .eq("id", batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-current-batch"] });
      queryClient.invalidateQueries({ queryKey: ["ocr-batch-items"] });
    },
  });
}

// Composite hook for managing the full batch flow
export function useOCRBatchFlow() {
  const { data: currentBatch, isLoading: loadingBatch, refetch: refetchBatch } = useCurrentBatch();
  const { data: items = [], isLoading: loadingItems } = useBatchItems(currentBatch?.id);
  
  const createBatch = useCreateBatch();
  const addImages = useAddBatchImages();
  const processBatch = useProcessBatch();
  const processItem = useProcessOCRItem();
  const updateItems = useUpdateOCRItems();
  const removeItem = useRemoveOCRItem();
  const detectDuplicates = useDetectDuplicates();
  const saveTransactions = useSaveBatchTransactions();
  const deleteBatch = useDeleteBatch();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.filter(i => i.status === 'ready').map(i => i.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const readyItems = items.filter(i => i.status === 'ready');
  const errorItems = items.filter(i => i.status === 'error');
  const processingItems = items.filter(i => i.status === 'processing');
  const pendingItems = items.filter(i => i.status === 'pending');
  const duplicateItems = items.filter(i => i.isDuplicateSuspect);
  const noCategoryItems = readyItems.filter(i => !i.finalCategoryId);

  return {
    // State
    batch: currentBatch,
    items,
    selectedIds,
    selectedItems,
    readyItems,
    errorItems,
    processingItems,
    pendingItems,
    duplicateItems,
    noCategoryItems,
    isLoading: loadingBatch || loadingItems,
    
    // Selection
    toggleSelection,
    selectAll,
    clearSelection,
    
    // Actions
    createBatch,
    addImages,
    processBatch,
    processItem,
    updateItems,
    removeItem,
    detectDuplicates,
    saveTransactions,
    deleteBatch,
    refetchBatch,
  };
}
