import { Shield, Plus } from "lucide-react";
import { EmergencyFund } from "@/types/finance";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { Button } from "@/components/ui/button";

interface EmergencyFundProgressProps {
  fund: EmergencyFund;
  onAddFund?: () => void;
}

export function EmergencyFundProgress({ fund, onAddFund }: EmergencyFundProgressProps) {
  const percentage = Math.min((fund.currentAmount / fund.targetAmount) * 100, 100);
  const remaining = fund.targetAmount - fund.currentAmount;
  
  // Calculate stroke-dasharray for the progress ring
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Reserva de Emergência</h3>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8"
          onClick={onAddFund}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-6">
        {/* Progress Ring */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="56"
              cy="56"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="56"
              cy="56"
              r="45"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="progress-ring"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Atual</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(fund.currentAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Meta</p>
            <p className="text-base font-medium text-muted-foreground">
              {formatCurrency(fund.targetAmount)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Faltam <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span> para a meta
          </p>
        </div>
      </div>

      {/* Motivational message */}
      <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
        <p className="text-sm text-success">
          ✨ Vocês estão no caminho certo! Cada real economizado fortalece a segurança da família.
        </p>
      </div>
    </div>
  );
}
