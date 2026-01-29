import { useState, useMemo } from "react";
import { 
  Search, 
  ChevronRight,
  BookOpen,
  HelpCircle,
  X,
  Calendar,
  Users,
  Shield,
  Settings,
  Smartphone,
  Filter
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  dashboardHelpArticles, 
  dashboardFaqItems, 
  dashboardCategoryLabels, 
  searchDashboardHelp,
  DashboardHelpArticle,
  DashboardFAQItem,
  DASHBOARD_HELP_VERSION
} from "@/data/helpContentDashboard";

type AudienceFilter = "all" | "admin-only" | "cs-only" | "support-reference";

function ArticleCard({ 
  article, 
  onSelect 
}: { 
  article: DashboardHelpArticle; 
  onSelect: () => void;
}) {
  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case "admin-only":
        return <Badge variant="secondary" className="text-[10px]">Admin</Badge>;
      case "cs-only":
        return <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">CS</Badge>;
      case "support-reference":
        return <Badge variant="outline" className="text-[10px] border-accent-foreground/30 text-accent-foreground">Suporte</Badge>;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onSelect}
      className="w-full p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{article.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm mb-1">{article.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {article.summary}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">
              {dashboardCategoryLabels[article.category]}
            </Badge>
            {getAudienceBadge(article.audience)}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function ArticleDetail({ 
  article, 
  onBack 
}: { 
  article: DashboardHelpArticle; 
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Voltar à lista
      </button>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{article.icon}</span>
        <div>
          <h2 className="text-xl font-semibold">{article.title}</h2>
          <p className="text-sm text-muted-foreground">{article.summary}</p>
        </div>
      </div>

      <div className="space-y-4">
        {article.steps.map((step, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.tip && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-700 dark:text-amber-400">💡 {step.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FAQSection({ faqs }: { faqs: DashboardFAQItem[] }) {
  const groupedFaqs = useMemo(() => {
    const groups: Record<string, DashboardFAQItem[]> = {};
    faqs.forEach(faq => {
      if (!groups[faq.category]) {
        groups[faq.category] = [];
      }
      groups[faq.category].push(faq);
    });
    return groups;
  }, [faqs]);

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case "admin-only":
        return <Shield className="w-3 h-3 text-muted-foreground" />;
      case "cs-only":
        return <Users className="w-3 h-3 text-primary" />;
      case "support-reference":
        return <Smartphone className="w-3 h-3 text-accent-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedFaqs).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            {dashboardCategoryLabels[category] || category}
          </h3>
          <Accordion type="single" collapsible className="space-y-2">
            {items.map((faq) => (
              <AccordionItem 
                key={faq.id} 
                value={faq.id}
                className="border rounded-xl px-4 bg-card"
              >
                <AccordionTrigger className="text-left text-sm hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    {getAudienceIcon(faq.audience)}
                    <span>{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}

export function AdminFAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<DashboardHelpArticle | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");

  const isSearching = searchQuery.trim().length > 0;

  const filteredArticles = useMemo(() => {
    let articles = dashboardHelpArticles;
    
    if (audienceFilter !== "all") {
      articles = articles.filter(a => a.audience === audienceFilter);
    }
    
    const groups: Record<string, DashboardHelpArticle[]> = {};
    articles.forEach(article => {
      if (!groups[article.category]) {
        groups[article.category] = [];
      }
      groups[article.category].push(article);
    });
    return groups;
  }, [audienceFilter]);

  const filteredFaqs = useMemo(() => {
    if (audienceFilter === "all") return dashboardFaqItems;
    return dashboardFaqItems.filter(f => f.audience === audienceFilter);
  }, [audienceFilter]);

  const searchResults = useMemo(() => {
    if (!isSearching) return { articles: [], faqs: [] };
    const results = searchDashboardHelp(searchQuery);
    
    if (audienceFilter !== "all") {
      return {
        articles: results.articles.filter(a => a.audience === audienceFilter),
        faqs: results.faqs.filter(f => f.audience === audienceFilter),
      };
    }
    return results;
  }, [searchQuery, isSearching, audienceFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Central de Ajuda (Dashboard)</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            Atualizado em {DASHBOARD_HELP_VERSION}
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por palavra-chave..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        
        <div className="flex gap-1">
          <Button
            variant={audienceFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setAudienceFilter("all")}
          >
            Todos
          </Button>
          <Button
            variant={audienceFilter === "admin-only" ? "default" : "outline"}
            size="sm"
            onClick={() => setAudienceFilter("admin-only")}
          >
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Button>
          <Button
            variant={audienceFilter === "cs-only" ? "default" : "outline"}
            size="sm"
            onClick={() => setAudienceFilter("cs-only")}
          >
            <Users className="w-3 h-3 mr-1" />
            CS
          </Button>
          <Button
            variant={audienceFilter === "support-reference" ? "default" : "outline"}
            size="sm"
            onClick={() => setAudienceFilter("support-reference")}
          >
            <Smartphone className="w-3 h-3 mr-1" />
            App
          </Button>
        </div>
      </div>

      {/* Content */}
      {isSearching ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Resultados para "{searchQuery}"
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          </div>

          {searchResults.articles.length === 0 && searchResults.faqs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {searchResults.articles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Tutoriais ({searchResults.articles.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.articles.map(article => (
                      <ArticleCard 
                        key={article.id} 
                        article={article} 
                        onSelect={() => setSelectedArticle(article)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {searchResults.faqs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Perguntas Frequentes ({searchResults.faqs.length})
                  </h3>
                  <FAQSection faqs={searchResults.faqs} />
                </div>
              )}
            </>
          )}
        </div>
      ) : selectedArticle ? (
        <ArticleDetail 
          article={selectedArticle} 
          onBack={() => setSelectedArticle(null)}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Tutoriais
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              FAQ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {Object.entries(filteredArticles).map(([category, articles]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {dashboardCategoryLabels[category]}
                </h3>
                <div className="space-y-2">
                  {articles.map(article => (
                    <ArticleCard 
                      key={article.id} 
                      article={article} 
                      onSelect={() => setSelectedArticle(article)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="faq">
            <FAQSection faqs={filteredFaqs} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
