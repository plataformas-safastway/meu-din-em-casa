import { useState } from "react";
import { ArrowLeft, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EbookForm } from "@/components/education/EbookForm";
import { EbookAdminList } from "@/components/education/EbookAdminList";
import {
  useAllEbooks,
  useCreateEbook,
  useUpdateEbook,
  useDeleteEbook,
  Ebook,
  EbookInput,
} from "@/hooks/useEbooks";
import { toast } from "sonner";

interface EbooksAdminPageProps {
  onBack: () => void;
}

export default function EbooksAdminPage({ onBack }: EbooksAdminPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingEbook, setEditingEbook] = useState<Ebook | null>(null);

  const { data: ebooks = [], isLoading, error } = useAllEbooks();
  const createMutation = useCreateEbook();
  const updateMutation = useUpdateEbook();
  const deleteMutation = useDeleteEbook();

  const handleCreate = async (data: EbookInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("eBook criado com sucesso!");
    } catch (err) {
      toast.error("Erro ao criar eBook");
      throw err;
    }
  };

  const handleUpdate = async (data: EbookInput) => {
    if (!editingEbook) return;
    try {
      await updateMutation.mutateAsync({ id: editingEbook.id, data });
      toast.success("eBook atualizado com sucesso!");
      setEditingEbook(null);
    } catch (err) {
      toast.error("Erro ao atualizar eBook");
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("eBook excluído com sucesso!");
    } catch (err) {
      toast.error("Erro ao excluir eBook");
    }
  };

  const handleReorder = async (id: string, newOrder: number) => {
    try {
      await updateMutation.mutateAsync({ id, data: { display_order: newOrder } });
    } catch (err) {
      toast.error("Erro ao reordenar eBook");
    }
  };

  const handleEdit = (ebook: Ebook) => {
    setEditingEbook(ebook);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingEbook(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Gerenciar eBooks</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-destructive">
            Erro ao carregar eBooks. Tente novamente.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Gerenciar eBooks</h1>
            </div>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo eBook
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <EbookAdminList
            ebooks={ebooks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReorder={handleReorder}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </main>

      <EbookForm
        open={formOpen}
        onOpenChange={handleFormClose}
        ebook={editingEbook}
        onSubmit={editingEbook ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
