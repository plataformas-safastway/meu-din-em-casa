import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export type CategorySource = "DEFAULT_OIK" | "IMPORTED_SPREADSHEET" | "USER_CUSTOM";
export type CategoryDecision = "keep_imported" | "merge_with_oik" | "replace_with_oik";

export interface ImportedCategory {
  id: string;
  family_id: string;
  name: string;
  normalized_name: string;
  source: CategorySource;
  type: "income" | "expense";
  icon: string;
  color: string;
  is_active: boolean;
  original_category_name: string | null;
  mapped_to_category_id: string | null;
  import_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportedSubcategory {
  id: string;
  family_id: string;
  imported_category_id: string;
  name: string;
  normalized_name: string;
  is_active: boolean;
  mapped_to_subcategory_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryImportSession {
  id: string;
  family_id: string;
  import_type: "spreadsheet" | "bank_statement" | "manual";
  decision: CategoryDecision | null;
  categories_imported: number;
  subcategories_imported: number;
  transactions_count: number;
  completed_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

// Normalize text for matching
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}

// Hook to fetch imported categories
export function useImportedCategories() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["imported-categories", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("imported_categories")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as ImportedCategory[];
    },
    enabled: !!family,
  });
}

// Hook to fetch imported subcategories
export function useImportedSubcategories(categoryId?: string) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["imported-subcategories", family?.id, categoryId],
    queryFn: async () => {
      if (!family) return [];

      let query = supabase
        .from("imported_subcategories")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true)
        .order("name");

      if (categoryId) {
        query = query.eq("imported_category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ImportedSubcategory[];
    },
    enabled: !!family,
  });
}

// Hook to fetch import sessions
export function useImportSessions() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["category-import-sessions", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("category_import_sessions")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CategoryImportSession[];
    },
    enabled: !!family,
  });
}

// Hook to create import session
export function useCreateImportSession() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      import_type: "spreadsheet" | "bank_statement" | "manual";
      categories_count: number;
      subcategories_count: number;
      transactions_count: number;
      metadata?: Record<string, unknown>;
    }) => {
      if (!family) throw new Error("No family");

      const { data, error } = await supabase
        .from("category_import_sessions")
        .insert([{
          family_id: family.id,
          import_type: params.import_type,
          categories_imported: params.categories_count,
          subcategories_imported: params.subcategories_count,
          transactions_count: params.transactions_count,
          metadata: (params.metadata || {}) as Json,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as CategoryImportSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-import-sessions"] });
    },
  });
}

// Hook to save imported categories
export function useSaveImportedCategories() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      categories: Array<{
        name: string;
        type: "income" | "expense";
        subcategories?: string[];
      }>;
      sessionId: string;
    }) => {
      if (!family) throw new Error("No family");

      const categoryPromises = params.categories.map(async (cat) => {
        const normalizedName = normalizeText(cat.name);

        // Upsert category
        const { data: categoryData, error: catError } = await supabase
          .from("imported_categories")
          .upsert(
            {
              family_id: family.id,
              name: cat.name,
              normalized_name: normalizedName,
              source: "IMPORTED_SPREADSHEET" as CategorySource,
              type: cat.type,
              original_category_name: cat.name,
              import_session_id: params.sessionId,
              is_active: true,
            },
            { onConflict: "family_id,normalized_name" }
          )
          .select()
          .single();

        if (catError) throw catError;

        // Insert subcategories
        if (cat.subcategories && cat.subcategories.length > 0) {
          const subcatInserts = cat.subcategories.map((sub) => ({
            family_id: family.id,
            imported_category_id: categoryData.id,
            name: sub,
            normalized_name: normalizeText(sub),
            is_active: true,
          }));

          const { error: subError } = await supabase
            .from("imported_subcategories")
            .upsert(subcatInserts, { 
              onConflict: "imported_category_id,normalized_name" 
            });

          if (subError) throw subError;
        }

        return categoryData;
      });

      return Promise.all(categoryPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imported-categories"] });
      queryClient.invalidateQueries({ queryKey: ["imported-subcategories"] });
    },
  });
}

// Hook to update session decision
export function useUpdateSessionDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; decision: CategoryDecision }) => {
      const { error } = await supabase
        .from("category_import_sessions")
        .update({
          decision: params.decision,
          completed_at: new Date().toISOString(),
        })
        .eq("id", params.sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-import-sessions"] });
    },
  });
}

// Hook to deactivate imported categories (when replacing with OIK)
export function useDeactivateImportedCategories() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!family) throw new Error("No family");

      const { error } = await supabase
        .from("imported_categories")
        .update({ is_active: false })
        .eq("family_id", family.id)
        .eq("source", "IMPORTED_SPREADSHEET");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imported-categories"] });
    },
  });
}

// Hook to map imported category to OIK category
export function useMapCategoryToOik() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      importedCategoryId: string; 
      oikCategoryId: string;
      oikSubcategoryId?: string;
    }) => {
      const { error } = await supabase
        .from("imported_categories")
        .update({ 
          mapped_to_category_id: params.oikCategoryId,
          is_active: false, // Deactivate since it's now mapped
        })
        .eq("id", params.importedCategoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imported-categories"] });
    },
  });
}

// Helper to extract unique categories from spreadsheet data
export function extractCategoriesFromSpreadsheet(
  rows: Array<{ category?: string | null; subcategory?: string | null; type: "income" | "expense" }>
): Array<{ name: string; type: "income" | "expense"; subcategories: string[] }> {
  const categoryMap = new Map<string, { type: "income" | "expense"; subcategories: Set<string> }>();

  for (const row of rows) {
    if (!row.category) continue;

    const catName = row.category.trim();
    if (!catName) continue;

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, { type: row.type, subcategories: new Set() });
    }

    if (row.subcategory) {
      categoryMap.get(catName)!.subcategories.add(row.subcategory.trim());
    }
  }

  return Array.from(categoryMap.entries()).map(([name, data]) => ({
    name,
    type: data.type,
    subcategories: Array.from(data.subcategories),
  }));
}
