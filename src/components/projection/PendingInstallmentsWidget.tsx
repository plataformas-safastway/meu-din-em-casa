import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  AlertCircle, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Sparkles
} from "lucide-react";
import { 
  usePendingConfirmationInstallments, 
  useConfirmInstallmentGroup,
  useCancelInstallmentGroup,
  InstallmentGroup,
} from "@/hooks/useInstallments";
import { formatCurrency } from "@/lib/formatters";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface PendingInstallmentsWidgetProps {
  className?: string;
}

export function PendingInstallmentsWidget({ className }: PendingInstallmentsWidgetProps) {
  const { data: pendingGroups = [], isLoading } = usePendingConfirmationInstallments();
  const confirmGroup = useConfirmInstallmentGroup();
  const cancelGroup = useCancelInstallmentGroup();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTotal, setEditingTotal] = useState<{ [key: string]: number }>({});

  if (isLoading || pendingGroups.length === 0) {
    return null;
  }

  const handleConfirm = async (group: InstallmentGroup, customTotal?: number) => {
    try {
      await confirmGroup.mutateAsync({
        groupId: group.id,
        installmentsTotal: customTotal || group.installments_total,
      });
      toast.success("Parcelamento confirmado! 🎯", {
        description: `As ${customTotal || group.installments_total} parcelas foram projetadas.`,
      });
    } catch (error) {
      toast.error("Erro ao confirmar parcelamento");
    }
  };

  const handleReject = async (groupId: string) => {
    try {
      await cancelGroup.mutateAsync(groupId);
      toast.success("Parcelamento ignorado");
    } catch (error) {
      toast.error("Erro ao ignorar parcelamento");
    }
  };

  return (
    <Card className={cn("border-warning/30 bg-warning/5", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-warning" />
          Parcelamentos Detectados
          <Badge variant="secondary" className="ml-auto">
            {pendingGroups.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Identificamos compras parceladas nas suas importações. Confirme para projetar as parcelas futuras.
        </p>
        
        <AnimatePresence>
          {pendingGroups.slice(0, 5).map((group) => {
            const category = getCategoryById(group.category_id);
            const isExpanded = expandedId === group.id;
            const currentEditTotal = editingTotal[group.id] || group.installments_total;
            
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border rounded-xl p-3 bg-background"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {group.description || "Compra parcelada"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{category?.icon} {category?.name}</span>
                        <span>•</span>
                        <span>{group.installments_total}x de {formatCurrency(group.installment_value)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setExpandedId(isExpanded ? null : group.id)}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 pt-3 border-t space-y-3"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total da compra:</span>
                      <span className="font-medium">{formatCurrency(group.total_amount)}</span>
                    </div>
                    
                    {group.confidence_level !== 'HIGH' && (
                      <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium">Ajuste o número de parcelas se necessário</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => setEditingTotal(prev => ({
                                ...prev,
                                [group.id]: Math.max(2, currentEditTotal - 1)
                              }))}
                            >
                              -
                            </Button>
                            <span className="font-medium w-8 text-center">{currentEditTotal}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => setEditingTotal(prev => ({
                                ...prev,
                                [group.id]: Math.min(48, currentEditTotal + 1)
                              }))}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleReject(group.id)}
                        disabled={cancelGroup.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Não é parcelado
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConfirm(group, currentEditTotal !== group.installments_total ? currentEditTotal : undefined)}
                        disabled={confirmGroup.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Confirmar
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {pendingGroups.length > 5 && (
          <p className="text-xs text-center text-muted-foreground">
            +{pendingGroups.length - 5} parcelamentos pendentes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
