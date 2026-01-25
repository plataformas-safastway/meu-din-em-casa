import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Circle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";

interface OnboardingChecklistProps {
  onNavigate?: (tab: string) => void;
}

export function OnboardingChecklist({ onNavigate }: OnboardingChecklistProps) {
  const { state, isLoading } = useOnboarding();
  const [isExpanded, setIsExpanded] = useState(true);

  // Don't show if all steps completed or still loading
  if (isLoading) return null;
  if (state.progressPercent >= 100) return null;

  const completedSteps = state.steps.filter((s) => s.completed).length;
  const totalSteps = state.steps.length;

  // Action handlers for each step - map to internal tab names
  const handleStepAction = (step: OnboardingStep) => {
    if (!onNavigate) return;
    
    switch (step.id) {
      case "bank_account":
        onNavigate("banks");
        break;
      case "import":
        onNavigate("import");
        break;
      case "budget":
        onNavigate("goals"); // budgets page uses "goals" tab internally
        break;
      case "goal":
        onNavigate("objectives"); // goals page uses "objectives" tab internally
        break;
      case "family_invite":
        onNavigate("family");
        break;
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Primeiros passos</CardTitle>
              <p className="text-xs text-muted-foreground">
                {completedSteps} de {totalSteps} concluídos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-lg font-bold text-primary">
                {state.progressPercent}%
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <Progress value={state.progressPercent} className="h-2 mt-3" />
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-4">
              <div className="space-y-2">
                {state.steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      step.completed
                        ? "bg-success/10"
                        : "bg-muted/30 hover:bg-muted/50 cursor-pointer"
                    )}
                    onClick={() => !step.completed && handleStepAction(step)}
                  >
                    {/* Status icon */}
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                        step.completed
                          ? "bg-success text-success-foreground"
                          : "border-2 border-muted-foreground/30"
                      )}
                    >
                      {step.completed ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Circle className="w-3 h-3 text-muted-foreground/30" />
                      )}
                    </div>

                    {/* Step info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          step.completed && "text-success"
                        )}
                      >
                        {step.label}
                        {step.optional && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (opcional)
                          </span>
                        )}
                      </p>
                      {!step.completed && (
                        <p className="text-xs text-muted-foreground truncate">
                          {step.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow for incomplete */}
                    {!step.completed && (
                      <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
