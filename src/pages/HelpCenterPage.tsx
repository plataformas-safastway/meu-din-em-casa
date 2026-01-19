import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Search, 
  ChevronRight,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  X,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  helpArticles, 
  faqItems, 
  categoryLabels, 
  searchHelp,
  HelpArticle,
  FAQItem,
  HELP_CENTER_VERSION
} from "@/data/helpContent";
import { cn } from "@/lib/utils";

interface HelpCenterPageProps {
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}

function ArticleCard({ 
  article, 
  onSelect 
}: { 
  article: HelpArticle; 
  onSelect: () => void;
}) {
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
          <Badge variant="outline" className="mt-2 text-[10px]">
            {categoryLabels[article.category]}
          </Badge>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function ArticleDetail({ 
  article, 
  onBack,
  onNavigate 
}: { 
  article: HelpArticle; 
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}) {
  return (
    <div className="space-y-4">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
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
                    <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-primary">{step.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {article.deepLink && onNavigate && (
        <Button 
          onClick={() => onNavigate(article.deepLink!)}
          className="w-full mt-4"
        >
          Ir para esta tela
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}

function FAQSection({ faqs }: { faqs: FAQItem[] }) {
  const groupedFaqs = useMemo(() => {
    const groups: Record<string, FAQItem[]> = {};
    faqs.forEach(faq => {
      if (!groups[faq.category]) {
        groups[faq.category] = [];
      }
      groups[faq.category].push(faq);
    });
    return groups;
  }, [faqs]);

  return (
    <div className="space-y-4">
      {Object.entries(groupedFaqs).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            {categoryLabels[category] || category}
          </h3>
          <Accordion type="single" collapsible className="space-y-2">
            {items.map((faq) => (
              <AccordionItem 
                key={faq.id} 
                value={faq.id}
                className="border rounded-xl px-4 bg-card"
              >
                <AccordionTrigger className="text-left text-sm hover:no-underline py-3">
                  {faq.question}
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

function SearchResults({ 
  query, 
  onClear,
  onSelectArticle 
}: { 
  query: string;
  onClear: () => void;
  onSelectArticle: (article: HelpArticle) => void;
}) {
  const results = useMemo(() => searchHelp(query), [query]);
  const hasResults = results.articles.length > 0 || results.faqs.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Resultados para "{query}"
        </p>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      </div>

      {!hasResults ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tente usar outras palavras-chave
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {results.articles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Tutoriais ({results.articles.length})
              </h3>
              <div className="space-y-2">
                {results.articles.map(article => (
                  <ArticleCard 
                    key={article.id} 
                    article={article} 
                    onSelect={() => onSelectArticle(article)}
                  />
                ))}
              </div>
            </div>
          )}

          {results.faqs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Perguntas Frequentes ({results.faqs.length})
              </h3>
              <FAQSection faqs={results.faqs} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function HelpCenterPage({ onBack, onNavigate }: HelpCenterPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [activeTab, setActiveTab] = useState("tutorials");

  const isSearching = searchQuery.trim().length > 0;

  const categorizedArticles = useMemo(() => {
    const groups: Record<string, HelpArticle[]> = {};
    helpArticles.forEach(article => {
      if (!groups[article.category]) {
        groups[article.category] = [];
      }
      groups[article.category].push(article);
    });
    return groups;
  }, []);

  const handleBackFromArticle = () => {
    setSelectedArticle(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Central de Ajuda</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Atualizado em {HELP_CENTER_VERSION}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
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
        </div>
      </header>

      <main className="container px-4 py-4">
        {isSearching ? (
          <SearchResults 
            query={searchQuery}
            onClear={() => setSearchQuery("")}
            onSelectArticle={setSelectedArticle}
          />
        ) : selectedArticle ? (
          <ArticleDetail 
            article={selectedArticle} 
            onBack={handleBackFromArticle}
            onNavigate={onNavigate}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="tutorials" className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Tutoriais
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                FAQ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tutorials" className="space-y-6">
              {Object.entries(categorizedArticles).map(([category, articles]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    {categoryLabels[category]}
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
              <FAQSection faqs={faqItems} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
