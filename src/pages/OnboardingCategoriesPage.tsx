import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  Loader2, 
  AlertCircle,
  ChevronDown,
  X,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { defaultCategories, getCategoryById } from "@/data/categories";
import { useSaveCategoryMappings, useCreateBudgetsFromMappings } from "@/hooks/useCategoryMappings";
import { parseExcelFile } from "@/lib/excelParser";

interface OnboardingCategoriesPageProps {
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

interface ImportedCategory {
  id: string;
  importedName: string;
  mappedCategoryId: string;
  mappedSubcategoryId: string | null;
  limit: number | null;
  confidence: "high" | "medium" | "low";
}

type Step = "upload" | "mapping";

// Simple fuzzy matching for category suggestions
function suggestCategory(importedName: string): { categoryId: string; subcategoryId: string | null; confidence: "high" | "medium" | "low" } {
  const normalized = importedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Check exact or near-exact matches first
  for (const category of defaultCategories) {
    const catNorm = category.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (catNorm === normalized || normalized.includes(catNorm) || catNorm.includes(normalized)) {
      return { categoryId: category.id, subcategoryId: null, confidence: "high" };
    }
    
    for (const sub of category.subcategories) {
      const subNorm = sub.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      if (subNorm === normalized || normalized.includes(subNorm) || subNorm.includes(normalized)) {
        return { categoryId: category.id, subcategoryId: sub.id, confidence: "high" };
      }
    }
  }
  
  // Keyword-based matching
  const keywords: Record<string, { categoryId: string; subcategoryId?: string }> = {
    "agua": { categoryId: "casa", subcategoryId: "casa-agua" },
    "luz": { categoryId: "casa", subcategoryId: "casa-energia-eletrica" },
    "energia": { categoryId: "casa", subcategoryId: "casa-energia-eletrica" },
    "internet": { categoryId: "casa", subcategoryId: "casa-internet---tv---streamings" },
    "condominio": { categoryId: "casa", subcategoryId: "casa-condominio" },
    "aluguel": { categoryId: "rendas", subcategoryId: "rendas-receita-bruta-aluguel" },
    "salario": { categoryId: "rendas", subcategoryId: "rendas-remuneracao-pro-labore" },
    "mercado": { categoryId: "alimentacao", subcategoryId: "alimentacao-supermercado" },
    "supermercado": { categoryId: "alimentacao", subcategoryId: "alimentacao-supermercado" },
    "restaurante": { categoryId: "lazer", subcategoryId: "lazer-restaurantes" },
    "combustivel": { categoryId: "transporte", subcategoryId: "transporte-combustivel" },
    "gasolina": { categoryId: "transporte", subcategoryId: "transporte-combustivel" },
    "uber": { categoryId: "transporte", subcategoryId: "transporte-taxi-uber" },
    "escola": { categoryId: "filhos", subcategoryId: "filhos-escola" },
    "saude": { categoryId: "vida-saude" },
    "medico": { categoryId: "vida-saude", subcategoryId: "vida-saude-medico" },
    "farmacia": { categoryId: "vida-saude", subcategoryId: "vida-saude-medicamentos" },
    "roupa": { categoryId: "roupa-estetica", subcategoryId: "roupa-estetica-roupas" },
    "viagem": { categoryId: "lazer", subcategoryId: "lazer-viagem-nacional" },
    "cinema": { categoryId: "lazer", subcategoryId: "lazer-cinema-teatro" },
    "pet": { categoryId: "pet" },
    "veterinario": { categoryId: "pet", subcategoryId: "pet-medico-veterinario" },
  };
  
  for (const [keyword, mapping] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) {
      return { 
        categoryId: mapping.categoryId, 
        subcategoryId: mapping.subcategoryId || null, 
        confidence: "medium" 
      };
    }
  }
  
  // Default to "diversos" with low confidence
  return { categoryId: "diversos", subcategoryId: null, confidence: "low" };
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  
  if (typeof value === "number") return value;
  
  const str = String(value)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  
  const num = parseFloat(str);
  return isNaN(num) ? null : Math.abs(num);
}

export function OnboardingCategoriesPage({ onComplete, onSkip, onBack }: OnboardingCategoriesPageProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importedCategories, setImportedCategories] = useState<ImportedCategory[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const saveMappings = useSaveCategoryMappings();
  const createBudgets = useCreateBudgetsFromMappings();

  const expenseCategories = defaultCategories.filter(c => c.type === "expense");

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!['xls', 'xlsx', 'csv'].includes(extension || '')) {
      toast.error("Formato não suportado", {
        description: "Use arquivos XLS, XLSX ou CSV"
      });
      return;
    }

    setFile(selectedFile);
  }, []);

  const processFile = useCallback(async () => {
    if (!file) return;
    
    setLoading(true);
    
    try {
      // Use secure ExcelJS parser
      const result = await parseExcelFile(file);
      const { headers, rows } = result;
      
      if (rows.length === 0) {
        toast.error("Arquivo vazio ou inválido");
        setLoading(false);
        return;
      }
      
      // Try to identify columns
      const headerRowLower = headers.map(h => h.toLowerCase());
      
      let categoryCol = headerRowLower.findIndex(h => 
        h.includes("categoria") || h.includes("subcategoria") || h.includes("nome")
      );
      let limitCol = headerRowLower.findIndex(h => 
        h.includes("limite") || h.includes("meta") || h.includes("valor") || h.includes("orcamento") || h.includes("orçamento")
      );
      
      // If no header found, use first column
      if (categoryCol < 0) categoryCol = 0;
      if (limitCol < 0) limitCol = 1;
      
      const categoryHeader = headers[categoryCol];
      const limitHeader = headers[limitCol];
      
      const categories: ImportedCategory[] = [];
      
      rows.forEach((row, i) => {
        const categoryValue = row[categoryHeader];
        if (!categoryValue) return;
        
        const importedName = String(categoryValue).trim();
        if (!importedName) return;
        
        const suggestion = suggestCategory(importedName);
        const limit = parseNumber(row[limitHeader]);
        
        categories.push({
          id: `cat-${i}`,
          importedName,
          mappedCategoryId: suggestion.categoryId,
          mappedSubcategoryId: suggestion.subcategoryId,
          limit,
          confidence: suggestion.confidence,
        });
      });
      
      if (categories.length === 0) {
        toast.error("Nenhuma categoria encontrada no arquivo");
        setLoading(false);
        return;
      }
      
      setImportedCategories(categories);
      setStep("mapping");
      toast.success(`${categories.length} categorias encontradas!`);
      
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Erro ao processar arquivo", {
        description: "Verifique o formato do arquivo e tente novamente."
      });
    } finally {
      setLoading(false);
    }
  }, [file]);

  const updateMapping = useCallback((id: string, field: "mappedCategoryId" | "mappedSubcategoryId" | "limit", value: any) => {
    setImportedCategories(prev => prev.map(cat => {
      if (cat.id !== id) return cat;
      
      if (field === "mappedCategoryId") {
        return { ...cat, mappedCategoryId: value, mappedSubcategoryId: null };
      }
      
      return { ...cat, [field]: value };
    }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Save mappings
      await saveMappings.mutateAsync(
        importedCategories.map(cat => ({
          imported_name: cat.importedName,
          mapped_category_id: cat.mappedCategoryId,
          mapped_subcategory_id: cat.mappedSubcategoryId,
          imported_limit: cat.limit,
        }))
      );
      
      // Create budgets from limits
      const budgetsToCreate = importedCategories
        .filter(cat => cat.limit && cat.limit > 0)
        .map(cat => ({
          category_id: cat.mappedCategoryId,
          subcategory_id: cat.mappedSubcategoryId,
          limit: cat.limit!,
        }));
      
      if (budgetsToCreate.length > 0) {
        await createBudgets.mutateAsync(budgetsToCreate);
        toast.success(`${budgetsToCreate.length} metas de orçamento criadas!`);
      }
      
      onComplete();
      
    } catch (error) {
      console.error("Error saving mappings:", error);
      toast.error("Erro ao salvar mapeamentos", {
        description: "Tente novamente."
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high": return "text-success";
      case "medium": return "text-warning";
      case "low": return "text-destructive";
    }
  };

  const getConfidenceLabel = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high": return "Alta";
      case "medium": return "Média";
      case "low": return "Baixa";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-border">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={step === "mapping" ? () => setStep("upload") : onBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex gap-2">
          <div className={cn("h-2 w-8 rounded-full", step === "upload" ? "bg-primary" : "bg-muted")} />
          <div className={cn("h-2 w-8 rounded-full", step === "mapping" ? "bg-primary" : "bg-muted")} />
        </div>
        
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Pular
        </Button>
      </header>

      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-6 max-w-lg mx-auto"
            >
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Importar suas categorias
                </h1>
                <p className="text-muted-foreground text-sm">
                  Vocês podem enviar uma planilha com suas categorias e limites. 
                  Depois podem revisar e ajustar o mapeamento.
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-sm">Arquivo XLS, XLSX ou CSV</Label>
                <label className={cn(
                  "flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
                  file 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}>
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <FileSpreadsheet className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                        className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Remover arquivo
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="font-medium text-foreground">Clique para enviar</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        XLS, XLSX ou CSV
                      </p>
                    </>
                  )}
                </label>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    O app tentará mapear automaticamente suas categorias para as categorias padrão. 
                    Vocês podem ajustar na próxima tela.
                  </p>
                </div>

                <Button
                  className="w-full h-12"
                  disabled={!file || loading}
                  onClick={processFile}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Processar arquivo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "mapping" && (
            <motion.div
              key="mapping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              <div className="p-6 pb-4">
                <h1 className="text-xl font-bold text-foreground mb-1">
                  Revisar mapeamento
                </h1>
                <p className="text-sm text-muted-foreground">
                  {importedCategories.length} categorias encontradas. Ajuste o que precisar.
                </p>
              </div>

              <div className="flex-1 overflow-auto px-4 pb-4">
                <div className="space-y-2">
                  {importedCategories.map((cat) => {
                    const category = getCategoryById(cat.mappedCategoryId);
                    const isExpanded = expandedItems.has(cat.id);
                    
                    return (
                      <div
                        key={cat.id}
                        className="rounded-xl border border-border bg-card overflow-hidden"
                      >
                        {/* Collapsed header */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(cat.id)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {cat.importedName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              → {category?.icon} {category?.name}
                              {cat.limit && (
                                <span className="ml-2 text-primary font-medium">
                                  R$ {cat.limit.toLocaleString("pt-BR")}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className={cn("text-xs", getConfidenceColor(cat.confidence))}>
                              {getConfidenceLabel(cat.confidence)}
                            </span>
                            <ChevronDown className={cn(
                              "w-4 h-4 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                          </div>
                        </button>
                        
                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Categoria</Label>
                              <Select
                                value={cat.mappedCategoryId}
                                onValueChange={(v) => updateMapping(cat.id, "mappedCategoryId", v)}
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {expenseCategories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.icon} {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {category && category.subcategories.length > 0 && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">Subcategoria (opcional)</Label>
                                <Select
                                  value={cat.mappedSubcategoryId || "none"}
                                  onValueChange={(v) => updateMapping(cat.id, "mappedSubcategoryId", v === "none" ? null : v)}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Nenhuma" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                    {category.subcategories.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <Label className="text-xs">Limite mensal (R$)</Label>
                              <Input
                                type="number"
                                placeholder="0,00"
                                value={cat.limit || ""}
                                onChange={(e) => updateMapping(cat.id, "limit", parseNumber(e.target.value))}
                                className="h-10"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fixed bottom action */}
              <div className="p-4 border-t border-border bg-background">
                <Button
                  className="w-full h-12"
                  disabled={loading}
                  onClick={handleComplete}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirmar e continuar
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
