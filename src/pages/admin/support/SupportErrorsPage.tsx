import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupportErrors, ErrorFilters, SupportError } from "@/hooks/useSupportModule";
import { SupportErrorDetailSheet } from "./SupportErrorDetailSheet";

const ERROR_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: "Novo", color: "bg-red-500/10 text-red-700 border-red-200", icon: <AlertTriangle className="w-3 h-3" /> },
  analyzing: { label: "Em Análise", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", icon: <Clock className="w-3 h-3" /> },
  resolved: { label: "Resolvido", color: "bg-green-500/10 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  wont_fix: { label: "Não Corrigir", color: "bg-gray-500/10 text-gray-700 border-gray-200", icon: <XCircle className="w-3 h-3" /> },
};

const ERROR_TYPES = [
  { value: "import", label: "Importação" },
  { value: "navigation", label: "Navegação" },
  { value: "login", label: "Login" },
  { value: "integration", label: "Integração" },
  { value: "api", label: "API" },
  { value: "ui", label: "Interface" },
  { value: "other", label: "Outros" },
];

const MODULES = [
  { value: "dashboard", label: "Dashboard" },
  { value: "transactions", label: "Transações" },
  { value: "import", label: "Importação" },
  { value: "banks", label: "Contas" },
  { value: "cards", label: "Cartões" },
  { value: "reports", label: "Relatórios" },
  { value: "goals", label: "Metas" },
  { value: "settings", label: "Configurações" },
];

export function SupportErrorsPage() {
  const [filters, setFilters] = useState<ErrorFilters>({});
  const [page, setPage] = useState(0);
  const [selectedError, setSelectedError] = useState<SupportError | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useSupportErrors(filters, page, pageSize);
  const errors = data?.errors ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleFilterChange = (key: keyof ErrorFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Painel de Erros</h2>
        <p className="text-muted-foreground">Monitore e resolva erros do sistema</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <CardTitle className="text-base">Filtros</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => handleFilterChange("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="new">Novo</SelectItem>
                <SelectItem value="analyzing">Em Análise</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="wont_fix">Não Corrigir</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.error_type || "all"}
              onValueChange={(v) => handleFilterChange("error_type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Erro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {ERROR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.module || "all"}
              onValueChange={(v) => handleFilterChange("module", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                {MODULES.map((mod) => (
                  <SelectItem key={mod.value} value={mod.value}>
                    {mod.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              placeholder="Data inicial"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(ERROR_STATUS_CONFIG).map(([status, config]) => {
          const count = errors.filter(e => e.status === status).length;
          return (
            <Card key={status} className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleFilterChange("status", status)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    {config.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Errors Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Erros Recentes</CardTitle>
            <Badge variant="secondary">{total} erros</Badge>
          </div>
          <CardDescription>Lista de erros capturados pelo sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : errors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum erro encontrado</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {errors.map((error) => (
                  <ErrorRow
                    key={error.id}
                    error={error}
                    onClick={() => setSelectedError(error)}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Sheet */}
      <SupportErrorDetailSheet
        error={selectedError}
        onClose={() => setSelectedError(null)}
      />
    </div>
  );
}

function ErrorRow({ error, onClick }: { error: SupportError; onClick: () => void }) {
  const statusConfig = ERROR_STATUS_CONFIG[error.status] || ERROR_STATUS_CONFIG.new;
  const errorType = ERROR_TYPES.find(t => t.value === error.error_type)?.label || error.error_type;
  const module = MODULES.find(m => m.value === error.module)?.label || error.module;

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className={`p-2 rounded-lg ${statusConfig.color}`}>
        {statusConfig.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{error.error_message}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Badge variant="outline" className="text-xs">{errorType}</Badge>
          {module && <Badge variant="outline" className="text-xs">{module}</Badge>}
          <span>•</span>
          <span>{format(new Date(error.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge className={`${statusConfig.color} border`}>
          {statusConfig.label}
        </Badge>
        <Button variant="ghost" size="icon">
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
