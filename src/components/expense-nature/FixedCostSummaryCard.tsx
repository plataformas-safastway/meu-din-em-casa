import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Lock, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";
import { useFixedCostSummary } from "@/hooks/useFixedCostInsights";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FixedCostSummaryCardProps {
  monthRef?: string;
  onViewDetails?: () => void;
}

export function FixedCostSummaryCard({ monthRef, onViewDetails }: FixedCostSummaryCardProps) {
  const summary = useFixedCostSummary(monthRef);
  const { totalFixed, ratio, riskLevel, comparison, categoryBreakdown, isLoading } = summary;
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (totalFixed === 0 && categoryBreakdown.length === 0) {
    return null; // Don't show card if no fixed costs
  }
  
  const monthLabel = monthRef 
    ? format(parseISO(`${monthRef}-01`), "MMMM", { locale: ptBR })
    : format(new Date(), "MMMM", { locale: ptBR });
  
  const DirectionIcon = comparison?.direction === 'increase' 
    ? TrendingUp 
    : comparison?.direction === 'decrease' 
      ? TrendingDown 
      : Minus;
  
  const directionColor = comparison?.direction === 'increase'
    ? 'text-destructive'
    : comparison?.direction === 'decrease'
      ? 'text-success'
      : 'text-muted-foreground';
  
  const RiskIcon = riskLevel === 'high' 
    ? AlertTriangle 
    : riskLevel === 'low' 
      ? CheckCircle2 
      : Info;
  
  const riskColor = riskLevel === 'high'
    ? 'text-destructive'
    : riskLevel === 'low'
      ? 'text-success'
      : 'text-warning';
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-500" />
          Custo Fixo Estrutural
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main amount */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(totalFixed)}</p>
            <p className="text-xs text-muted-foreground capitalize">{monthLabel}</p>
          </div>
          
          {comparison && comparison.direction !== 'stable' && (
            <div className={cn("flex items-center gap-1 text-sm", directionColor)}>
              <DirectionIcon className="w-4 h-4" />
              <span>
                {comparison.direction === 'increase' ? '+' : ''}
                {formatCurrency(comparison.difference)}
              </span>
            </div>
          )}
        </div>
        
        {/* Ratio bar */}
        {ratio > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">% da renda comprometida</span>
              <div className={cn("flex items-center gap-1 font-medium", riskColor)}>
                <RiskIcon className="w-3 h-3" />
                {ratio.toFixed(0)}%
              </div>
            </div>
            <Progress 
              value={Math.min(ratio, 100)} 
              className={cn(
                "h-2",
                riskLevel === 'high' && "[&>div]:bg-destructive",
                riskLevel === 'medium' && "[&>div]:bg-warning",
                riskLevel === 'low' && "[&>div]:bg-success"
              )}
            />
          </div>
        )}
        
        {/* Top categories */}
        {categoryBreakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Principais custos fixos:</p>
            <div className="space-y-1">
              {categoryBreakdown.slice(0, 3).map((cat) => (
                <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{cat.categoryName}</span>
                  <span className="font-medium">{formatCurrency(cat.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {onViewDetails && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewDetails}
            className="w-full text-xs"
          >
            Ver detalhes
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
