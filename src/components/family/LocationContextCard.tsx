import { MapPin, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocationContext } from "@/hooks/useLocationContext";
import { formatCurrency } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";

export function LocationContextCard() {
  const { isEnabled, currentAlert, dismissAlert } = useLocationContext();

  if (!isEnabled) {
    return null;
  }

  return (
    <AnimatePresence>
      {currentAlert && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    Você está em {currentAlert.placeName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Categoria: {currentAlert.category}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={dismissAlert}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-background/50">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>
                    Restam{" "}
                    <strong className="text-primary">
                      {formatCurrency(currentAlert.budgetRemaining)}
                    </strong>{" "}
                    no orçamento
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      currentAlert.percentage >= 100
                        ? "bg-destructive"
                        : currentAlert.percentage >= 80
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(currentAlert.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentAlert.percentage.toFixed(0)}% do orçamento de{" "}
                  {formatCurrency(currentAlert.budgetTotal)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function LocationContextBanner() {
  const { isEnabled, currentAlert, dismissAlert } = useLocationContext();

  if (!isEnabled || !currentAlert) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-primary/10 border-b border-primary/20"
    >
      <div className="container px-4 py-3 flex items-center gap-3">
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm flex-1">
          <strong>{currentAlert.placeName}</strong>: Restam{" "}
          <strong>{formatCurrency(currentAlert.budgetRemaining)}</strong> em{" "}
          {currentAlert.category}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={dismissAlert}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
