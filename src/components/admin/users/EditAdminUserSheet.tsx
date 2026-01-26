import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { AdminUser, useUpdateAdminUser, useCurrentAdminRole, AdminRole } from "@/hooks/useAdminUsers";

const formSchema = z.object({
  displayName: z.string().optional(),
  adminRole: z.enum(["CS", "ADMIN", "LEGAL", "MASTER"]),
  isActive: z.boolean(),
  mfaRequired: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAdminUserSheetProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAdminUserSheet({ user, open, onOpenChange }: EditAdminUserSheetProps) {
  const { data: currentRole } = useCurrentAdminRole();
  const updateUser = useUpdateAdminUser();
  
  const isMaster = currentRole === "MASTER";
  const isAdmin = currentRole === "ADMIN";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      adminRole: "CS",
      isActive: true,
      mfaRequired: false,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.display_name || "",
        adminRole: user.admin_role,
        isActive: user.is_active,
        mfaRequired: user.mfa_required,
      });
    }
  }, [user, form]);

  const canChangeRole = (targetRole: AdminRole): boolean => {
    if (isMaster) return true;
    if (isAdmin) {
      // ADMIN cannot promote to MASTER or change MASTER/ADMIN roles
      return targetRole === "CS" || targetRole === "LEGAL";
    }
    return false;
  };

  const handleSubmit = async (values: FormValues) => {
    if (!user) return;

    try {
      await updateUser.mutateAsync({
        id: user.id,
        displayName: values.displayName,
        adminRole: values.adminRole as AdminRole,
        isActive: values.isActive,
        mfaRequired: values.mfaRequired,
      });
      
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Usuário</SheetTitle>
          <SheetDescription>
            {user.email}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-6">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de exibição</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adminRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!canChangeRole(field.value as AdminRole)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CS" disabled={!canChangeRole("CS")}>
                        CS (Customer Success)
                      </SelectItem>
                      <SelectItem value="ADMIN" disabled={!canChangeRole("ADMIN")}>
                        Administrador
                      </SelectItem>
                      <SelectItem value="LEGAL" disabled={!canChangeRole("LEGAL")}>
                        Jurídico/LGPD
                      </SelectItem>
                      {isMaster && (
                        <SelectItem value="MASTER">Master</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {field.value === "CS" && "Acesso operacional para consultoria de famílias."}
                    {field.value === "ADMIN" && "Pode gerenciar CS e LEGAL, ver logs."}
                    {field.value === "LEGAL" && "Acesso aos recursos LGPD e break-glass."}
                    {field.value === "MASTER" && "Acesso total ao sistema."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativo</FormLabel>
                    <FormDescription>
                      Usuários inativos não podem acessar o dashboard
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mfaRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">MFA Obrigatório</FormLabel>
                    <FormDescription>
                      Exigir autenticação de dois fatores
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={updateUser.isPending}
              >
                {updateUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
