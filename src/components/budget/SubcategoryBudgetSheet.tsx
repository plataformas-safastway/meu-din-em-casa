/**
 * SubcategoryBudgetSheet
 * 
 * Modal for managing subcategories within a budget category.
 * Features:
 * - CRUD operations for subcategories
 * - Real-time sum validation vs category total
 * - Integration with IF (zero-sum) logic
 * - Clear CTAs for resolution when sum exceeds category
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertTriangle,
  CheckCircle2,
  Info,
  Lock,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import type { BudgetCategoryItem, SubcategoryBudget } from "./BudgetMetaAdjustment";

interface SubcategoryBudgetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  category: BudgetCategoryItem | null;
  ifBalance: number;
  ifPercentage: number;
  monthlyIncome: number;
  onSubcategoriesChange: (categoryPrefixCode: string, subcategories: SubcategoryBudget[]) => void;
  onCategoryAmountChange: (categoryPrefixCode: string, newAmount: number) => boolean; // Returns false if blocked
}

interface EditingSubcategory {
  id: string;
  name: string;
  amount: number;
}

export function SubcategoryBudgetSheet({
  isOpen,
  onClose,
  category,
  ifBalance,
  ifPercentage,
  monthlyIncome,
  onSubcategoriesChange,
  onCategoryAmountChange,
}: SubcategoryBudgetSheetProps) {
  const [subcategories, setSubcategories] = useState<SubcategoryBudget[]>([]);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingSubcategory | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Initialize subcategories when category changes
  useEffect(() => {
    if (category?.subcategories) {
      setSubcategories([...category.subcategories]);
    } else {
      setSubcategories([]);
    }
  }, [category]);

  // Calculate totals and differences
  const calculations = useMemo(() => {
    const subcategorySum = subcategories.reduce((sum, s) => sum + s.amount, 0);
    const categoryTotal = category?.amount || 0;
    const difference = subcategorySum - categoryTotal;
    
    let status: "ok" | "under" | "over" = "ok";
    if (difference > 1) status = "over";
    else if (difference < -1) status = "under";
    
    return {
      subcategorySum,
      categoryTotal,
      difference,
      status,
      canIncreaseBySurplus: difference > 0 && ifBalance >= difference,
      maxIncrease: ifBalance,
    };
  }, [subcategories, category?.amount, ifBalance]);

  // Add new subcategory
  const handleAddSubcategory = useCallback(() => {
    if (!newName.trim() || !category) return;
    
    const amount = parseFloat(newAmount) || 0;
    const newSubcategory: SubcategoryBudget = {
      id: `temp_${Date.now()}`,
      name: newName.trim(),
      amount,
      percentage: category.amount > 0 ? (amount / category.amount) * 100 : 0,
    };
    
    const updated = [...subcategories, newSubcategory];
    setSubcategories(updated);
    setNewName("");
    setNewAmount("");
    setShowAddForm(false);
  }, [newName, newAmount, category, subcategories]);

  // Start editing a subcategory
  const handleStartEdit = useCallback((sub: SubcategoryBudget) => {
    setEditingId(sub.id);
    setEditingData({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
    });
  }, []);

  // Save edited subcategory
  const handleSaveEdit = useCallback(() => {
    if (!editingData) return;
    
    const updated = subcategories.map(s => 
      s.id === editingData.id 
        ? { 
            ...s, 
            name: editingData.name, 
            amount: editingData.amount,
            percentage: (category?.amount || 0) > 0 
              ? (editingData.amount / (category?.amount || 1)) * 100 
              : 0,
          }
        : s
    );
    
    setSubcategories(updated);
    setEditingId(null);
    setEditingData(null);
  }, [editingData, subcategories, category?.amount]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingData(null);
  }, []);

  // Delete subcategory
  const handleDeleteSubcategory = useCallback((id: string) => {
    setSubcategories(prev => prev.filter(s => s.id !== id));
  }, []);

  // Increase category to match subcategory sum (consumes IF)
  const handleIncreaseCategoryToMatch = useCallback(() => {
    if (!category || calculations.difference <= 0) return;
    
    const newAmount = calculations.subcategorySum;
    const success = onCategoryAmountChange(category.prefixCode, newAmount);
    
    if (success) {
      // Update local subcategory percentages based on new total
      const updatedSubcats = subcategories.map(s => ({
        ...s,
        percentage: (s.amount / newAmount) * 100,
      }));
      setSubcategories(updatedSubcats);
    }
  }, [category, calculations, onCategoryAmountChange, subcategories]);

  // Reduce category to match sum (adds to IF)
  const handleReduceCategoryToMatch = useCallback(() => {
    if (!category || calculations.difference >= 0) return;
    
    const newAmount = calculations.subcategorySum;
    onCategoryAmountChange(category.prefixCode, newAmount);
    
    // Update local subcategory percentages
    const updatedSubcats = subcategories.map(s => ({
      ...s,
      percentage: newAmount > 0 ? (s.amount / newAmount) * 100 : 0,
    }));
    setSubcategories(updatedSubcats);
  }, [category, calculations, onCategoryAmountChange, subcategories]);

  // Save and close
  const handleSave = useCallback(() => {
    if (!category) return;
    onSubcategoriesChange(category.prefixCode, subcategories);
    onClose();
  }, [category, subcategories, onSubcategoriesChange, onClose]);

  if (!category) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <span>Subcategorias</span>
            <span className="text-lg">📦</span>
          </SheetTitle>
          <SheetDescription>
            O OIK define as categorias. <strong>Você define as subcategorias.</strong>
          </SheetDescription>
        </SheetHeader>

        {/* Summary Card */}
        <Card className={cn(
          "mt-4 flex-shrink-0",
          calculations.status === "ok" && "border-success/50 bg-success/5",
          calculations.status === "under" && "border-warning/50 bg-warning/5",
          calculations.status === "over" && "border-destructive/50 bg-destructive/5",
        )}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categoria</p>
                <p className="font-bold text-lg">{category.prefixName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Limite atual</p>
                <p className="font-bold text-lg">{formatCurrency(calculations.categoryTotal)}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Soma subcats</p>
                <p className={cn(
                  "font-semibold",
                  calculations.status === "over" && "text-destructive"
                )}>
                  {formatCurrency(calculations.subcategorySum)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferença</p>
                <p className={cn(
                  "font-semibold flex items-center justify-center gap-1",
                  calculations.difference > 0 && "text-destructive",
                  calculations.difference < 0 && "text-warning",
                  calculations.difference === 0 && "text-success"
                )}>
                  {calculations.difference > 0 && <TrendingUp className="w-3 h-3" />}
                  {calculations.difference < 0 && <TrendingDown className="w-3 h-3" />}
                  {calculations.difference === 0 && <CheckCircle2 className="w-3 h-3" />}
                  {calculations.difference === 0 ? "—" : formatCurrency(Math.abs(calculations.difference))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">(+/-) IF disponível</p>
                <p className={cn(
                  "font-semibold",
                  ifPercentage <= 0 && "text-destructive"
                )}>
                  {formatCurrency(ifBalance)}
                </p>
              </div>
            </div>

            {/* Progress bar showing usage */}
            <div>
              <Progress 
                value={Math.min(100, (calculations.subcategorySum / Math.max(1, calculations.categoryTotal)) * 100)}
                className={cn(
                  "h-2",
                  calculations.status === "over" && "[&>div]:bg-destructive"
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Alerts */}
        <AnimatePresence mode="wait">
          {calculations.status === "ok" && subcategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 flex-shrink-0"
            >
              <Alert className="border-success/50 bg-success/10">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <AlertDescription className="text-sm text-success">
                  Tudo certo! A soma das subcategorias está dentro do limite da categoria.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {calculations.status === "under" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 space-y-2 flex-shrink-0"
            >
              <Alert className="border-warning/50 bg-warning/10">
                <Info className="w-4 h-4 text-warning" />
                <AlertDescription className="text-sm">
                  Sobra dentro da categoria: <strong>{formatCurrency(Math.abs(calculations.difference))}</strong>
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-warning border-warning/50"
                onClick={handleReduceCategoryToMatch}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Ajustar categoria para igualar ({formatCurrency(calculations.subcategorySum)}) — devolve ao IF
              </Button>
            </motion.div>
          )}

          {calculations.status === "over" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 space-y-2 flex-shrink-0"
            >
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  As subcategorias ultrapassam o limite em <strong>{formatCurrency(calculations.difference)}</strong>
                </AlertDescription>
              </Alert>
              
              {calculations.canIncreaseBySurplus ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/50"
                  onClick={handleIncreaseCategoryToMatch}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Aumentar categoria em {formatCurrency(calculations.difference)} (consome IF)
                </Button>
              ) : (
                <Alert className="border-destructive/30 bg-destructive/5">
                  <Lock className="w-4 h-4 text-destructive" />
                  <AlertDescription className="text-xs text-destructive">
                    Sem saldo no IF para aumentar esta categoria. 
                    Reduza outras categorias/subcategorias ou aumente sua renda.
                  </AlertDescription>
                </Alert>
              )}
              
              <p className="text-xs text-muted-foreground text-center">
                ou reduza os valores das subcategorias abaixo
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subcategory List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pb-4">
          <AnimatePresence>
            {subcategories.map((sub, index) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-3">
                    {editingId === sub.id ? (
                      // Edit mode
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={editingData?.name || ""}
                            onChange={(e) => setEditingData(prev => 
                              prev ? { ...prev, name: e.target.value } : null
                            )}
                            placeholder="Nome"
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={editingData?.amount || ""}
                            onChange={(e) => setEditingData(prev => 
                              prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null
                            )}
                            placeholder="Valor"
                            className="w-28"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sub.percentage.toFixed(1)}% da categoria
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{formatCurrency(sub.amount)}</p>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => handleStartEdit(sub)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSubcategory(sub.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {subcategories.length === 0 && !showAddForm && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma subcategoria definida.</p>
              <p className="text-xs mt-1">Adicione subcategorias para detalhar seus gastos.</p>
            </div>
          )}

          {/* Add Form */}
          <AnimatePresence>
            {showAddForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-dashed border-primary/50">
                  <CardContent className="p-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-subcat-name">Nome da subcategoria</Label>
                      <Input
                        id="new-subcat-name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: Aluguel, Condomínio..."
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-subcat-amount">Valor planejado</Label>
                      <Input
                        id="new-subcat-amount"
                        type="number"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewName("");
                          setNewAmount("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={handleAddSubcategory}
                        disabled={!newName.trim()}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar subcategoria
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t pt-4 space-y-2">
          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={calculations.status === "over"}
          >
            {calculations.status === "over" 
              ? "Resolva a inconsistência para salvar"
              : "Salvar subcategorias"
            }
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {subcategories.length} subcategorias · {formatCurrency(calculations.subcategorySum)} planejados
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
