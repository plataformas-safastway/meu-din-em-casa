/**
 * Subcategory Budget Validation Utilities
 * 
 * Ensures consistency between category totals and subcategory sums
 */

import { toast } from "sonner";

export interface SubcategoryAmount {
  id: string;
  name: string;
  amount: number;
}

export interface CategorySubcategoryValidation {
  categoryId: string;
  categoryTotal: number;
  subcategories: SubcategoryAmount[];
}

export interface ValidationResult {
  isValid: boolean;
  difference: number;
  message: string;
  type: "ok" | "under" | "over";
}

/**
 * Validate that the sum of subcategories equals the category total
 */
export function validateSubcategorySum(
  categoryTotal: number,
  subcategories: SubcategoryAmount[]
): ValidationResult {
  const subcategorySum = subcategories.reduce((sum, s) => sum + s.amount, 0);
  const difference = subcategorySum - categoryTotal;
  
  // Allow small tolerance for rounding
  const tolerance = 1;

  if (Math.abs(difference) <= tolerance) {
    return {
      isValid: true,
      difference: 0,
      message: "Subcategorias consistentes com o total da categoria",
      type: "ok",
    };
  }

  if (difference > 0) {
    return {
      isValid: false,
      difference,
      message: `Soma das subcategorias excede o valor da categoria em ${formatCurrency(difference)}`,
      type: "over",
    };
  }

  return {
    isValid: false,
    difference: Math.abs(difference),
    message: `${formatCurrency(Math.abs(difference))} não distribuídos entre subcategorias`,
    type: "under",
  };
}

/**
 * Check if increasing a category is allowed given IF balance
 */
export function canIncreaseCategoryAmount(
  currentIfAmount: number,
  increaseAmount: number
): { allowed: boolean; message?: string } {
  if (currentIfAmount <= 0) {
    return {
      allowed: false,
      message: "Para aumentar despesas, reduza outras categorias ou aumente sua renda.",
    };
  }

  if (increaseAmount > currentIfAmount) {
    return {
      allowed: false,
      message: `Aumento máximo disponível: ${formatCurrency(currentIfAmount)}. Reduza outras categorias para liberar mais.`,
    };
  }

  return { allowed: true };
}

/**
 * Redistribute subcategory amounts when category total changes
 */
export function redistributeSubcategories(
  subcategories: SubcategoryAmount[],
  newCategoryTotal: number
): SubcategoryAmount[] {
  const currentTotal = subcategories.reduce((sum, s) => sum + s.amount, 0);
  
  if (currentTotal === 0) {
    // Distribute evenly if no existing distribution
    const amountEach = Math.floor(newCategoryTotal / subcategories.length);
    const remainder = newCategoryTotal - (amountEach * subcategories.length);
    
    return subcategories.map((s, index) => ({
      ...s,
      amount: amountEach + (index === 0 ? remainder : 0),
    }));
  }

  // Proportional redistribution
  const factor = newCategoryTotal / currentTotal;
  let distributed = 0;
  
  return subcategories.map((s, index) => {
    const isLast = index === subcategories.length - 1;
    const newAmount = isLast 
      ? newCategoryTotal - distributed 
      : Math.round(s.amount * factor);
    
    distributed += newAmount;
    return { ...s, amount: newAmount };
  });
}

/**
 * Calculate required IF adjustment for subcategory changes
 */
export function calculateIfAdjustment(
  categoryTotal: number,
  newSubcategoryTotal: number,
  currentIfPercentage: number,
  monthlyIncome: number
): {
  newCategoryTotal: number;
  newIfPercentage: number;
  requiresConfirmation: boolean;
  message?: string;
} {
  const difference = newSubcategoryTotal - categoryTotal;

  if (difference <= 0) {
    // Subcategories are within budget
    return {
      newCategoryTotal: categoryTotal,
      newIfPercentage: currentIfPercentage,
      requiresConfirmation: false,
    };
  }

  // Need to increase category (consumes IF)
  const differenceAsPercentage = (difference / monthlyIncome) * 100;
  const newIfPercentage = currentIfPercentage - differenceAsPercentage;

  if (newIfPercentage < 0) {
    return {
      newCategoryTotal: categoryTotal,
      newIfPercentage: currentIfPercentage,
      requiresConfirmation: true,
      message: "IF insuficiente. Reduza valores de subcategorias ou outras categorias.",
    };
  }

  return {
    newCategoryTotal: newSubcategoryTotal,
    newIfPercentage,
    requiresConfirmation: true,
    message: `Isso consumirá ${formatCurrency(difference)} do IF. Confirmar?`,
  };
}

/**
 * Format currency helper
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Show validation error toast
 */
export function showValidationError(message: string): void {
  toast.error(message, {
    duration: 5000,
    icon: "⚠️",
  });
}

/**
 * Show validation warning with action
 */
export function showValidationWarning(
  message: string,
  onConfirm?: () => void,
  onCancel?: () => void
): void {
  toast(message, {
    duration: 8000,
    action: onConfirm
      ? {
          label: "Confirmar",
          onClick: onConfirm,
        }
      : undefined,
    cancel: onCancel
      ? {
          label: "Cancelar",
          onClick: onCancel,
        }
      : undefined,
  });
}
