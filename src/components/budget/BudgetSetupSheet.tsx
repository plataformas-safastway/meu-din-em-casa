import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Wallet, Settings2, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { MoneyLoader } from "@/components/ui/money-loader";
import { IncomeBandSelector } from "@/components/onboarding/IncomeBandSelector";
import { useBudgetTemplate } from "@/hooks/useBudgetTemplate";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBandById, getSubBandById, getPrefixConfig } from "@/data/budgetTemplates";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";

interface BudgetSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BudgetSetupSheet({ open, onOpenChange }: BudgetSetupSheetProps) {
  const [showSelector, setShowSelector] = useState(false);
  const { familySettings, lastApplication, isLoading, previewBudget } = useBudgetTemplate();

  const handleComplete = () => {
    setShowSelector(false);
    onOpenChange(false);
  };

  const hasExistingSetup = !!lastApplication;

  // Get current configuration preview
  const currentPreview = familySettings?.income_range && familySettings?.income_subband
    ? previewBudget({
        incomeBandId: familySettings.income_range,
        incomeSubBandId: familySettings.income_subband,
        hasPets: familySettings.has_pets || false,
        hasDependents: familySettings.has_dependents || false,
      })
    : null;

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <MoneyLoader label="Carregando..." />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {showSelector && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSelector(false)}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Wallet className="w-5 h-5 text-primary" />
            {showSelector ? "Configurar Orçamento" : "Orçamento Inteligente"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {showSelector ? (
              <motion.div
                key="selector"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <IncomeBandSelector
                  onComplete={handleComplete}
                  onSkip={() => setShowSelector(false)}
                  showSkip={hasExistingSetup}
                />
              </motion.div>
            ) : (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {hasExistingSetup && currentPreview ? (
                  <>
                    {/* Current Setup Summary */}
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Faixa configurada</p>
                          <span className="font-semibold">{currentPreview.subBand.label}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Orçamento mensal</p>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(currentPreview.totalBudgeted)}
                          </span>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {familySettings?.has_dependents && (
                            <span className="bg-muted px-2 py-0.5 rounded">👶 Com filhos</span>
                          )}
                          {familySettings?.has_pets && (
                            <span className="bg-muted px-2 py-0.5 rounded">🐶 Com pets</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Budget Categories Preview */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Distribuição por categoria</h3>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {currentPreview.items.slice(0, 6).map((item) => {
                          const category = getCategoryById(item.categoryId);
                          return (
                            <div 
                              key={item.code} 
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                            >
                              <div className="flex items-center gap-2">
                                <span>{category?.icon || "📦"}</span>
                                <span className="text-sm">{item.name}</span>
                              </div>
                              <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                          );
                        })}
                        {currentPreview.items.length > 6 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            +{currentPreview.items.length - 6} categorias
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Last Application Info */}
                    {lastApplication && (
                      <p className="text-xs text-muted-foreground text-center">
                        Aplicado em {format(new Date(lastApplication.applied_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button 
                        onClick={() => setShowSelector(true)} 
                        className="w-full gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reconfigurar orçamento
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* No Setup Yet */}
                    <Card className="bg-muted/30 border-dashed">
                      <CardContent className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <Settings2 className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold">Configure seu orçamento inteligente</h3>
                          <p className="text-sm text-muted-foreground">
                            Responda algumas perguntas rápidas e criaremos um orçamento 
                            personalizado baseado na sua faixa de renda.
                          </p>
                        </div>
                        <Button onClick={() => setShowSelector(true)} className="gap-2">
                          Começar configuração
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Como funciona:</p>
                      <ul className="space-y-2">
                        <li className="flex gap-2">
                          <span className="text-primary">1.</span>
                          Informe sua faixa de renda (não armazenamos o valor exato)
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">2.</span>
                          Indicamos se tem filhos ou pets
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">3.</span>
                          Geramos um orçamento personalizado por categoria
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">4.</span>
                          Você pode ajustar a qualquer momento
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
