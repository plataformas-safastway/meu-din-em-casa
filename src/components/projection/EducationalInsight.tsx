import { Lightbulb, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface EducationalInsightProps {
  title: string;
  content: string;
  variant?: "info" | "warning" | "success";
  dismissable?: boolean;
  storageKey?: string;
  className?: string;
}

export function EducationalInsight({
  title,
  content,
  variant = "info",
  dismissable = true,
  storageKey,
  className,
}: EducationalInsightProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (!storageKey) return false;
    return localStorage.getItem(`education_dismissed_${storageKey}`) === "true";
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    if (storageKey) {
      localStorage.setItem(`education_dismissed_${storageKey}`, "true");
    }
  };

  if (isDismissed) return null;

  const variantStyles = {
    info: {
      bg: "bg-info/10",
      border: "border-info/20",
      icon: "text-info",
      iconBg: "bg-info/20",
    },
    warning: {
      bg: "bg-warning/10",
      border: "border-warning/20",
      icon: "text-warning",
      iconBg: "bg-warning/20",
    },
    success: {
      bg: "bg-success/10",
      border: "border-success/20",
      icon: "text-success",
      iconBg: "bg-success/20",
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={cn("overflow-hidden", className)}
      >
        <div className={cn(
          "rounded-xl p-3 border",
          styles.bg,
          styles.border
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              styles.iconBg
            )}>
              <Lightbulb className={cn("w-4 h-4", styles.icon)} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm mb-0.5">{title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {content}
              </p>
            </div>
            {dismissable && (
              <button
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-muted/50 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact inline version
interface InlineEducationProps {
  content: string;
  className?: string;
}

export function InlineEducation({ content, className }: InlineEducationProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-xs text-muted-foreground",
      className
    )}>
      <Info className="w-3 h-3 flex-shrink-0" />
      <span>{content}</span>
    </div>
  );
}
