import { useState } from "react";
import { Edit2, Trash2, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultCategories, getCategoryById, getSubcategoryById } from "@/data/categories";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ClassificationSelector, TransactionClassification } from "./ClassificationSelector";

export interface TransactionReviewItemProps {
  transaction: {
    id: string;
    date: string;
    original_date?: string | null;
    amount: number;
    type: 'income' | 'expense';
    direction?: 'credit' | 'debit' | null;
    classification?: TransactionClassification | null;
    description: string | null;
    category_id: string;
    subcategory_id: string | null;
    is_duplicate: boolean;
    needs_review: boolean;
  };
  isSelected: boolean;
  categoryOverride?: { categoryId: string; subcategoryId: string | null };
  classificationOverride?: TransactionClassification;
  descriptionOverride?: string;
  onToggleSelect: () => void;
  onCategoryChange: (categoryId: string, subcategoryId: string | null) => void;
  onClassificationChange?: (classification: TransactionClassification) => void;
  onDescriptionChange: (description: string) => void;
  onDelete: () => void;
}

export function TransactionReviewItem({
  transaction,
  isSelected,
  categoryOverride,
  classificationOverride,
  descriptionOverride,
  onToggleSelect,
  onCategoryChange,
  onClassificationChange,
  onDescriptionChange,
  onDelete,
}: TransactionReviewItemProps) {
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingClassification, setIsEditingClassification] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState(
    descriptionOverride ?? transaction.description ?? ""
  );
  
  // Effective values (override or original)
  const effectiveCategoryId = categoryOverride?.categoryId ?? transaction.category_id;
  const effectiveSubcategoryId = categoryOverride?.subcategoryId ?? transaction.subcategory_id;
  const effectiveDescription = descriptionOverride ?? transaction.description ?? "";
  const effectiveClassification: TransactionClassification = 
    classificationOverride ?? 
    (transaction.classification as TransactionClassification) ?? 
    (transaction.type === 'income' ? 'income' : 'expense');
  const effectiveDirection: 'credit' | 'debit' = 
    transaction.direction ?? (transaction.amount >= 0 ? 'credit' : 'debit');
  
  const category = getCategoryById(effectiveCategoryId);
  const subcategory = effectiveSubcategoryId 
    ? getSubcategoryById(effectiveCategoryId, effectiveSubcategoryId) 
    : null;
  
  const isCredit = effectiveDirection === 'credit';
  const isExpense = effectiveClassification === 'expense' || effectiveDirection === 'debit';
  
  // Get subcategories for the selected category
  const subcategories = category?.subcategories ?? [];
  
  const handleCategorySelect = (catId: string) => {
    // When category changes, reset subcategory
    onCategoryChange(catId, null);
  };
  
  const handleSubcategorySelect = (subId: string | null) => {
    onCategoryChange(effectiveCategoryId, subId === "__none__" ? null : subId);
    setIsEditingCategory(false);
  };
  
  const handleDescriptionSave = () => {
    onDescriptionChange(tempDescription.trim());
    setIsEditingDescription(false);
  };
  
  const handleDescriptionCancel = () => {
    setTempDescription(effectiveDescription);
    setIsEditingDescription(false);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-xl border transition-all",
        isSelected 
          ? "bg-primary/5 border-primary/30" 
          : "bg-card border-border/30",
        transaction.is_duplicate && "border-warning/50",
        transaction.needs_review && !transaction.is_duplicate && "border-warning/30"
      )}
    >
      {/* Row 1: Checkbox, Icon, Description, Amount, Delete */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="mt-1"
        />

        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: `${category?.color}20` }}
        >
          {category?.icon || "📦"}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Description - Editable */}
          {isEditingDescription ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                className="h-8 text-sm"
                placeholder="Descrição do lançamento"
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0 text-success"
                onClick={handleDescriptionSave}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0 text-muted-foreground"
                onClick={handleDescriptionCancel}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempDescription(effectiveDescription);
                setIsEditingDescription(true);
              }}
              className="flex items-center gap-1 text-left w-full group"
            >
              <p className="font-medium text-foreground text-sm truncate">
                {effectiveDescription || category?.name || 'Transação'}
              </p>
              <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          
          {/* Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{formatDate(transaction.date)}</span>
            {transaction.original_date && transaction.original_date !== transaction.date && (
              <span className="text-primary">
                (compra: {formatDate(transaction.original_date)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "font-semibold text-sm whitespace-nowrap",
            isExpense ? "text-destructive" : "text-success"
          )}>
            {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Row 2: Classification Selector */}
      {onClassificationChange && (
        <div className="ml-[44px]">
          {isEditingClassification ? (
            <div className="space-y-2">
              <ClassificationSelector
                value={effectiveClassification}
                onChange={(classification) => {
                  onClassificationChange(classification);
                  setIsEditingClassification(false);
                }}
                direction={effectiveDirection}
                compact
              />
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs"
                onClick={() => setIsEditingClassification(false)}
              >
                <X className="w-3 h-3 mr-1" />
                Fechar
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingClassification(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className={cn(
                "px-2 py-0.5 rounded-full",
                effectiveClassification === 'income' && "bg-success/10 text-success",
                effectiveClassification === 'expense' && "bg-destructive/10 text-destructive",
                effectiveClassification === 'reimbursement' && "bg-warning/10 text-warning",
                effectiveClassification === 'transfer' && "bg-info/10 text-info",
                effectiveClassification === 'adjustment' && "bg-muted text-muted-foreground"
              )}>
                {effectiveClassification === 'income' && '↑ Receita'}
                {effectiveClassification === 'expense' && '↓ Despesa'}
                {effectiveClassification === 'reimbursement' && '↺ Reembolso'}
                {effectiveClassification === 'transfer' && '↔ Transferência'}
                {effectiveClassification === 'adjustment' && '⚙ Ajuste'}
              </span>
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Row 3: Category + Subcategory Selection */}
      <div className="flex items-center gap-2 ml-[44px]">
        {isEditingCategory ? (
          <>
            {/* Category Dropdown - show ALL categories, not filtered by type */}
            <Select
              value={effectiveCategoryId}
              onValueChange={handleCategorySelect}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {defaultCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Subcategory Dropdown - only enabled after category selected */}
            <Select
              value={effectiveSubcategoryId ?? "__none__"}
              onValueChange={handleSubcategorySelect}
              disabled={subcategories.length === 0}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Subcategoria" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="__none__">
                  (Sem subcategoria)
                </SelectItem>
                {subcategories.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={() => setIsEditingCategory(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <button
            onClick={() => setIsEditingCategory(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span 
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${category?.color}20` }}
            >
              {category?.icon} {category?.name}
              {subcategory && ` • ${subcategory.name}`}
            </span>
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {/* Row 3: Status badges */}
      {(transaction.is_duplicate || (transaction.needs_review && !transaction.is_duplicate)) && (
        <div className="flex gap-1 ml-[44px]">
          {transaction.is_duplicate && (
            <span className="text-xs text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Possível duplicata
            </span>
          )}
          {transaction.needs_review && !transaction.is_duplicate && (
            <span className="text-xs text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Revisar categoria
            </span>
          )}
        </div>
      )}
    </div>
  );
}
