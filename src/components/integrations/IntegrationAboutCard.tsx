import { ExternalLink, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface IntegrationAboutCardProps {
  title: string;
  description: string;
  features: string[];
  limitations?: string[];
  helpArticleId?: string;
  externalDocsUrl?: string;
}

export function IntegrationAboutCard({
  title,
  description,
  features,
  limitations,
  helpArticleId,
  externalDocsUrl,
}: IntegrationAboutCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Sobre o Serviço
        </CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        {/* Features */}
        <div>
          <h4 className="text-sm font-semibold mb-2">O que esta integração oferece:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {features.map((feature, i) => (
              <li key={i}>{feature}</li>
            ))}
          </ul>
        </div>

        {/* Limitations */}
        {limitations && limitations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Limitações e observações:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {limitations.map((limitation, i) => (
                <li key={i}>{limitation}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-2 pt-2 border-t">
          {helpArticleId && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/ajuda#${helpArticleId}`} target="_blank" rel="noopener noreferrer">
                <HelpCircle className="w-4 h-4 mr-2" />
                Central de Ajuda
              </a>
            </Button>
          )}
          {externalDocsUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={externalDocsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Documentação Externa
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
