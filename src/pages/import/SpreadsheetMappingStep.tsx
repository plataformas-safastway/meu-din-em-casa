import { useState, useMemo } from "react";
import { Check, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/useBankData";
import { ColumnMapping, SpreadsheetRow } from "@/hooks/useSpreadsheetImport";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SpreadsheetMappingStepProps {
  headers: string[];
  previewRows: SpreadsheetRow[];
  suggestedMapping: ColumnMapping;
  onConfirm: (mapping: ColumnMapping, accountId: string | null) => void;
}

interface FieldConfig {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  help: string;
}

const FIELDS: FieldConfig[] = [
  { key: "date", label: "Data", required: true, help: "Coluna com a data da transação" },
  { key: "description", label: "Descrição", required: true, help: "Coluna com descrição ou histórico" },
  { key: "value", label: "Valor", required: true, help: "Coluna com o valor (número)" },
  { key: "type", label: "Tipo", required: false, help: "Receita/Despesa, Entrada/Saída, +/-" },
  { key: "category", label: "Categoria", required: false, help: "Categoria já definida na planilha" },
  { key: "account", label: "Conta", required: false, help: "Conta de origem" },
];

export function SpreadsheetMappingStep({
  headers,
  previewRows,
  suggestedMapping,
  onConfirm,
}: SpreadsheetMappingStepProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(suggestedMapping);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);

  const { data: bankAccounts = [] } = useBankAccounts();

  const isValid = useMemo(() => {
    return Boolean(mapping.date && mapping.description && mapping.value);
  }, [mapping]);

  const handleFieldChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === "__none__" ? null : value,
    }));
  };

  const handleContinue = () => {
    if (!mapping.account && !accountId) {
      setShowAccountPrompt(true);
    } else {
      onConfirm(mapping, accountId);
    }
  };

  const handleAccountConfirm = () => {
    onConfirm(mapping, accountId);
  };

  const getPreviewValue = (field: keyof ColumnMapping) => {
    const columnName = mapping[field];
    if (!columnName || previewRows.length === 0) return null;
    const value = previewRows[0][columnName];
    return value !== null && value !== undefined ? String(value) : null;
  };

  // Account selection modal
  if (showAccountPrompt) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-info/20 flex items-center justify-center mx-auto">
            <HelpCircle className="w-8 h-8 text-info" />
          </div>
          <h2 className="text-lg font-semibold">Vincular a uma conta?</h2>
          <p className="text-sm text-muted-foreground">
            Você pode vincular estes lançamentos a uma conta bancária existente ou deixar sem vínculo.
          </p>
        </div>

        <div className="space-y-3">
          <Label>Conta bancária (opcional)</Label>
          <Select value={accountId || ""} onValueChange={(v) => setAccountId(v || null)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Sem vínculo com conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem vínculo com conta</SelectItem>
              {bankAccounts.map((account: any) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.nickname} ({account.banks?.name || account.custom_bank_name || "Banco"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setShowAccountPrompt(false)}>
            Voltar
          </Button>
          <Button className="flex-1" onClick={handleAccountConfirm}>
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Mapeamento de colunas</h2>
        <p className="text-sm text-muted-foreground">
          Confirme quais colunas correspondem a cada campo. Já sugerimos com base nos nomes.
        </p>
      </div>

      {/* Mapping Fields */}
      <div className="space-y-4">
        {FIELDS.map((field) => {
          const preview = getPreviewValue(field.key);
          const isSelected = Boolean(mapping[field.key]);

          return (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className={cn("text-sm", field.required && "font-medium")}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{field.help}</TooltipContent>
                </Tooltip>
              </div>

              <Select
                value={mapping[field.key] || "__none__"}
                onValueChange={(v) => handleFieldChange(field.key, v)}
              >
                <SelectTrigger
                  className={cn(
                    "h-11",
                    isSelected && "border-success",
                    field.required && !isSelected && "border-warning"
                  )}
                >
                  <SelectValue placeholder="Selecione a coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Não mapear —</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Preview */}
              {preview && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Exemplo: "{preview}"
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation */}
      {!isValid && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Os campos Data, Descrição e Valor são obrigatórios.
          </p>
        </div>
      )}

      {/* Preview Table */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Prévia do mapeamento:</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Data</th>
                <th className="px-3 py-2 text-left font-medium">Descrição</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                {mapping.type && <th className="px-3 py-2 text-left font-medium">Tipo</th>}
              </tr>
            </thead>
            <tbody>
              {previewRows.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2">
                    {mapping.date && row[mapping.date] ? String(row[mapping.date]) : "-"}
                  </td>
                  <td className="px-3 py-2 max-w-[150px] truncate">
                    {mapping.description && row[mapping.description]
                      ? String(row[mapping.description])
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {mapping.value && row[mapping.value] ? String(row[mapping.value]) : "-"}
                  </td>
                  {mapping.type && (
                    <td className="px-3 py-2">
                      {row[mapping.type] ? String(row[mapping.type]) : "-"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Continue Button */}
      <Button className="w-full h-12" disabled={!isValid} onClick={handleContinue}>
        Confirmar mapeamento
      </Button>
    </div>
  );
}
