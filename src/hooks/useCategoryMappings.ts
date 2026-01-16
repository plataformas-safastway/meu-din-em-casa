import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CategoryImportMapping {
  id: string;
  family_id: string;
  imported_name: string;
  mapped_category_id: string;
  mapped_subcategory_id: string | null;
  imported_limit: number | null;
  created_at: string;
}

export function useCategoryMappings() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["category-mappings", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("category_import_mappings")
        .select("*")
        .eq("family_id", family.id)
        .order("imported_name");

      if (error) throw error;
      return data as CategoryImportMapping[];
    },
    enabled: !!family,
  });
}

export function useSaveCategoryMappings() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (mappings: Array<{
      imported_name: string;
      mapped_category_id: string;
      mapped_subcategory_id?: string | null;
      imported_limit?: number | null;
    }>) => {
      if (!family) throw new Error("No family");

      // Upsert each mapping
      for (const mapping of mappings) {
        const { error } = await supabase.from("category_import_mappings").upsert({
          family_id: family.id,
          imported_name: mapping.imported_name,
          mapped_category_id: mapping.mapped_category_id,
          mapped_subcategory_id: mapping.mapped_subcategory_id || null,
          imported_limit: mapping.imported_limit || null,
        }, {
          onConflict: 'family_id,imported_name',
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-mappings"] });
    },
  });
}

// Create budgets from imported limits
export function useCreateBudgetsFromMappings() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (mappings: Array<{
      category_id: string;
      subcategory_id?: string | null;
      limit: number;
    }>) => {
      if (!family) throw new Error("No family");

      for (const mapping of mappings) {
        if (mapping.limit > 0) {
          // Check if budget already exists
          const { data: existing } = await supabase
            .from("budgets")
            .select("id")
            .eq("family_id", family.id)
            .eq("category_id", mapping.category_id)
            .eq("subcategory_id", mapping.subcategory_id || null)
            .maybeSingle();

          if (existing) {
            // Update existing
            await supabase
              .from("budgets")
              .update({ monthly_limit: mapping.limit })
              .eq("id", existing.id);
          } else {
            // Create new
            await supabase.from("budgets").insert({
              family_id: family.id,
              category_id: mapping.category_id,
              subcategory_id: mapping.subcategory_id || null,
              monthly_limit: mapping.limit,
              is_active: true,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
