import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, X, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { getCategoryById } from "@/data/categories";

interface SoftAlertProps {
  categoryId: string;
  percentage: number;
  spent: number;
  budgeted: number;
  variant?: "warning" | "exceeded";
  onDismiss?: () => void;
  dismissKey?: string;
}

export function BudgetSoftAlert({
  categoryId,
  percentage,
  spent,
  budgeted,
  variant = "warning",
  onDismiss,
  dismissKey,
}: SoftAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isNotificationsOff, setIsNotificationsOff] = useState(() => {
    const key = `budget_notifications_${categoryId}`;
    return localStorage.getItem(key) === "off";
  });

  const category = getCategoryById(categoryId);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (dismissKey) {
      sessionStorage.setItem(`budget_alert_${dismissKey}`, "dismissed");
    }
    onDismiss?.();
  };

  const toggleNotifications = () => {
    const key = `budget_notifications_${categoryId}`;
    if (isNotificationsOff) {
      localStorage.removeItem(key);
      setIsNotificationsOff(false);
    } else {
      localStorage.setItem(key, "off");
      setIsNotificationsOff(true);
    }
  };

  // Check if already dismissed this session
  useEffect(() => {
    if (dismissKey && sessionStorage.getItem(`budget_alert_${dismissKey}`) === "dismissed") {
      setIsDismissed(true);
    }
  }, [dismissKey]);

  if (isDismissed || isNotificationsOff) return null;

  const isExceeded = variant === "exceeded";
  const remaining = budgeted - spent;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        className={cn(
          "rounded-xl p-3 border mb-3",
          isExceeded 
            ? "bg-destructive/10 border-destructive/20" 
            : "bg-warning/10 border-warning/20"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
            isExceeded ? "bg-destructive/20" : "bg-warning/20"
          )}>
            {isExceeded ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-warning" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{category?.icon || "📦"}</span>
              <h4 className="font-medium text-sm">
                {category?.name || categoryId}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isExceeded ? (
                <>
                  Vocês já gastaram <strong className="text-destructive">{formatCurrency(spent)}</strong> de{" "}
                  <strong>{formatCurrency(budgeted)}</strong> nesta categoria.
                  <span className="block mt-1 text-muted-foreground/80">
                    Querem revisar os lançamentos ou ajustar o orçamento?
                  </span>
                </>
              ) : (
                <>
                  Vocês já usaram <strong>{percentage.toFixed(0)}%</strong> do orçamento desta categoria.{" "}
                  {remaining > 0 && (
                    <>
                      Restam <strong className="text-success">{formatCurrency(remaining)}</strong> para este mês.
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded hover:bg-muted/50 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={toggleNotifications}
              className="p-1.5 rounded hover:bg-muted/50 transition-colors"
              aria-label="Silenciar alertas desta categoria"
            >
              <BellOff className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Minimal inline alert for dashboard
interface InlineBudgetAlertProps {
  message: string;
  variant?: "warning" | "info";
}

export function InlineBudgetAlert({ message, variant = "warning" }: InlineBudgetAlertProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-xs p-2 rounded-lg",
      variant === "warning" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"
    )}>
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
