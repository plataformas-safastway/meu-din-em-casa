import { useState, useMemo } from "react";
import { Check, Search } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Curated list of icons relevant for financial categories
const CATEGORY_ICONS = [
  // Home & Living
  "home", "building-2", "sofa", "lamp", "plug", "droplets", "flame", "thermometer",
  // Food & Dining
  "utensils", "coffee", "wine", "beer", "pizza", "sandwich", "salad", "cake",
  // Transportation
  "car", "bus", "train", "plane", "bike", "fuel", "navigation", "map-pin",
  // Shopping & Retail
  "shopping-cart", "shopping-bag", "shirt", "watch", "gift", "tag", "percent", "store",
  // Health & Wellness
  "heart-pulse", "pill", "stethoscope", "dumbbell", "activity", "apple", "brain",
  // Education & Learning
  "graduation-cap", "book-open", "notebook", "pencil", "school", "library",
  // Entertainment & Leisure
  "gamepad-2", "music", "film", "tv", "ticket", "camera", "palette", "trophy",
  // Finance & Business
  "wallet", "credit-card", "banknote", "piggy-bank", "trending-up", "briefcase", "chart-bar",
  // Family & Personal
  "users", "baby", "dog", "cat", "smile", "heart", "star", "crown",
  // Technology
  "smartphone", "laptop", "monitor", "wifi", "headphones", "printer", "cable",
  // Travel & Vacation
  "luggage", "tent", "mountain", "umbrella-beach", "palm-tree", "globe",
  // Services & Subscriptions
  "zap", "cloud", "shield", "key", "mail", "phone", "bell",
  // Other
  "circle-help", "package", "wrench", "scissors", "recycle", "leaf", "sun", "moon",
];

// Icon name to display name mapping for search
const ICON_SEARCH_TERMS: Record<string, string[]> = {
  "home": ["casa", "moradia", "residência"],
  "utensils": ["comida", "alimentação", "refeição", "restaurante"],
  "car": ["carro", "automóvel", "transporte", "veículo"],
  "shopping-cart": ["compras", "mercado", "supermercado"],
  "heart-pulse": ["saúde", "médico", "hospital"],
  "graduation-cap": ["educação", "escola", "faculdade", "estudo"],
  "gamepad-2": ["lazer", "entretenimento", "jogos"],
  "wallet": ["dinheiro", "carteira", "finanças"],
  "users": ["família", "pessoas", "grupo"],
  "smartphone": ["telefone", "celular", "tecnologia"],
  "luggage": ["viagem", "férias", "turismo"],
  "zap": ["serviços", "assinaturas", "streaming"],
  "credit-card": ["cartão", "crédito", "pagamento"],
  "piggy-bank": ["poupança", "economia", "investimento"],
  "baby": ["filho", "criança", "bebê"],
  "dog": ["pet", "animal", "cachorro"],
  "cat": ["pet", "animal", "gato"],
};

interface IconPickerProps {
  value: string;
  onChange: (iconKey: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search) return CATEGORY_ICONS;
    
    const searchLower = search.toLowerCase();
    return CATEGORY_ICONS.filter(iconName => {
      // Match icon name
      if (iconName.toLowerCase().includes(searchLower)) return true;
      // Match Portuguese search terms
      const terms = ICON_SEARCH_TERMS[iconName] || [];
      return terms.some(term => term.toLowerCase().includes(searchLower));
    });
  }, [search]);

  const getIconComponent = (iconName: string) => {
    // Convert kebab-case to PascalCase for Lucide
    const pascalName = iconName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    return (LucideIcons as any)[pascalName] || LucideIcons.CircleHelp;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ícone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>
      
      <ScrollArea className="h-48 border rounded-xl p-2">
        <div className="grid grid-cols-6 gap-2">
          {filteredIcons.map((iconName) => {
            const IconComponent = getIconComponent(iconName);
            const isSelected = value === iconName;
            
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onChange(iconName)}
                className={cn(
                  "relative flex items-center justify-center p-3 rounded-xl transition-all",
                  "hover:bg-primary/10 active:scale-95",
                  isSelected
                    ? "bg-primary/15 ring-2 ring-primary"
                    : "bg-muted/50"
                )}
              >
                <IconComponent className="w-5 h-5" />
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {filteredIcons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum ícone encontrado
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// Helper to render an icon by key
export function CategoryIcon({ 
  iconKey, 
  className 
}: { 
  iconKey: string; 
  className?: string;
}) {
  const pascalName = iconKey
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  const IconComponent = (LucideIcons as any)[pascalName] || LucideIcons.CircleHelp;
  
  return <IconComponent className={className} />;
}

export { CATEGORY_ICONS };
