import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, HelpCircle, Home, Upload, Brain, ArrowLeftRight, PieChart, BarChart3, Target, TrendingUp, Calendar, AlertCircle, Heart, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEducation, EducationTip } from "@/hooks/useEducation";
import { cn } from "@/lib/utils";

// Icon map for dynamic icon rendering
const iconMap: Record<string, LucideIcon> = {
  Home,
  Upload,
  Brain,
  ArrowLeftRight,
  PieChart,
  BarChart3,
  Target,
  TrendingUp,
  Calendar,
  AlertCircle,
  Heart,
  Lightbulb,
  HelpCircle,
};
interface ContextualTipProps {
  trigger: string;
  className?: string;
  variant?: "inline" | "floating" | "banner";
  onDismiss?: () => void;
}

export function ContextualTip({ 
  trigger, 
  className,
  variant = "inline",
  onDismiss 
}: ContextualTipProps) {
  const { getContextualTip, markTipShown, dismissTip, areTipsEnabled } = useEducation();
  const [tip, setTip] = useState<EducationTip | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!areTipsEnabled) return;

    const contextualTip = getContextualTip(trigger);
    if (contextualTip) {
      setTip(contextualTip);
      // Mark as shown after a brief delay
      const timer = setTimeout(() => {
        setIsVisible(true);
        markTipShown.mutate(contextualTip.tipKey);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [trigger, areTipsEnabled]);

  const handleDismiss = () => {
    if (tip) {
      dismissTip.mutate(tip.tipKey);
      setIsVisible(false);
      onDismiss?.();
    }
  };

  if (!tip || !isVisible) return null;

  // Get dynamic icon
  const IconComponent = tip.icon && iconMap[tip.icon] 
    ? iconMap[tip.icon] 
    : Lightbulb;

  if (variant === "floating") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className={cn(
            "fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto",
            className
          )}
        >
          <div className="bg-card border border-primary/20 rounded-2xl shadow-xl p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <IconComponent className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{tip.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tip.content}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors self-start"
                aria-label="Fechar dica"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="w-full mt-3 text-primary hover:text-primary"
            >
              Entendi
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (variant === "banner") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={cn("overflow-hidden", className)}
        >
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <IconComponent className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-0.5">{tip.title}</h4>
                <p className="text-xs text-muted-foreground">{tip.content}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-muted/50 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Inline variant (default)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "flex items-center gap-2 bg-info/10 text-info px-3 py-2 rounded-lg",
          className
        )}
      >
        <Lightbulb className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs flex-1">{tip.content}</p>
        <button
          onClick={handleDismiss}
          className="text-xs font-medium hover:underline"
        >
          Entendi
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// Simple help button that shows tips for a module
interface HelpButtonProps {
  module: string;
  className?: string;
}

export function ModuleHelpButton({ module, className }: HelpButtonProps) {
  const { getTipsByModule } = useEducation();
  const [isOpen, setIsOpen] = useState(false);

  const tips = getTipsByModule(module);

  if (tips.length === 0) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", className)}
        onClick={() => setIsOpen(true)}
        aria-label="Ajuda"
      >
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[70vh] overflow-auto"
            >
              <div className="sticky top-0 bg-card px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold">Dicas úteis</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 space-y-3">
                {tips.map((tip) => {
                  const IconComponent = tip.icon && iconMap[tip.icon]
                    ? iconMap[tip.icon]
                    : Lightbulb;
                  
                  return (
                    <div
                      key={tip.id}
                      className="flex gap-3 p-3 bg-muted/30 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {tip.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
