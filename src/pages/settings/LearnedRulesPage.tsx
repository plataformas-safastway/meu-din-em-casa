/**
 * Learned Rules Management Page
 * 
 * Allows users to view, edit, and manage their learned categorization rules.
 * Located in Settings > Categorizações Aprendidas
 */

import { useState } from 'react';
import { Brain, Trash2, Archive, Users, User, Search, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useLearnedRules, useManageLearnedRules, type LearnedRule } from '@/hooks/useLearnedCategorization';
import { useUserCategories } from '@/hooks/useUserCategories';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LearnedRulesPageProps {
  onBack?: () => void;
}

export default function LearnedRulesPage({ onBack }: LearnedRulesPageProps) {
  const [search, setSearch] = useState('');
  const { data: rules = [], isLoading } = useLearnedRules();
  const { data: categories = [] } = useUserCategories(false);
  const { deleteRule, archiveRule, isDeleting, isArchiving } = useManageLearnedRules();
  
  // Filter rules by search
  const filteredRules = rules.filter(rule => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      rule.fingerprint.toLowerCase().includes(searchLower) ||
      rule.merchant_canon?.toLowerCase().includes(searchLower)
    );
  });
  
  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Desconhecida';
  };
  
  // Get subcategory name
  const getSubcategoryName = (categoryId: string, subcategoryId: string | null) => {
    if (!subcategoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    const subcategory = category?.subcategories?.find(s => s.id === subcategoryId);
    return subcategory?.name || null;
  };
  
  const handleDelete = async (rule: LearnedRule) => {
    try {
      await deleteRule(rule.id);
      toast.success('Regra removida com sucesso');
    } catch (error) {
      toast.error('Erro ao remover regra');
    }
  };
  
  const handleArchive = async (rule: LearnedRule) => {
    try {
      await archiveRule(rule.id);
      toast.success('Regra arquivada com sucesso');
    } catch (error) {
      toast.error('Erro ao arquivar regra');
    }
  };
  
  const formatFingerprint = (rule: LearnedRule) => {
    // Remove prefix (F: or W:) and format nicely
    const fp = rule.fingerprint.replace(/^[FW]:/, '');
    return rule.merchant_canon || fp.replace(/_/g, ' ');
  };
  
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      {onBack && (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="container px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Categorizações Aprendidas</h1>
            </div>
          </div>
        </header>
      )}
      
      <div className="container max-w-4xl py-6 space-y-6 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Categorizações Aprendidas</CardTitle>
          </div>
          <CardDescription>
            Regras criadas automaticamente quando você corrige categorias de transações.
            O sistema usa essas regras para categorizar automaticamente transações similares no futuro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por estabelecimento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Rules Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando regras...
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'Nenhuma regra encontrada para esta busca' : 'Nenhuma regra aprendida ainda'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Escopo</TableHead>
                    <TableHead className="text-center">Usos</TableHead>
                    <TableHead className="text-center">Confiança</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatFingerprint(rule)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {rule.fingerprint_type === 'strong' ? 'ID forte' : 'Padrão'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{getCategoryName(rule.category_id)}</span>
                          {rule.subcategory_id && (
                            <span className="text-xs text-muted-foreground">
                              {getSubcategoryName(rule.category_id, rule.subcategory_id)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {rule.scope_type === 'family' ? (
                                <Users className="h-4 w-4 mx-auto text-muted-foreground" />
                              ) : (
                                <User className="h-4 w-4 mx-auto text-muted-foreground" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {rule.scope_type === 'family' ? 'Família' : 'Pessoal'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {rule.examples_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm">
                            {Math.round(rule.confidence_base * 100)}%
                          </span>
                          {rule.conflict_count > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {rule.conflict_count} conflito(s) detectado(s)
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleArchive(rule)}
                                  disabled={isArchiving}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Arquivar regra</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover regra?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. A regra para "{formatFingerprint(rule)}" 
                                  será removida permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(rule)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isDeleting ? 'Removendo...' : 'Remover'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Stats */}
          {rules.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
              <span>
                {filteredRules.length} regra{filteredRules.length !== 1 ? 's' : ''} 
                {search && ` (de ${rules.length} total)`}
              </span>
              <span>
                Última atualização: {format(new Date(rules[0]?.last_used_at || new Date()), "dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
