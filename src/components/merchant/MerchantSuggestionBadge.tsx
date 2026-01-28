import { useMemo, useState } from "react";
import { Store, Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";
import { MerchantEvidenceCard } from "./MerchantEvidenceCard";
import type { MerchantResolution } from "@/lib/merchantEnrichment";

interface MerchantSuggestionBadgeProps {
  resolution: MerchantResolution | null;
  originalDescriptor: string;
  onAccept?: (categoryId: string, subcategoryId: string | null) => void;
  className?: string;
  showEvidence?: boolean;
}

/**
 * Compact badge showing merchant suggestion with expandable evidence
 */
export function MerchantSuggestionBadge({
  resolution,
  originalDescriptor,
  onAccept,
  className,
  showEvidence = true,
}: MerchantSuggestionBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const category = useMemo(() => {
    if (!resolution?.suggestedCategoryId) return null;
    return getCategoryById(resolution.suggestedCategoryId);
  }, [resolution?.suggestedCategoryId]);
  
  if (!resolution || resolution.confidence === 0) {
    return null;
  }
  
  const confidenceLevel = 
    resolution.confidence >= 0.85 ? "high" :
    resolution.confidence >= 0.6 ? "medium" : "low";
  
  const badgeVariant = 
    confidenceLevel === "high" ? "default" :
    confidenceLevel === "medium" ? "secondary" : "outline";

  return (
    <div className={cn("space-y-2", className)}>
      {/* Compact badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge 
          variant={badgeVariant}
          className={cn(
            "gap-1 cursor-pointer transition-colors",
            confidenceLevel === "high" && "bg-success/20 text-success hover:bg-success/30 border-success/30",
            confidenceLevel === "medium" && "bg-warning/20 text-warning hover:bg-warning/30 border-warning/30",
          )}
          onClick={() => setShowDetails(!showDetails)}
        >
          <Sparkles className="w-3 h-3" />
          <span>Sugestão</span>
        </Badge>
        
        {resolution.merchantLabel && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Store className="w-3 h-3" />
            {resolution.merchantLabel}
          </span>
        )}
        
        {resolution.isIntermediary && (
          <Badge variant="outline" className="text-xs text-warning gap-1">
            <AlertTriangle className="w-3 h-3" />
            Intermediador
          </Badge>
        )}
        
        {category && (
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ 
              backgroundColor: `${category.color}15`,
              borderColor: `${category.color}40`,
            }}
          >
            {category.icon} {category.name}
          </Badge>
        )}
      </div>
      
      {/* Expandable evidence */}
      {showEvidence && showDetails && (
        <MerchantEvidenceCard
          resolution={resolution}
          originalDescriptor={originalDescriptor}
          onApplyAndLearn={
            onAccept && resolution.suggestedCategoryId
              ? () => onAccept(resolution.suggestedCategoryId!, resolution.suggestedSubcategoryId)
              : undefined
          }
        />
      )}
    </div>
  );
}
