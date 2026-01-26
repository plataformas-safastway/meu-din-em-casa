import { useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, Check, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { useCreateAdminUser, useCurrentAdminRole, AdminRole } from "@/hooks/useAdminUsers";
import { toast } from "sonner";

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  displayName: z.string().optional(),
  adminRole: z.enum(["CS", "ADMIN", "LEGAL", "MASTER"]),
  mfaRequired: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateAdminUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdminUserSheet({ open, onOpenChange }: CreateAdminUserSheetProps) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { data: currentRole } = useCurrentAdminRole();
  const createUser = useCreateAdminUser();
  
  const isMaster = currentRole === "MASTER";
  const canCreateMaster = isMaster;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      displayName: "",
      adminRole: "CS",
      mfaRequired: true,
    },
  });

  const handleSubmit = async (values: FormValues) => {
    // Validate role permissions
    if (values.adminRole === "MASTER" && !canCreateMaster) {
      toast.error("Apenas MASTER pode criar outros usuários MASTER");
      return;
    }

    try {
      const result = await createUser.mutateAsync({
        email: values.email,
        displayName: values.displayName,
        adminRole: values.adminRole as AdminRole,
        mfaRequired: values.mfaRequired,
      });
      
      setTempPassword(result.tempPassword);
      toast.success("Usuário criado com sucesso!");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCopy = async () => {
    if (!tempPassword) return;
    
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success("Senha copiada!");
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (tempPassword) {
      // Reset after showing password
      setTempPassword(null);
      setShowPassword(false);
      setCopied(false);
      form.reset();
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo Usuário Administrativo</SheetTitle>
          <SheetDescription>
            Crie um novo usuário com acesso ao dashboard administrativo.
          </SheetDescription>
        </SheetHeader>

        {tempPassword ? (
          <div className="mt-6 space-y-6">
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">
                Senha Temporária Gerada
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Copie esta senha agora. Ela não poderá ser visualizada novamente.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <label className="text-sm font-medium">Senha temporária:</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all relative">
                  {showPassword ? tempPassword : "•".repeat(20)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                O usuário precisará trocar a senha no primeiro login.
              </AlertDescription>
            </Alert>

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="usuario@empresa.com" 
                        type="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormLabel>Papel *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o papel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CS">CS (Customer Success)</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="LEGAL">Jurídico/LGPD</SelectItem>
                        {canCreateMaster && (
                          <SelectItem value="MASTER">Master</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === "CS" && "Acesso operacional para consultoria de famílias."}
                      {field.value === "ADMIN" && "Pode gerenciar CS e LEGAL, ver logs."}
                      {field.value === "LEGAL" && "Acesso aos recursos LGPD e break-glass."}
                      {field.value === "MASTER" && "Acesso total. Use com cautela."}
                    </FormDescription>
                    <FormMessage />
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

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Uma senha temporária será gerada automaticamente. 
                  O usuário precisará trocá-la no primeiro login.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full"
                disabled={createUser.isPending}
              >
                {createUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Usuário
              </Button>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
