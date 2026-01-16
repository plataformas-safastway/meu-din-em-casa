import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Ebook {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  cta_text: string;
  cta_link: string;
  theme: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EbookInput {
  title: string;
  description?: string | null;
  cover_url?: string | null;
  cta_text?: string;
  cta_link: string;
  theme?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export function useEbooks() {
  return useQuery({
    queryKey: ["ebooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebook_ctas")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as Ebook[];
    },
  });
}

// Admin view - all ebooks including inactive
export function useAllEbooks() {
  return useQuery({
    queryKey: ["ebooks", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebook_ctas")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data as Ebook[];
    },
  });
}

export function useCreateEbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EbookInput) => {
      const { error } = await supabase.from("ebook_ctas").insert({
        title: input.title,
        description: input.description || null,
        cover_url: input.cover_url || null,
        cta_text: input.cta_text || "Ver eBook",
        cta_link: input.cta_link,
        theme: input.theme || null,
        display_order: input.display_order || 0,
        is_active: input.is_active ?? true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
  });
}

export function useUpdateEbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EbookInput> }) => {
      const { error } = await supabase
        .from("ebook_ctas")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
  });
}

export function useDeleteEbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ebook_ctas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
  });
}
