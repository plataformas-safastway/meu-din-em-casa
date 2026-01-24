import { 
  User, 
  UserCheck, 
  Users, 
  AlertTriangle, 
  TrendingDown,
  Heart,
  Activity,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type UserStageData, type UserStage, STAGE_CONFIG } from "@/hooks/useUserStage";

const STAGE_ICONS: Record<UserStage, typeof User> = {
  new: User,
  activated: UserCheck,
  engaged: Users,
  stagnant: TrendingDown,
  churn_risk: AlertTriangle,
  healthy_active: Heart,
};

interface CSUserStageCardProps {
  stageData: UserStageData;
  compact?: boolean;
  showSignals?: boolean;
}

export function CSUserStageCard({ stageData, compact = false, showSignals = true }: CSUserStageCardProps) {
  const StageIcon = STAGE_ICONS[stageData.stage];
  const config = STAGE_CONFIG[stageData.stage];

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${stageData.stageBgColor}`}>
          <StageIcon className={`w-4 h-4 ${stageData.stageColor}`} />
        </div>
        <div>
          <p className={`font-medium text-sm ${stageData.stageColor}`}>
            {stageData.stageLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            Risco: {stageData.churnScore}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${stageData.stageBgColor}`}>
              <StageIcon className={`w-6 h-6 ${stageData.stageColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{stageData.stageLabel}</CardTitle>
              <CardDescription>{stageData.stageDescription}</CardDescription>
            </div>
          </div>
          <ChurnIndicator level={stageData.churnLevel} score={stageData.churnScore} />
        </div>
      </CardHeader>
      
      {showSignals && stageData.signals.length > 0 && (
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>Sinais detectados</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Sinais são indicadores de comportamento que ajudam a entender
                      o estágio do usuário. Nunca incluem dados financeiros.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {stageData.signals.map((signal, index) => (
                <Badge
                  key={`${signal.code}-${index}`}
                  variant={signal.type === 'positive' ? 'default' : signal.type === 'negative' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {signal.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface ChurnIndicatorProps {
  level: 'low' | 'medium' | 'high';
  score: number;
}

function ChurnIndicator({ level, score }: ChurnIndicatorProps) {
  const colorConfig = {
    low: { color: 'text-green-600', bg: 'bg-green-100', progressColor: 'bg-green-500' },
    medium: { color: 'text-amber-600', bg: 'bg-amber-100', progressColor: 'bg-amber-500' },
    high: { color: 'text-red-600', bg: 'bg-red-100', progressColor: 'bg-red-500' },
  };

  const config = colorConfig[level];
  const label = level === 'low' ? 'Baixo' : level === 'medium' ? 'Médio' : 'Alto';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`px-3 py-2 rounded-lg ${config.bg} text-center min-w-[80px]`}>
            <p className={`text-lg font-bold ${config.color}`}>{score}%</p>
            <p className="text-xs text-muted-foreground">Risco</p>
            <Progress 
              value={score} 
              className="h-1 mt-1" 
              indicatorClassName={config.progressColor}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">Risco de churn: {label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Score calculado com base em padrões de uso
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simple stage badge for lists
 */
export function UserStageBadge({ stage }: { stage: UserStage }) {
  const config = STAGE_CONFIG[stage];
  const StageIcon = STAGE_ICONS[stage];

  return (
    <Badge className={`${config.bgColor} ${config.color} border-0`}>
      <StageIcon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
