import { ExternalLink, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Ebook } from "@/hooks/useEbooks";

interface EbookCardProps {
  ebook: Ebook;
}

export function EbookCard({ ebook }: EbookCardProps) {
  const handleCTAClick = () => {
    window.open(ebook.cta_link, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative aspect-[3/4] bg-muted">
        {ebook.cover_url ? (
          <img
            src={ebook.cover_url}
            alt={ebook.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="w-16 h-16 text-primary/40" />
          </div>
        )}
        {ebook.theme && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 text-xs"
          >
            {ebook.theme}
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-lg leading-tight line-clamp-2">
          {ebook.title}
        </h3>
        {ebook.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {ebook.description}
          </p>
        )}
        <Button
          onClick={handleCTAClick}
          className="w-full gap-2"
          size="sm"
        >
          {ebook.cta_text}
          <ExternalLink className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
