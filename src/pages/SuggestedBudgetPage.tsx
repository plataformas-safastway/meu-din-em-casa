import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RefreshCw, 
  LineChart, 
  Clock, 
  ArrowLeft,
  Calendar,
  ChevronRight,
  Sparkles,
  History,
  AlertTriangle,
  Check,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MoneyLoader } from "@/components/ui/money-loader";
import { formatCurrency } from "@/lib/formatters";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { 
  useBudgetVersions, 
  useActiveBudgetForMonth, 
  useBudgetVersionItems,
  useCreateBudgetVersion,
  type BudgetVersion 
} from "@/hooks/useBudgetVersions";
import { useBudgetTemplate } from "@/hooks/useBudgetTemplate";
import { BudgetVersionWizard, BudgetVersionPreview, TransactionsBasedWizard } from "@/components/budget-version";
import type { OnboardingData } from "@/data/budgetModes";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";

type FlowType = "onboarding" | "transactions" | null;
type ViewMode = "main" | "wizard" | "preview" | "history";

interface SuggestedBudgetPageProps {
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}

export function SuggestedBudgetPage({ onBack, onNavigate }: SuggestedBudgetPageProps) {
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [effectiveMonth, setEffectiveMonth] = useState<string>("");
  const [generatedItems, setGeneratedItems] = useState<Array<{
    category_id: string;
    subcategory_id: string | null;
    suggested_amount: number;
    min_amount: number | null;
    max_amount: number | null;
    confidence: number | null;
    rationale: string | null;
  }>>([]);

  const { data: versions, isLoading: versionsLoading } = useBudgetVersions();
  const { data: activeBudget, isLoading: activeBudgetLoading } = useActiveBudgetForMonth();
  const { data: activeItems } = useBudgetVersionItems(activeBudget?.id);
  const { previewBudget } = useBudgetTemplate();
  const createVersion = useCreateBudgetVersion();

  const totalBudget = activeItems?.reduce((sum, item) => sum + Number(item.suggested_amount), 0) || 0;

  // Handle onboarding-based wizard completion
  const handleOnboardingComplete = (data: OnboardingData, month: string) => {
    setOnboardingData(data);
    setEffectiveMonth(month);

    // Generate budget items from onboarding data
    const preview = previewBudget({
      incomeBandId: data.incomeBandId,
      incomeSubBandId: data.incomeBandId, // Uses first subband if not specified
      hasPets: data.hasPets,
      hasDependents: data.hasDependents,
    });

    if (preview) {
      const items = preview.items.map((item) => ({
        category_id: item.categoryId,
        subcategory_id: null,
        suggested_amount: item.amount,
        min_amount: null,
        max_amount: null,
        confidence: 0.9,
        rationale: `Baseado no perfil: ${data.budgetMode}`,
      }));
      setGeneratedItems(items);
    }

    setViewMode("preview");
  };

  // Handle transactions-based wizard completion
  const handleTransactionsComplete = (
    items: typeof generatedItems, 
    month: string, 
    inputSnapshot: Record<string, unknown>
  ) => {
    setGeneratedItems(items);
    setEffectiveMonth(month);
    setOnboardingData(inputSnapshot.onboardingData as OnboardingData);
    setViewMode("preview");
  };

  // Confirm and create the budget version
  const handleConfirmBudget = async () => {
    try {
      await createVersion.mutateAsync({
        source_type: flowType === "transactions" ? "transactions_based" : "onboarding_only",
        effective_month: effectiveMonth,
        notes: `Criado via ${flowType === "transactions" ? "dados reais" : "diagnóstico"}`,
        input_snapshot: { onboardingData, generatedAt: new Date().toISOString() },
        items: generatedItems,
      });

      toast.success("Orçamento criado com sucesso!", {
        description: `Vigente a partir de ${format(parse(effectiveMonth, "yyyy-MM", new Date()), "MMMM 'de' yyyy", { locale: ptBR })}`,
      });

      // Reset and go back to main view
      setFlowType(null);
      setViewMode("main");
      setGeneratedItems([]);
    } catch (error) {
      toast.error("Erro ao criar orçamento", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    }
  };

  // Cancel and go back
  const handleCancel = () => {
    setFlowType(null);
    setViewMode("main");
    setGeneratedItems([]);
  };

  if (versionsLoading || activeBudgetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MoneyLoader label="Carregando orçamento..." />
      </div>
    );
  }

  // Wizard views
  if (viewMode === "wizard") {
    if (flowType === "transactions") {
      return (
        <TransactionsBasedWizard
          onComplete={handleTransactionsComplete}
          onCancel={handleCancel}
          isLoading={createVersion.isPending}
        />
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <BudgetVersionWizard
          onComplete={handleOnboardingComplete}
          onCancel={handleCancel}
          initialData={onboardingData || undefined}
          isLoading={createVersion.isPending}
        />
      </div>
    );
  }

  // Preview view
  if (viewMode === "preview") {
    return (
      <div className="min-h-screen bg-background p-6">
        <BudgetVersionPreview
          items={generatedItems}
          effectiveMonth={effectiveMonth}
          sourceType={flowType === "transactions" ? "transactions_based" : "onboarding_only"}
          onConfirm={handleConfirmBudget}
          onBack={() => setViewMode("wizard")}
          isLoading={createVersion.isPending}
        />
      </div>
    );
  }

  // History view
  if (viewMode === "history") {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewMode("main")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Histórico de Versões</h1>
            <p className="text-sm text-muted-foreground">
              Todas as versões de orçamento da sua família
            </p>
          </div>
        </header>

        <div className="space-y-3">
          {versions?.map((version, idx) => (
            <VersionCard key={version.id} version={version} isLatest={idx === 0} />
          ))}

          {versions?.length === 0 && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Nenhuma versão de orçamento encontrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Orçamento Sugerido</h1>
              <p className="text-sm text-muted-foreground">
                Planejamento inteligente baseado no seu perfil
              </p>
            </div>
          </div>
          {onNavigate && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onNavigate("help")}
              aria-label="Ajuda"
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Current Budget Card */}
        {activeBudget ? (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Orçamento Ativo
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {activeBudget.source_type === "transactions_based" ? "Baseado em dados" : "Diagnóstico"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalBudget)}</p>
                  <p className="text-sm text-muted-foreground">
                    Vigente desde {format(parse(activeBudget.effective_month, "yyyy-MM", new Date()), "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Calendar className="w-10 h-10 text-primary/50" />
              </div>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {activeItems?.length || 0} categorias com orçamento
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => setViewMode("history")}
                >
                  <History className="w-4 h-4" />
                  Ver histórico
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <Sparkles className="w-12 h-12 text-primary mx-auto" />
              <div>
                <h3 className="font-semibold">Nenhum orçamento sugerido</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie seu primeiro orçamento inteligente para começar a planejar
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            Gerar novo orçamento
          </h2>

          {/* Option 1: Onboarding-based */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => {
              setFlowType("onboarding");
              setViewMode("wizard");
            }}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Refazer diagnóstico</p>
                <p className="text-sm text-muted-foreground">
                  Responder as perguntas e gerar um novo orçamento
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>

          {/* Option 2: Transactions-based */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => {
              setFlowType("transactions");
              setViewMode("wizard");
            }}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <LineChart className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Usar gastos reais</p>
                <p className="text-sm text-muted-foreground">
                  Baseado nas suas transações categorizadas
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-muted/20">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Como funciona a vigência</p>
              <p className="text-muted-foreground mt-1">
                Ao criar um novo orçamento, você escolhe a partir de qual mês ele vale. 
                <strong> Orçamentos anteriores não são alterados</strong>, garantindo histórico auditável.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Version card component
function VersionCard({ version, isLatest }: { version: BudgetVersion; isLatest: boolean }) {
  const effectiveDate = parse(version.effective_month, "yyyy-MM", new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        version.status === "active" && "border-primary/30 bg-primary/5"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant={version.status === "active" ? "default" : "secondary"}
                className="text-xs"
              >
                {version.status === "active" ? "Ativo" : version.status === "archived" ? "Arquivado" : "Rascunho"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {version.source_type === "transactions_based" ? "Dados reais" : "Diagnóstico"}
              </Badge>
            </div>
            {isLatest && version.status === "active" && (
              <Check className="w-4 h-4 text-success" />
            )}
          </div>

          <p className="font-medium capitalize">
            {format(effectiveDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-sm text-muted-foreground">
            Criado em {format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default SuggestedBudgetPage;
