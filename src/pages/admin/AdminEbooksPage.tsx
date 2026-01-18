import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EbookAdminList } from "@/components/education/EbookAdminList";
import { EbookForm } from "@/components/education/EbookForm";
import { useAllEbooks, useCreateEbook, useUpdateEbook, useDeleteEbook, Ebook, EbookInput } from "@/hooks/useEbooks";
import { toast } from "sonner";

export function AdminEbooksPage() {
  const { data: ebooks = [], isLoading } = useAllEbooks();
  const createEbook = useCreateEbook();
  const updateEbook = useUpdateEbook();
  const deleteEbook = useDeleteEbook();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEbook, setEditingEbook] = useState<Ebook | null>(null);

  const handleEdit = (ebook: Ebook) => {
    setEditingEbook(ebook);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEbook.mutateAsync(id);
      toast.success("eBook excluído com sucesso");
    } catch (error) {
      toast.error("Erro ao excluir eBook");
    }
  };

  const handleReorder = async (id: string, newOrder: number) => {
    try {
      await updateEbook.mutateAsync({ id, data: { display_order: newOrder } });
    } catch (error) {
      toast.error("Erro ao reordenar eBook");
    }
  };

  const handleSubmit = async (data: EbookInput) => {
    try {
      if (editingEbook) {
        await updateEbook.mutateAsync({ id: editingEbook.id, data });
        toast.success("eBook atualizado com sucesso");
      } else {
        await createEbook.mutateAsync(data);
        toast.success("eBook criado com sucesso");
      }
      setEditingEbook(null);
    } catch (error) {
      toast.error(editingEbook ? "Erro ao atualizar eBook" : "Erro ao criar eBook");
      throw error;
    }
  };

  const handleOpenForm = () => {
    setEditingEbook(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">eBooks</h2>
          <p className="text-muted-foreground">Gerencie o conteúdo educacional</p>
        </div>
        <Button onClick={handleOpenForm}>
          <Plus className="w-4 h-4 mr-2" />
          Novo eBook
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            eBooks Publicados
          </CardTitle>
          <CardDescription>
            {ebooks.length} eBook{ebooks.length !== 1 ? 's' : ''} cadastrado{ebooks.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <EbookAdminList 
              ebooks={ebooks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReorder={handleReorder}
              isDeleting={deleteEbook.isPending}
            />
          )}
        </CardContent>
      </Card>

      <EbookForm 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        ebook={editingEbook}
        onSubmit={handleSubmit}
        isLoading={createEbook.isPending || updateEbook.isPending}
      />
    </div>
  );
}
