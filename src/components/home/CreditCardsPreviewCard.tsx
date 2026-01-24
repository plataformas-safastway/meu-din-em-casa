import { CreditCard, ChevronRight, Sparkles, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardPreview, BestCardSuggestion } from "@/hooks/useHomeSummary";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CreditCardsPreviewCardProps {
  cards: CardPreview[];
  hasMoreCards: boolean;
  totalCards: number;
  totalBill: number;
  bestCardSuggestion: BestCardSuggestion | null;
  onLearnMore?: () => void;
  onAddCard?: () => void;
}

export function CreditCardsPreviewCard({
  cards,
  hasMoreCards,
  totalCards,
  totalBill,
  bestCardSuggestion,
  onLearnMore,
  onAddCard,
}: CreditCardsPreviewCardProps) {
  if (cards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Nenhum cartão cadastrado</p>
                  <p className="text-xs text-white/70">Adicione seus cartões para controlar faturas</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={onAddCard}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <CreditCard className="w-5 h-5" />
              </motion.div>
              <div>
                <p className="text-xs text-white/70">Fatura Total Projetada</p>
                <motion.p 
                  key={totalBill}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-bold"
                >
                  {formatCurrency(totalBill)}
                </motion.p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70">{totalCards} cartão{totalCards !== 1 ? "ões" : ""}</p>
            </div>
          </div>

          {/* Cards Preview */}
          <div className="space-y-3">
            {cards.map((card, index) => (
              <motion.div 
                key={card.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className="bg-white/10 rounded-xl p-3 space-y-2 transition-colors hover:bg-white/15"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate max-w-[150px]">{card.label}</span>
                  <span className="text-sm font-bold">{formatCurrency(card.projectedBill)}</span>
                </div>
                {card.limit && (
                  <div className="space-y-1">
                    <Progress 
                      value={card.usedPercent} 
                      className={cn(
                        "h-1.5 bg-white/20",
                        card.usedPercent > 80 && "[&>div]:bg-red-400",
                        card.usedPercent > 50 && card.usedPercent <= 80 && "[&>div]:bg-yellow-400",
                        card.usedPercent <= 50 && "[&>div]:bg-green-400"
                      )} 
                    />
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>{card.usedPercent.toFixed(0)}% do limite</span>
                      <span>Vence: {new Date(card.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Best Card Suggestion */}
          {bestCardSuggestion && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-3 border border-amber-500/30"
            >
              <div className="flex items-start gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                >
                  <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                </motion.div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-300">{bestCardSuggestion.title}</p>
                  <p className="text-sm font-medium">{bestCardSuggestion.recommendation}</p>
                  <p className="text-xs text-white/70">{bestCardSuggestion.reason}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Learn More Button */}
          {hasMoreCards && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-white/80 hover:text-white hover:bg-white/10"
              onClick={onLearnMore}
            >
              Ver todos os {totalCards} cartões
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}