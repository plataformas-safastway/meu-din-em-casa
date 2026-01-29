import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Política de Privacidade</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container px-6 py-8 max-w-2xl mx-auto">
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Versão: 1.4</p>
            <p className="text-muted-foreground text-sm">
              Última atualização: 29 de janeiro de 2026
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Sobre esta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta Política de Privacidade descreve, de forma detalhada, transparente e em 
              conformidade com a legislação brasileira, como a TRIPLE A, CONSULTORIA EM GESTÃO, 
              PLANEJAMENTO E TREINAMENTOS LTDA, CNPJ nº 31.487.532/0001-29, detentora da marca OIK, 
              realiza o tratamento de dados pessoais dos usuários do aplicativo OIK.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Base Legal</h2>
            <p className="text-muted-foreground leading-relaxed">
              O documento observa especialmente:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Lei nº 13.709/2018 (LGPD)</li>
              <li>Lei nº 12.965/2014 (Marco Civil da Internet)</li>
              <li>Lei nº 8.078/1990 (Código de Defesa do Consumidor)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Destinatários</h2>
            <p className="text-muted-foreground leading-relaxed">
              O OIK é destinado exclusivamente a pessoas físicas organizadas em núcleos familiares.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Bases de Tratamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              O tratamento de dados ocorre com base em:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Execução de contrato</li>
              <li>Obrigação legal</li>
              <li>Exercício regular de direitos</li>
              <li>Consentimento</li>
              <li>Legítimo interesse</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Medidas de Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              São adotadas medidas de segurança como:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Criptografia</li>
              <li>Controle de acesso</li>
              <li>Segregação de dados por família</li>
              <li>Logs de auditoria</li>
              <li>Princípio do menor privilégio</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Direitos do Titular</h2>
            <p className="text-muted-foreground leading-relaxed">
              O usuário pode exercer seus direitos de titular a qualquer momento por meio do canal interno:
            </p>
            <p className="text-muted-foreground leading-relaxed font-medium">
              Configurações → Privacidade e LGPD → Contato com o DPO
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os dados não são vendidos, podendo ser compartilhados apenas quando necessário para 
              operação, obrigação legal ou mediante consentimento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Inadimplência e Exclusão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em caso de inadimplência superior a 90 dias, os dados poderão ser excluídos de forma 
              definitiva, respeitadas obrigações legais.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Foro</h2>
            <p className="text-muted-foreground leading-relaxed">
              Foro eleito: São José – Santa Catarina.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
