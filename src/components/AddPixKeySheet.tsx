import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePixKey } from "@/hooks/useBankData";
import { toast } from "sonner";
import { Loader2, Key, Phone, Mail, Hash, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddPixKeySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccountId: string;
  bankAccountName: string;
}

const keyTypes = [
  { value: "cpf", label: "CPF", icon: User, placeholder: "***.***.***-**", mask: "###.###.###-##" },
  { value: "cnpj", label: "CNPJ", icon: User, placeholder: "**.***.***/*****-**", mask: "##.###.###/####-##" },
  { value: "email", label: "E-mail", icon: Mail, placeholder: "ex***@***.com" },
  { value: "phone", label: "Telefone", icon: Phone, placeholder: "+55 ** *****-****" },
  { value: "random", label: "Chave aleatória", icon: Hash, placeholder: "xxxxxxxx-xxxx-xxxx-xxxx" },
];

export function AddPixKeySheet({ open, onOpenChange, bankAccountId, bankAccountName }: AddPixKeySheetProps) {
  const [keyType, setKeyType] = useState("cpf");
  const [keyValue, setKeyValue] = useState("");
  const createPixKey = useCreatePixKey();

  const selectedType = keyTypes.find((t) => t.value === keyType);

  const maskValue = (value: string, type: string): string => {
    // Simple masking for display purposes - show only last few chars
    if (!value) return "";
    
    switch (type) {
      case "cpf":
        if (value.length >= 11) {
          return `***.***.*${value.slice(-3)}-${value.slice(-2)}`;
        }
        return value;
      case "cnpj":
        if (value.length >= 14) {
          return `**.***.***/****-${value.slice(-2)}`;
        }
        return value;
      case "email":
        const [local, domain] = value.split("@");
        if (domain) {
          return `${local.slice(0, 2)}***@${domain}`;
        }
        return value;
      case "phone":
        if (value.length >= 10) {
          return `+55 ** *****-${value.slice(-4)}`;
        }
        return value;
      case "random":
        if (value.length >= 8) {
          return `${value.slice(0, 8)}****`;
        }
        return value;
      default:
        return value;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyValue.trim()) {
      toast.error("Digite o valor da chave Pix");
      return;
    }
    try {
      const maskedValue = maskValue(keyValue, keyType);
      await createPixKey.mutateAsync({
        bank_account_id: bankAccountId,
        key_type: keyType,
        key_value_masked: maskedValue,
      });
      toast.success("Chave Pix adicionada!");
      onOpenChange(false);
      setKeyValue("");
    } catch {
      toast.error("Erro ao adicionar chave Pix");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Nova Chave Pix
          </SheetTitle>
          <p className="text-sm text-muted-foreground text-left">
            Vinculada à conta: {bankAccountName}
          </p>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Key Type Selection */}
          <div className="space-y-3">
            <Label>Tipo de chave</Label>
            <div className="grid grid-cols-2 gap-2">
              {keyTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setKeyType(type.value);
                      setKeyValue("");
                    }}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left",
                      keyType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Value Input */}
          <div className="space-y-2">
            <Label>Valor da chave</Label>
            <Input
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={selectedType?.placeholder}
              className="h-12"
              type={keyType === "email" ? "email" : "text"}
              inputMode={keyType === "phone" || keyType === "cpf" || keyType === "cnpj" ? "numeric" : "text"}
            />
            <p className="text-xs text-muted-foreground">
              A chave será salva de forma mascarada para sua segurança
            </p>
          </div>

          {/* Preview */}
          {keyValue && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Será salva como:</p>
              <p className="font-mono text-sm">{maskValue(keyValue, keyType)}</p>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full h-12" disabled={createPixKey.isPending}>
            {createPixKey.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Adicionar chave Pix
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
