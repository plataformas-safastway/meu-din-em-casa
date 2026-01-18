import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Ebook, EbookInput } from "@/hooks/useEbooks";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  cta_link: z.string().url("Link deve ser uma URL válida"),
  cta_text: z.string().min(1, "Texto do CTA é obrigatório"),
  cover_url: z.string().url("URL da capa deve ser válida").optional().or(z.literal("")),
  theme: z.string().optional(),
  display_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface EbookFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ebook?: Ebook | null;
  onSubmit: (data: EbookInput) => Promise<void>;
  isLoading?: boolean;
}

export function EbookForm({ open, onOpenChange, ebook, onSubmit, isLoading }: EbookFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: ebook?.title || "",
      description: ebook?.description || "",
      cta_link: ebook?.cta_link || "",
      cta_text: ebook?.cta_text || "Ver eBook",
      cover_url: ebook?.cover_url || "",
      theme: ebook?.theme || "",
      display_order: ebook?.display_order || 0,
      is_active: ebook?.is_active ?? true,
    },
  });

  // Reset form when ebook changes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    } else if (ebook) {
      form.reset({
        title: ebook.title,
        description: ebook.description || "",
        cta_link: ebook.cta_link,
        cta_text: ebook.cta_text,
        cover_url: ebook.cover_url || "",
        theme: ebook.theme || "",
        display_order: ebook.display_order,
        is_active: ebook.is_active,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        cta_link: "",
        cta_text: "Ver eBook",
        cover_url: "",
        theme: "",
        display_order: 0,
        is_active: true,
      });
    }
    onOpenChange(open);
  };

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      title: values.title,
      description: values.description || null,
      cta_link: values.cta_link,
      cta_text: values.cta_text,
      cover_url: values.cover_url || null,
      theme: values.theme || null,
      display_order: values.display_order,
      is_active: values.is_active,
    });
    handleOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{ebook ? "Editar eBook" : "Novo eBook"}</SheetTitle>
          <SheetDescription>
            {ebook ? "Edite as informações do eBook" : "Preencha os dados do novo eBook"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Guia de Finanças Pessoais" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição do eBook..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cta_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link do CTA *</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/ebook.pdf" {...field} />
                  </FormControl>
                  <FormDescription>URL para download ou página do eBook</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cta_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto do CTA *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ver eBook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Capa</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/capa.jpg" {...field} />
                  </FormControl>
                  <FormDescription>Imagem de capa do eBook</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tema/Tag</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Investimentos, Orçamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="display_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem de Exibição</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormDescription>Menor número = aparece primeiro</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription>
                      eBooks inativos não aparecem na vitrine
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Salvando..." : ebook ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
