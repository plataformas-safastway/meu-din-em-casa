import { useState } from "react";
import { ArrowLeft, Download, Upload, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserCategories } from "@/hooks/useUserCategories";
import { CategoryList } from "@/components/categories/CategoryList";
import { CategoryImportModal } from "@/components/categories/CategoryImportModal";
import { CategoryCreateModal } from "@/components/categories/CategoryCreateModal";
import { ScreenLoader } from "@/components/ui/money-loader";

interface CategoriesManagementPageProps {
  onBack?: () => void;
}

export function CategoriesManagementPage({ onBack }: CategoriesManagementPageProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { data: categories = [], isLoading } = useUserCategories(false);
  
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');
  
  const handleDownloadTemplate = () => {
    // Download the template from public folder
    const link = document.createElement('a');
    link.href = '/templates/Modelo_Categorias_OIK.xlsx';
    link.download = 'Modelo_Categorias_OIK.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ScreenLoader label="Carregando categorias..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h1 className="text-lg font-semibold">Gerenciar Categorias</h1>
                <p className="text-xs text-muted-foreground">
                  {categories.length} categorias configuradas
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Settings2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="container px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="w-4 h-4" />
            Importar Planilha
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleDownloadTemplate}
          >
            <Download className="w-4 h-4" />
            Baixar Modelo
          </Button>
          <Button 
            size="sm" 
            className="gap-2 ml-auto"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="container px-4 pb-4">
        <div className="p-3 rounded-xl bg-info/10 border border-info/20">
          <p className="text-sm text-info leading-relaxed">
            <strong>💡 Dica:</strong> Edite categorias com 1 toque. Ao alterar estrutura, você poderá escolher entre reclassificar o histórico ou aplicar só daqui para frente.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="container px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">
              Despesas ({expenseCategories.length})
            </TabsTrigger>
            <TabsTrigger value="income">
              Receitas ({incomeCategories.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="expense" className="mt-4">
            <CategoryList 
              categories={expenseCategories} 
              type="expense"
            />
          </TabsContent>
          
          <TabsContent value="income" className="mt-4">
            <CategoryList 
              categories={incomeCategories} 
              type="income"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Import Modal */}
      <CategoryImportModal 
        open={showImportModal} 
        onOpenChange={setShowImportModal}
      />
      
      {/* Create Category Modal */}
      <CategoryCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        defaultType={activeTab}
      />
    </div>
  );
}

export default CategoriesManagementPage;
