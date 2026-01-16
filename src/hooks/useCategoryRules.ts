import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CategoryRule {
  id: string;
  family_id: string;
  keyword: string;
  category_id: string;
  subcategory_id: string | null;
  created_at: string;
}

export interface CategoryRuleInput {
  keyword: string;
  category_id: string;
  subcategory_id?: string | null;
}

export function useCategoryRules() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["category-rules", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("category_rules")
        .select("*")
        .eq("family_id", family.id)
        .order("keyword");

      if (error) throw error;
      return data as CategoryRule[];
    },
    enabled: !!family,
  });
}

export function useCreateCategoryRule() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (input: CategoryRuleInput) => {
      if (!family) throw new Error("No family");

      const { error } = await supabase.from("category_rules").upsert({
        family_id: family.id,
        keyword: input.keyword.toUpperCase(),
        category_id: input.category_id,
        subcategory_id: input.subcategory_id || null,
      }, {
        onConflict: 'family_id,keyword',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-rules"] });
    },
  });
}

export function useDeleteCategoryRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("category_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-rules"] });
    },
  });
}
