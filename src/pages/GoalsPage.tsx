import { ArrowLeft, Plus, Target, Plane, GraduationCap, Car, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmergencyFundProgress } from "@/components/EmergencyFundProgress";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { mockFinanceSummary } from "@/data/mockData";
import { toast } from "sonner";

interface GoalsPageProps {
  onBack: () => void;
}

const sampleGoals = [
  {
    id: "1",
    name: "Férias em Família",
    icon: Plane,
    target: 8000,
    current: 3200,
    color: "hsl(var(--info))",
    deadline: "Dez 2026",
  },
  {
    id: "2",
    name: "Faculdade dos Filhos",
    icon: GraduationCap,
    target: 50000,
    current: 12500,
    color: "hsl(var(--chart-5))",
    deadline: "2030",
  },
  {
    id: "3",
    name: "Troca do Carro",
    icon: Car,
    target: 45000,
    current: 8000,
    color: "hsl(var(--chart-3))",
    deadline: "2027",
  },
];

export function GoalsPage({ onBack }: GoalsPageProps) {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Metas Financeiras</h1>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2"
              onClick={() => toast.info("Em breve! Crie metas personalizadas.")}
            >
              <Plus className="w-4 h-4" />
              Nova
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-6">
        {/* Emergency Fund - Priority */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">PRIORIDADE</h2>
          <EmergencyFundProgress 
            fund={mockFinanceSummary.emergencyFund}
            onAddFund={() => toast.info("Em breve!")}
          />
        </div>

        {/* Other Goals */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">OUTRAS METAS</h2>
          <div className="space-y-3">
            {sampleGoals.map((goal) => {
              const Icon = goal.icon;
              const percentage = (goal.current / goal.target) * 100;
              
              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-2xl bg-card border border-border/30"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: goal.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{goal.name}</p>
                      <p className="text-sm text-muted-foreground">Meta: {goal.deadline}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatPercentage(percentage)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: goal.color 
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.current)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.target)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip */}
        <div className="p-4 rounded-2xl bg-success/10 border border-success/20">
          <p className="text-sm text-success leading-relaxed">
            🎯 <strong>Vocês estão construindo o futuro!</strong> Cada meta definida é um passo 
            para realizar os sonhos da família. Lembrem-se: metas financeiras claras reduzem 
            a ansiedade e fortalecem a união familiar.
          </p>
        </div>
      </main>
    </div>
  );
}
