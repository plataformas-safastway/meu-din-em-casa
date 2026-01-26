import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type CategoryStatus = 'ACTIVE' | 'ARCHIVED';
export type CategorySource = 'DEFAULT_OIK' | 'IMPORTED_SPREADSHEET' | 'USER_CUSTOM';

export interface UserCategory {
  id: string;
  family_id: string;
  name: string;
  icon_key: string;
  color?: string | null;
  type: 'income' | 'expense';
  status: CategoryStatus;
  source: CategorySource;
  replaced_by_category_id?: string | null;
  display_order: number;
  transaction_count: number;
  created_at: string;
  created_by_user_id?: string | null;
  archived_at?: string | null;
  archived_by_user_id?: string | null;
  subcategories?: UserSubcategory[];
}

export interface UserSubcategory {
  id: string;
  category_id: string;
  family_id: string;
  name: string;
  status: CategoryStatus;
  replaced_by_subcategory_id?: string | null;
  display_order: number;
  transaction_count: number;
  created_at: string;
  created_by_user_id?: string | null;
  archived_at?: string | null;
  archived_by_user_id?: string | null;
}

export interface CreateCategoryInput {
  name: string;
  icon_key: string;
  type: 'income' | 'expense';
  color?: string;
  source?: CategorySource;
  display_order?: number;
}

export interface CreateSubcategoryInput {
  category_id: string;
  name: string;
  display_order?: number;
}

// Fetch user categories with subcategories
export function useUserCategories(includeArchived: boolean = false) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["user-categories", family?.id, includeArchived],
    queryFn: async () => {
      if (!family) return [];

      let query = supabase
        .from("user_categories")
        .select("*, user_subcategories(*)")
        .eq("family_id", family.id)
        .order("display_order", { ascending: true });

      if (!includeArchived) {
        query = query.eq("status", "ACTIVE");
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter subcategories based on includeArchived
      return (data as any[]).map(cat => ({
        ...cat,
        subcategories: (cat.user_subcategories || []).filter(
          (sub: any) => includeArchived || sub.status === 'ACTIVE'
        ),
      })) as UserCategory[];
    },
    enabled: !!family,
  });
}

// Create a new category
export function useCreateUserCategory() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (!family) throw new Error("No family");

      const { data, error } = await supabase
        .from("user_categories")
        .insert({
          family_id: family.id,
          name: input.name,
          icon_key: input.icon_key,
          type: input.type,
          color: input.color,
          source: input.source || 'USER_CUSTOM',
          display_order: input.display_order || 100,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await supabase.from("category_change_logs").insert({
        family_id: family.id,
        category_id: data.id,
        action: 'CREATED',
        new_name: input.name,
        performed_by_user_id: user?.id,
        metadata: { icon_key: input.icon_key, type: input.type },
      });

      return data as UserCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast.success("Categoria criada!");
    },
    onError: (error: any) => {
      console.error("Error creating category:", error);
      toast.error("Erro ao criar categoria");
    },
  });
}

// Rename category (with versioning if has transactions)
export function useRenameUserCategory() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      categoryId,
      newName,
      createNewVersion,
    }: {
      categoryId: string;
      newName: string;
      createNewVersion: boolean;
    }) => {
      if (!family) throw new Error("No family");

      const { data: oldCategory, error: fetchError } = await supabase
        .from("user_categories")
        .select("*")
        .eq("id", categoryId)
        .single();

      if (fetchError) throw fetchError;

      if (createNewVersion) {
        // Create new category with new name
        const { data: newCategory, error: createError } = await supabase
          .from("user_categories")
          .insert({
            family_id: family.id,
            name: newName,
            icon_key: oldCategory.icon_key,
            type: oldCategory.type,
            color: oldCategory.color,
            source: oldCategory.source,
            display_order: oldCategory.display_order,
            created_by_user_id: user?.id,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Archive old category and link to new
        const { error: archiveError } = await supabase
          .from("user_categories")
          .update({
            status: 'ARCHIVED',
            replaced_by_category_id: newCategory.id,
            archived_at: new Date().toISOString(),
            archived_by_user_id: user?.id,
          })
          .eq("id", categoryId);

        if (archiveError) throw archiveError;

        // Log the rename action
        await supabase.from("category_change_logs").insert({
          family_id: family.id,
          category_id: newCategory.id,
          action: 'RENAMED',
          old_name: oldCategory.name,
          new_name: newName,
          old_category_id: categoryId,
          new_category_id: newCategory.id,
          affected_transaction_count: oldCategory.transaction_count,
          performed_by_user_id: user?.id,
          metadata: { versioned: true },
        });

        return { oldCategory, newCategory };
      } else {
        // Direct rename (no transactions)
        const { error: updateError } = await supabase
          .from("user_categories")
          .update({ name: newName })
          .eq("id", categoryId);

        if (updateError) throw updateError;

        await supabase.from("category_change_logs").insert({
          family_id: family.id,
          category_id: categoryId,
          action: 'RENAMED',
          old_name: oldCategory.name,
          new_name: newName,
          performed_by_user_id: user?.id,
          metadata: { versioned: false },
        });

        return { oldCategory, newCategory: { ...oldCategory, name: newName } };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      if (variables.createNewVersion) {
        toast.success("Categoria renomeada (nova versão criada)", {
          description: "Transações antigas mantêm a classificação anterior.",
        });
      } else {
        toast.success("Categoria renomeada!");
      }
    },
    onError: (error: any) => {
      console.error("Error renaming category:", error);
      toast.error("Erro ao renomear categoria");
    },
  });
}

// Archive category
export function useArchiveUserCategory() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!family) throw new Error("No family");

      const { data: category, error: fetchError } = await supabase
        .from("user_categories")
        .select("*")
        .eq("id", categoryId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("user_categories")
        .update({
          status: 'ARCHIVED',
          archived_at: new Date().toISOString(),
          archived_by_user_id: user?.id,
        })
        .eq("id", categoryId);

      if (error) throw error;

      await supabase.from("category_change_logs").insert({
        family_id: family.id,
        category_id: categoryId,
        action: 'ARCHIVED',
        old_name: category.name,
        performed_by_user_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast.success("Categoria arquivada");
    },
    onError: (error: any) => {
      console.error("Error archiving category:", error);
      toast.error("Erro ao arquivar categoria");
    },
  });
}

// Restore archived category
export function useRestoreUserCategory() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!family) throw new Error("No family");

      const { error } = await supabase
        .from("user_categories")
        .update({
          status: 'ACTIVE',
          archived_at: null,
          archived_by_user_id: null,
        })
        .eq("id", categoryId);

      if (error) throw error;

      await supabase.from("category_change_logs").insert({
        family_id: family.id,
        category_id: categoryId,
        action: 'RESTORED',
        performed_by_user_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast.success("Categoria restaurada");
    },
    onError: (error: any) => {
      console.error("Error restoring category:", error);
      toast.error("Erro ao restaurar categoria");
    },
  });
}

// Duplicate category
export function useDuplicateUserCategory() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      categoryId,
      newName,
      newIconKey,
      includeArchivedSubcategories = false,
    }: {
      categoryId: string;
      newName: string;
      newIconKey: string;
      includeArchivedSubcategories?: boolean;
    }) => {
      if (!family) throw new Error("No family");

      const { data: original, error: fetchError } = await supabase
        .from("user_categories")
        .select("*, user_subcategories(*)")
        .eq("id", categoryId)
        .single();

      if (fetchError) throw fetchError;

      // Create new category
      const { data: newCategory, error: createError } = await supabase
        .from("user_categories")
        .insert({
          family_id: family.id,
          name: newName,
          icon_key: newIconKey,
          type: original.type,
          color: original.color,
          source: 'USER_CUSTOM',
          display_order: original.display_order + 1,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Filter subcategories based on includeArchivedSubcategories
      const subcategoriesToCopy = (original.user_subcategories || []).filter(
        (sub: any) => includeArchivedSubcategories || sub.status === 'ACTIVE'
      );

      // Duplicate subcategories
      if (subcategoriesToCopy.length > 0) {
        const subcategoriesToCreate = subcategoriesToCopy.map((sub: any) => ({
          category_id: newCategory.id,
          family_id: family.id,
          name: sub.name,
          display_order: sub.display_order,
          created_by_user_id: user?.id,
          status: 'ACTIVE', // New copies are always active
        }));

        await supabase.from("user_subcategories").insert(subcategoriesToCreate);
      }

      await supabase.from("category_change_logs").insert({
        family_id: family.id,
        category_id: newCategory.id,
        action: 'DUPLICATED',
        old_name: original.name,
        new_name: newName,
        old_category_id: categoryId,
        new_category_id: newCategory.id,
        performed_by_user_id: user?.id,
        metadata: { 
          subcategories_count: subcategoriesToCopy.length,
          included_archived: includeArchivedSubcategories,
          original_icon: original.icon_key,
          new_icon: newIconKey,
        },
      });

      return newCategory as UserCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast.success("Categoria duplicada!");
    },
    onError: (error: any) => {
      console.error("Error duplicating category:", error);
      toast.error("Erro ao duplicar categoria");
    },
  });
}

// Create subcategory
export function useCreateUserSubcategory() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSubcategoryInput) => {
      if (!family) throw new Error("No family");

      const { data, error } = await supabase
        .from("user_subcategories")
        .insert({
          category_id: input.category_id,
          family_id: family.id,
          name: input.name,
          display_order: input.display_order || 0,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserSubcategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast.success("Subcategoria criada!");
    },
    onError: (error: any) => {
      console.error("Error creating subcategory:", error);
      toast.error("Erro ao criar subcategoria");
    },
  });
}

// Archive subcategory
export function useArchiveUserSubcategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (subcategoryId: string) => {
      const { error } = await supabase
        .from("user_subcategories")
        .update({
          status: 'ARCHIVED',
          archived_at: new Date().toISOString(),
          archived_by_user_id: user?.id,
        })
        .eq("id", subcategoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast.success("Subcategoria arquivada");
    },
    onError: (error: any) => {
      console.error("Error archiving subcategory:", error);
      toast.error("Erro ao arquivar subcategoria");
    },
  });
}

// Get transaction count for a category (to check before rename)
export function useCategoryTransactionCount() {
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!family) return 0;

      const { data, error } = await supabase.rpc('get_category_transaction_count', {
        p_category_id: categoryId,
        p_family_id: family.id,
      });

      if (error) throw error;
      return data as number;
    },
  });
}

// Bulk reclassify transactions
export function useBulkReclassifyTransactions() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      oldCategoryId,
      newCategoryId,
      oldSubcategoryId,
      newSubcategoryId,
    }: {
      oldCategoryId: string;
      newCategoryId: string;
      oldSubcategoryId?: string;
      newSubcategoryId?: string;
    }) => {
      if (!family) throw new Error("No family");

      const { data, error } = await supabase.rpc('bulk_reclassify_transactions', {
        p_family_id: family.id,
        p_old_category_id: oldCategoryId,
        p_new_category_id: newCategoryId,
        p_old_subcategory_id: oldSubcategoryId || null,
        p_new_subcategory_id: newSubcategoryId || null,
        p_performed_by: user?.id || null,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast.success(`${count} transações reclassificadas`);
    },
    onError: (error: any) => {
      console.error("Error reclassifying transactions:", error);
      toast.error("Erro ao reclassificar transações");
    },
  });
}
