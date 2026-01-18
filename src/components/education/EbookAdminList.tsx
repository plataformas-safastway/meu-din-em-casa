import { useState } from "react";
import { Ebook } from "@/hooks/useEbooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Edit, Trash2, ExternalLink, GripVertical, ChevronUp, ChevronDown } from "lucide-react";

interface EbookAdminListProps {
  ebooks: Ebook[];
  onEdit: (ebook: Ebook) => void;
  onDelete: (id: string) => Promise<void>;
  onReorder: (id: string, newOrder: number) => Promise<void>;
  isDeleting?: boolean;
}

export function EbookAdminList({
  ebooks,
  onEdit,
  onDelete,
  onReorder,
  isDeleting,
}: EbookAdminListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const handleMoveUp = async (ebook: Ebook, index: number) => {
    if (index === 0) return;
    const prevEbook = ebooks[index - 1];
    await onReorder(ebook.id, prevEbook.display_order);
  };

  const handleMoveDown = async (ebook: Ebook, index: number) => {
    if (index === ebooks.length - 1) return;
    const nextEbook = ebooks[index + 1];
    await onReorder(ebook.id, nextEbook.display_order + 1);
  };

  if (ebooks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum eBook cadastrado ainda.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Ordem</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Tema</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ebooks.map((ebook, index) => (
              <TableRow key={ebook.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleMoveUp(ebook, index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleMoveDown(ebook, index)}
                        disabled={index === ebooks.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm text-muted-foreground ml-1">
                      {ebook.display_order}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{ebook.title}</span>
                    {ebook.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {ebook.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {ebook.theme ? (
                    <Badge variant="secondary">{ebook.theme}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={ebook.is_active ? "default" : "outline"}>
                    {ebook.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a href={ebook.cta_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(ebook)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(ebook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir eBook?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O eBook será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
