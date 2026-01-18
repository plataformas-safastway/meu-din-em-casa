import { useEbooks } from "@/hooks/useEbooks";
import { EbookCard } from "./EbookCard";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function EbooksShowcase() {
  const { data: ebooks, isLoading, error } = useEbooks();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar eBooks. Tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  if (!ebooks || ebooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg">Nenhum eBook disponível</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Novos conteúdos serão adicionados em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {ebooks.map((ebook) => (
        <EbookCard key={ebook.id} ebook={ebook} />
      ))}
    </div>
  );
}
