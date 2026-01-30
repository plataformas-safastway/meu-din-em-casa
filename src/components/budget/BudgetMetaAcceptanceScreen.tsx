/**
 * Budget Meta Acceptance Screen
 * 
 * First login screen where user can:
 * - Accept the generated Budget Meta as-is
 * - Choose to adjust it before starting
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Check, 
  Edit3, 
  Sparkles, 
  ArrowRight,
  Target,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { getCategoryById } from "@/data/categories";
import type { BudgetCategoryItem } from "./BudgetMetaAdjustment";

interface BudgetMetaAcceptanceScreenProps {
  items: BudgetCategoryItem[];
  monthlyIncome: number;
  budgetModeName: string;
  onAccept: () => void;
  onAdjust: () => void;
  isLoading?: boolean;
}

export function BudgetMetaAcceptanceScreen({
  items,
  monthlyIncome,
  budgetModeName,
  onAccept,
  onAdjust,
  isLoading = false,
}: BudgetMetaAcceptanceScreenProps) {
  const [selectedOption, setSelectedOption] = useState<"accept" | "adjust" | null>(null);

  // Find IF item
  const ifItem = items.find(b => b.prefixCode === 'IF');

  // Get top expense categories (excluding IF)
  const topCategories = items
    .filter(b => b.prefixCode !== 'IF')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <header className="p-6 pt-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Seu Orçamento Meta</h1>
          <p className="text-muted-foreground">
            Baseado no seu perfil <Badge variant="secondary">{budgetModeName}</Badge>
          </p>
        </motion.div>
      </header>

      {/* Summary Card */}
      <main className="flex-1 px-4 space-y-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Renda mensal</p>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyIncome)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">(+/-) IF</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(ifItem?.amount || 0)}
                  </p>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  PRINCIPAIS CATEGORIAS
                </p>
                {topCategories.map((item, index) => {
                  const category = getCategoryById(item.categoryId);
                  return (
                    <motion.div
                      key={item.prefixCode}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{category?.icon || '📦'}</span>
                        <span className="text-sm">{item.prefixName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({item.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-muted/30">
            <CardContent className="p-3 flex gap-2">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                O <strong>(+/-) IF</strong> (Independência Financeira) é o coração do seu orçamento. 
                Ele representa o que sobra para investir no seu futuro após cobrir despesas essenciais.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Options */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <p className="text-sm font-medium text-center">O que você deseja fazer?</p>

          {/* Option A: Accept */}
          <Card 
            className={cn(
              "cursor-pointer transition-all",
              selectedOption === "accept" 
                ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                : "hover:border-muted-foreground/30"
            )}
            onClick={() => setSelectedOption("accept")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                selectedOption === "accept" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              )}>
                <Check className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Aceitar como está</p>
                <p className="text-sm text-muted-foreground">
                  Começar a usar o orçamento sugerido agora
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Option B: Adjust */}
          <Card 
            className={cn(
              "cursor-pointer transition-all",
              selectedOption === "adjust" 
                ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                : "hover:border-muted-foreground/30"
            )}
            onClick={() => setSelectedOption("adjust")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                selectedOption === "adjust" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              )}>
                <Edit3 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Ajustar primeiro</p>
                <p className="text-sm text-muted-foreground">
                  Personalizar valores antes de começar
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button 
          className="w-full h-12 gap-2" 
          size="lg"
          disabled={!selectedOption || isLoading}
          onClick={() => {
            if (selectedOption === "accept") {
              onAccept();
            } else if (selectedOption === "adjust") {
              onAdjust();
            }
          }}
        >
          {isLoading ? (
            <span className="animate-pulse">Carregando...</span>
          ) : (
            <>
              Continuar
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
