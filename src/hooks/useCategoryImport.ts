import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { parseExcelFile, ParsedRow } from "@/lib/excelParser";

// Hook to rename subcategory
export function useRenameSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subcategoryId,
      newName,
    }: {
      subcategoryId: string;
      newName: string;
    }) => {
      const { error } = await supabase
        .from('user_subcategories')
        .update({ name: newName })
        .eq('id', subcategoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-categories'] });
      toast.success('Subcategoria renomeada!');
    },
    onError: (error: any) => {
      console.error('Error renaming subcategory:', error);
      toast.error('Erro ao renomear subcategoria');
    },
  });
}

export interface ParsedSubcategory {
  name: string;
  active: boolean;
}

export interface ParsedCategory {
  name: string;
  type: 'DESPESA' | 'RECEITA' | 'OBJETIVO';
  active: boolean;
  subcategories: ParsedSubcategory[];
}

export interface ParsedCategoryData {
  categories: ParsedCategory[];
  totalSubcategories: number;
  totalRows: number;
  duplicatesConsolidated: number;
  warnings: string[];
}

const normalizeText = (text: string): string => {
  return text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const normalizeType = (type: string | undefined): 'DESPESA' | 'RECEITA' | 'OBJETIVO' => {
  if (!type) return 'DESPESA';
  const normalized = normalizeText(type);
  if (normalized.includes('receita') || normalized.includes('income')) return 'RECEITA';
  if (normalized.includes('objetivo') || normalized.includes('goal')) return 'OBJETIVO';
  return 'DESPESA';
};

const normalizeActive = (active: string | undefined): boolean => {
  if (!active) return true;
  const normalized = normalizeText(active);
  return normalized !== 'nao' && normalized !== 'n' && normalized !== 'false' && normalized !== '0';
};

export function useImportCategories() {
  const { family, user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const parseFile = useCallback(async (file: File): Promise<ParsedCategoryData> => {
    try {
      // Use secure ExcelJS parser
      const result = await parseExcelFile(file, {
        sheetIndex: 'categoria', // Try to find sheet with "categoria" in name
        maxRows: 2000,
      });

      const { headers, rows } = result;
      
      // Find column indices
      const colIndices = {
        categoria: headers.findIndex(h => normalizeText(h).includes('categoria')),
        subcategoria: headers.findIndex(h => normalizeText(h).includes('subcategoria')),
        tipo: headers.findIndex(h => normalizeText(h).includes('tipo')),
        ativo: headers.findIndex(h => normalizeText(h).includes('ativo')),
      };

      if (colIndices.categoria === -1) {
        throw new Error('Coluna "Categoria" não encontrada na planilha');
      }

      // Parse data rows
      const categoriesMap = new Map<string, ParsedCategory>();
      const subcategoriesSet = new Set<string>();
      let duplicatesConsolidated = 0;
      const warnings: string[] = [];

      for (const row of rows) {
        const rowValues = headers.map(h => row[h]);
        if (!rowValues[colIndices.categoria]) continue;

        const categoryName = String(rowValues[colIndices.categoria]).trim();
        const subcategoryName = colIndices.subcategoria >= 0 
          ? String(rowValues[colIndices.subcategoria] || '').trim()
          : '';
        const type = colIndices.tipo >= 0 
          ? normalizeType(String(rowValues[colIndices.tipo] || ''))
          : 'DESPESA';
        const active = colIndices.ativo >= 0
          ? normalizeActive(String(rowValues[colIndices.ativo] || ''))
          : true;

        const categoryKey = normalizeText(categoryName);
        
        if (!categoriesMap.has(categoryKey)) {
          categoriesMap.set(categoryKey, {
            name: categoryName,
            type,
            active,
            subcategories: [],
          });
        }

        if (subcategoryName) {
          const subKey = `${categoryKey}::${normalizeText(subcategoryName)}`;
          if (subcategoriesSet.has(subKey)) {
            duplicatesConsolidated++;
          } else {
            subcategoriesSet.add(subKey);
            categoriesMap.get(categoryKey)!.subcategories.push({
              name: subcategoryName,
              active,
            });
          }
        }
      }

      const categories = Array.from(categoriesMap.values());
      const totalSubcategories = categories.reduce((sum, cat) => sum + cat.subcategories.length, 0);

      // Check if truncated
      if (result.truncated) {
        warnings.push('Limite de 2000 linhas excedido. Algumas linhas foram ignoradas.');
      }

      return {
        categories,
        totalSubcategories,
        totalRows: rows.length,
        duplicatesConsolidated,
        warnings,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao processar arquivo');
    }
  }, []);

  const importMutation = useMutation({
    mutationFn: async ({
      data,
      mode,
      mappings,
    }: {
      data: ParsedCategoryData;
      mode: 'reclassify' | 'forward_only';
      mappings?: Record<string, { categoryId: string; subcategoryId?: string }>;
    }) => {
      if (!family || !user) throw new Error('Usuário não autenticado');

      setProgress(10);

      // Create import session log
      const { data: session, error: sessionError } = await supabase
        .from('category_import_sessions')
        .insert({
          family_id: family.id,
          import_type: 'EXCEL_IMPORT',
          categories_imported: data.categories.length,
          subcategories_imported: data.totalSubcategories,
          transactions_count: 0,
          decision: mode,
          metadata: {
            warnings: data.warnings,
            duplicates_consolidated: data.duplicatesConsolidated,
          },
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setProgress(20);

      // Get existing categories to handle reclassification
      const { data: existingCategories } = await supabase
        .from('user_categories')
        .select('*, user_subcategories(*)')
        .eq('family_id', family.id)
        .eq('status', 'ACTIVE');

      setProgress(30);

      if (mode === 'forward_only') {
        // Archive all current categories
        if (existingCategories && existingCategories.length > 0) {
          await supabase
            .from('user_categories')
            .update({ 
              status: 'ARCHIVED', 
              archived_at: new Date().toISOString(),
              archived_by_user_id: user.id,
            })
            .eq('family_id', family.id)
            .eq('status', 'ACTIVE');
        }
      }

      setProgress(50);

      // Map category type to DB type
      const typeMap: Record<string, 'income' | 'expense'> = {
        'RECEITA': 'income',
        'DESPESA': 'expense',
        'OBJETIVO': 'expense', // Goals are expenses in DB
      };

      // Map category name to icon
      const iconMap: Record<string, string> = {
        'moradia': 'home',
        'casa': 'home',
        'alimentação': 'utensils',
        'alimentacao': 'utensils',
        'transporte': 'car',
        'lazer': 'party',
        'saúde': 'heart',
        'saude': 'heart',
        'educação': 'graduationcap',
        'educacao': 'graduationcap',
        'renda': 'wallet',
        'rendas': 'wallet',
      };

      const getIconForCategory = (name: string): string => {
        const normalized = normalizeText(name);
        for (const [key, icon] of Object.entries(iconMap)) {
          if (normalized.includes(key)) return icon;
        }
        return 'package';
      };

      // Insert new categories
      const createdCategories: { id: string; name: string }[] = [];

      for (let i = 0; i < data.categories.length; i++) {
        const cat = data.categories[i];
        
        const { data: newCat, error: catError } = await supabase
          .from('user_categories')
          .insert({
            family_id: family.id,
            name: cat.name,
            type: typeMap[cat.type] || 'expense',
            icon_key: getIconForCategory(cat.name),
            source: 'IMPORTED_SPREADSHEET',
            status: cat.active ? 'ACTIVE' : 'ARCHIVED',
            display_order: i * 10,
            created_by_user_id: user.id,
          })
          .select()
          .single();

        if (catError) throw catError;
        
        createdCategories.push({ id: newCat.id, name: cat.name });

        // Insert subcategories
        if (cat.subcategories.length > 0) {
          const subInserts = cat.subcategories.map((sub, subIdx) => ({
            category_id: newCat.id,
            family_id: family.id,
            name: sub.name,
            status: sub.active ? 'ACTIVE' : 'ARCHIVED',
            display_order: subIdx * 10,
            created_by_user_id: user.id,
          }));

          const { error: subError } = await supabase
            .from('user_subcategories')
            .insert(subInserts);

          if (subError) throw subError;
        }

        setProgress(50 + Math.floor((i / data.categories.length) * 40));
      }

      // Handle reclassification if needed
      if (mode === 'reclassify' && mappings && existingCategories) {
        setProgress(92);
        
        // Process mappings to update transactions
        for (const [oldId, newMapping] of Object.entries(mappings)) {
          const { error: reclassError } = await supabase.rpc('bulk_reclassify_transactions', {
            p_family_id: family.id,
            p_old_category_id: oldId,
            p_new_category_id: newMapping.categoryId,
            p_old_subcategory_id: null,
            p_new_subcategory_id: newMapping.subcategoryId || null,
            p_performed_by: user.id,
          });

          if (reclassError) {
            console.error('Reclassification error:', reclassError);
          }
        }
      }

      // Update session as completed
      await supabase
        .from('category_import_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', session.id);

      setProgress(100);

      return { 
        categoriesCreated: createdCategories.length,
        subcategoriesCreated: data.totalSubcategories,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const importCategories = async (
    data: ParsedCategoryData,
    mode: 'reclassify' | 'forward_only',
    mappings?: Record<string, { categoryId: string; subcategoryId?: string }>
  ) => {
    return importMutation.mutateAsync({ data, mode, mappings });
  };

  return {
    parseFile,
    importCategories,
    isLoading: importMutation.isPending,
    progress,
  };
}
