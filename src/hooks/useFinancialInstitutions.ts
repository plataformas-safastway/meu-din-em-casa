import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InstitutionType = 'retail_bank' | 'digital_bank' | 'investment_bank' | 'cooperative' | 'international';

export interface FinancialInstitution {
  id: string;
  name: string;
  code: string | null;
  type: InstitutionType;
  show_manual: boolean;
  logo_url: string;
  active: boolean;
}

export interface CardBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  active: boolean;
}

// Labels for institution types in Portuguese
export const institutionTypeLabels: Record<InstitutionType, string> = {
  retail_bank: 'Banco',
  digital_bank: 'Banco Digital',
  investment_bank: 'Investimento',
  cooperative: 'Cooperativa',
  international: 'Internacional',
};

export function useFinancialInstitutions(showManualOnly = true) {
  return useQuery({
    queryKey: ["financial_institutions", showManualOnly],
    queryFn: async () => {
      let query = supabase
        .from("financial_institutions")
        .select("*")
        .eq("active", true)
        .order("name");

      if (showManualOnly) {
        query = query.eq("show_manual", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialInstitution[];
    },
  });
}

export function useCardBrands() {
  return useQuery({
    queryKey: ["card_brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_brands")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as CardBrand[];
    },
  });
}

// Helper to format institution display label
export function formatInstitutionLabel(institution: FinancialInstitution): string {
  const parts: string[] = [institution.name];
  
  if (institution.code) {
    parts[0] = `${institution.name} (${institution.code})`;
  }
  
  return parts.join(' • ');
}

// Helper to get type badge for display
export function getInstitutionTypeBadge(type: InstitutionType): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  switch (type) {
    case 'cooperative':
      return { label: 'Cooperativa', variant: 'secondary' };
    case 'investment_bank':
      return { label: 'Investimento', variant: 'outline' };
    case 'international':
      return { label: 'Internacional', variant: 'outline' };
    case 'digital_bank':
      return { label: 'Digital', variant: 'default' };
    default:
      return { label: '', variant: 'default' };
  }
}

// Match institution by code or name (for imports/Open Finance)
export async function matchInstitution(codeOrName: string): Promise<FinancialInstitution | null> {
  // Try by code first
  if (/^\d{3}$/.test(codeOrName)) {
    const { data } = await supabase
      .from("financial_institutions")
      .select("*")
      .eq("code", codeOrName)
      .eq("active", true)
      .single();
    
    if (data) return data as FinancialInstitution;
  }
  
  // Try by normalized name
  const normalizedName = codeOrName.toLowerCase().trim();
  const { data } = await supabase
    .from("financial_institutions")
    .select("*")
    .eq("active", true)
    .ilike("name", `%${normalizedName}%`)
    .limit(1);
  
  return data?.[0] as FinancialInstitution | null;
}

// Match card brand by slug or name
export async function matchCardBrand(slugOrName: string): Promise<CardBrand | null> {
  const normalized = slugOrName.toLowerCase().trim();
  
  // Try by slug first
  const { data: bySlug } = await supabase
    .from("card_brands")
    .select("*")
    .eq("slug", normalized)
    .eq("active", true)
    .single();
  
  if (bySlug) return bySlug as CardBrand;
  
  // Try by name
  const { data: byName } = await supabase
    .from("card_brands")
    .select("*")
    .eq("active", true)
    .ilike("name", `%${normalized}%`)
    .limit(1);
  
  return byName?.[0] as CardBrand | null;
}
