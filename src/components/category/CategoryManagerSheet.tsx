import { useState, useMemo } from "react";
import { 
  Plus, Settings, Edit3, Copy, Archive, RotateCcw, ChevronRight, 
  AlertTriangle, FolderOpen 
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconPicker, CategoryIcon } from "@/components/category";
import { DuplicateCategorySheet } from "./DuplicateCategorySheet";
import {
  useUserCategories,
  useCreateUserCategory,
  useRenameUserCategory,
  useArchiveUserCategory,
  useRestoreUserCategory,
  useDuplicateUserCategory,
  useCreateUserSubcategory,
  useArchiveUserSubcategory,
  useCategoryTransactionCount,
  useBulkReclassifyTransactions,
  UserCategory,
} from "@/hooks/useUserCategories";
import { cn } from "@/lib/utils";

interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'income' | 'expense';
  onCategorySelect?: (categoryId: string, subcategoryId?: string) => void;
}

type ViewMode = 'list' | 'create' | 'edit' | 'subcategories';

export function CategoryManagerSheet({
  open,
  onOpenChange,
  defaultType = 'expense',
  onCategorySelect,
}: CategoryManagerSheetProps) {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>(defaultType);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCategory, setSelectedCategory] = useState<UserCategory | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Form states
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("circle-help");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  
  // Rename alert dialog
  const [showRenameAlert, setShowRenameAlert] = useState(false);
  const [renameTransactionCount, setRenameTransactionCount] = useState(0);
  const [pendingRename, setPendingRename] = useState<{ categoryId: string; newName: string } | null>(null);
  
  // Duplicate sheet
  const [showDuplicateSheet, setShowDuplicateSheet] = useState(false);
  const [categoryToDuplicate, setCategoryToDuplicate] = useState<UserCategory | null>(null);

  // Queries and mutations
  const { data: userCategories = [], isLoading } = useUserCategories(showArchived);
  const createCategory = useCreateUserCategory();
  const renameCategory = useRenameUserCategory();
  const archiveCategory = useArchiveUserCategory();
  const restoreCategory = useRestoreUserCategory();
  const duplicateCategory = useDuplicateUserCategory();
  const createSubcategory = useCreateUserSubcategory();
  const archiveSubcategory = useArchiveUserSubcategory();
  const getTransactionCount = useCategoryTransactionCount();
  const bulkReclassify = useBulkReclassifyTransactions();

  // Filter categories by type
  const filteredCategories = useMemo(() => {
    return userCategories.filter(cat => cat.type === activeTab);
  }, [userCategories, activeTab]);

  const activeCategories = filteredCategories.filter(c => c.status === 'ACTIVE');
  const archivedCategories = filteredCategories.filter(c => c.status === 'ARCHIVED');

  // Handlers
  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return;
    
    await createCategory.mutateAsync({
      name: categoryName.trim(),
      icon_key: categoryIcon,
      type: activeTab,
    });
    
    resetForm();
    setViewMode('list');
  };

  const handleStartRename = async () => {
    if (!selectedCategory || !categoryName.trim()) return;
    
    // Check transaction count
    const count = await getTransactionCount.mutateAsync(selectedCategory.id);
    
    if (count > 0) {
      setRenameTransactionCount(count);
      setPendingRename({ categoryId: selectedCategory.id, newName: categoryName.trim() });
      setShowRenameAlert(true);
    } else {
      // Direct rename (no transactions)
      await renameCategory.mutateAsync({
        categoryId: selectedCategory.id,
        newName: categoryName.trim(),
        createNewVersion: false,
      });
      resetForm();
      setViewMode('list');
    }
  };

  const handleConfirmRename = async (createNewVersion: boolean) => {
    if (!pendingRename) return;
    
    await renameCategory.mutateAsync({
      categoryId: pendingRename.categoryId,
      newName: pendingRename.newName,
      createNewVersion,
    });
    
    setShowRenameAlert(false);
    setPendingRename(null);
    resetForm();
    setViewMode('list');
  };

  const handleDuplicateConfirm = async (data: {
    newName: string;
    newIconKey: string;
    includeArchivedSubcategories: boolean;
  }) => {
    if (!categoryToDuplicate) return;
    
    await duplicateCategory.mutateAsync({
      categoryId: categoryToDuplicate.id,
      newName: data.newName,
      newIconKey: data.newIconKey,
      includeArchivedSubcategories: data.includeArchivedSubcategories,
    });
    
    setShowDuplicateSheet(false);
    setCategoryToDuplicate(null);
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategory || !newSubcategoryName.trim()) return;
    
    await createSubcategory.mutateAsync({
      category_id: selectedCategory.id,
      name: newSubcategoryName.trim(),
    });
    
    setNewSubcategoryName("");
  };

  const resetForm = () => {
    setCategoryName("");
    setCategoryIcon("circle-help");
    setSelectedCategory(null);
    setNewSubcategoryName("");
  };

  const openEditMode = (category: UserCategory) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryIcon(category.icon_key);
    setViewMode('edit');
  };

  const openDuplicateSheet = (category: UserCategory) => {
    setCategoryToDuplicate(category);
    setShowDuplicateSheet(true);
  };

  const openSubcategoriesMode = (category: UserCategory) => {
    setSelectedCategory(category);
    setViewMode('subcategories');
  };

  const handleBack = () => {
    resetForm();
    setViewMode('list');
  };

  // Render category item
  const renderCategoryItem = (category: UserCategory) => (
    <div
      key={category.id}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        category.status === 'ARCHIVED' 
          ? "bg-muted/30 border-dashed opacity-60" 
          : "bg-card hover:border-primary/30"
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <CategoryIcon iconKey={category.icon_key} className="w-5 h-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.subcategories?.length || 0} subcategorias
          {category.transaction_count > 0 && ` • ${category.transaction_count} transações`}
        </p>
      </div>
      
      <div className="flex items-center gap-1">
        {category.status === 'ACTIVE' ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openSubcategoriesMode(category)}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditMode(category)}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openDuplicateSheet(category)}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => archiveCategory.mutate(category.id)}
            >
              <Archive className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => restoreCategory.mutate(category.id)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Restaurar
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              {viewMode !== 'list' && (
                <Button variant="ghost" size="icon" onClick={handleBack} className="mr-1">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </Button>
              )}
              {viewMode === 'list' && (
                <>
                  <Settings className="w-5 h-5" />
                  Gerenciar Categorias
                </>
              )}
              {viewMode === 'create' && "Nova Categoria"}
              {viewMode === 'edit' && "Editar Categoria"}
              {viewMode === 'subcategories' && selectedCategory?.name}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100%-60px)]">
            {/* Type Tabs - only on list view */}
            {viewMode === 'list' && (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
                <TabsList className="w-full">
                  <TabsTrigger value="expense" className="flex-1">Despesas</TabsTrigger>
                  <TabsTrigger value="income" className="flex-1">Receitas</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <ScrollArea className="flex-1">
              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-4 pb-4">
                  {/* Add Category Button */}
                  <Button
                    variant="outline"
                    className="w-full h-12 border-dashed"
                    onClick={() => {
                      resetForm();
                      setViewMode('create');
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                  </Button>

                  {/* Active Categories */}
                  {activeCategories.length > 0 ? (
                    <div className="space-y-2">
                      {activeCategories.map(renderCategoryItem)}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma categoria customizada.<br />
                      As categorias padrão do OIK continuam disponíveis.
                    </p>
                  )}

                  {/* Archived Toggle */}
                  {archivedCategories.length > 0 && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-between"
                        onClick={() => setShowArchived(!showArchived)}
                      >
                        <span className="text-muted-foreground">
                          Arquivadas ({archivedCategories.length})
                        </span>
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-transform",
                          showArchived && "rotate-90"
                        )} />
                      </Button>
                      
                      {showArchived && (
                        <div className="space-y-2 mt-2">
                          {archivedCategories.map(renderCategoryItem)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Create/Edit Form */}
              {(viewMode === 'create' || viewMode === 'edit') && (
                <div className="space-y-6 pb-4">
                  <div className="space-y-2">
                    <Label>Nome da Categoria</Label>
                    <Input
                      placeholder="Ex: Streaming, Academia..."
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      className="h-12"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ícone <span className="text-destructive">*</span></Label>
                    <IconPicker
                      value={categoryIcon}
                      onChange={setCategoryIcon}
                    />
                  </div>
                </div>
              )}

              {/* Subcategories View */}
              {viewMode === 'subcategories' && selectedCategory && (
                <div className="space-y-4 pb-4">
                  {/* Add Subcategory */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova subcategoria..."
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      className="h-10"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddSubcategory}
                      disabled={!newSubcategoryName.trim() || createSubcategory.isPending}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Subcategory List */}
                  <div className="space-y-2">
                    {selectedCategory.subcategories?.map((sub) => (
                      <div
                        key={sub.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border",
                          sub.status === 'ARCHIVED' && "opacity-50"
                        )}
                      >
                        <span className="font-medium">{sub.name}</span>
                        {sub.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => archiveSubcategory.mutate(sub.id)}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {(!selectedCategory.subcategories || selectedCategory.subcategories.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhuma subcategoria
                      </p>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Action Buttons */}
            {viewMode === 'create' && (
              <div className="pt-4 border-t">
                <Button
                  className="w-full h-12"
                  onClick={handleCreateCategory}
                  disabled={!categoryName.trim() || createCategory.isPending}
                >
                  Criar Categoria
                </Button>
              </div>
            )}

            {viewMode === 'edit' && (
              <div className="pt-4 border-t">
                <Button
                  className="w-full h-12"
                  onClick={handleStartRename}
                  disabled={!categoryName.trim() || renameCategory.isPending}
                >
                  Salvar Alterações
                </Button>
              </div>
            )}

          </div>
        </SheetContent>
      </Sheet>

      {/* Duplicate Category Sheet */}
      <DuplicateCategorySheet
        open={showDuplicateSheet}
        onOpenChange={setShowDuplicateSheet}
        category={categoryToDuplicate}
        onConfirm={handleDuplicateConfirm}
        isLoading={duplicateCategory.isPending}
      />

      {/* Rename Alert Dialog */}
      <AlertDialog open={showRenameAlert} onOpenChange={setShowRenameAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Categoria em uso
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta categoria já está em uso em <strong>{renameTransactionCount} transações</strong>.
              </p>
              <p>
                Para manter o histórico íntegro, essa mudança valerá apenas para novas transações.
                As transações antigas permanecerão com a classificação anterior e poderão ser consultadas no histórico.
              </p>
              <p className="text-sm text-muted-foreground">
                A categoria antiga será arquivada e não aparecerá em gráficos/relatórios futuros.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmRename(true)}>
              Criar Nova Versão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
