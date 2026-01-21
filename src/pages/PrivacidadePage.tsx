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
          <p className="text-muted-foreground text-sm">
            Última atualização: Janeiro de 2026
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Sobre o Oik e Privacidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Oik é uma plataforma premium de inteligência financeira familiar. Entendemos 
              a importância da privacidade e estamos comprometidos em proteger as informações 
              pessoais e financeiras de vocês e suas famílias.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Coleta de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Coletamos informações que vocês fornecem diretamente ao usar o Oik, 
              incluindo dados de cadastro (nome, e-mail, telefone), informações financeiras inseridas 
              (transações, categorias, orçamentos) e dados de uso da plataforma.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Os dados financeiros são armazenados de forma segura e são utilizados 
              exclusivamente para fornecer as funcionalidades do Oik. Não vendemos, 
              alugamos ou compartilhamos suas informações pessoais com terceiros para fins 
              de marketing.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Uso das Informações</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos as informações coletadas para:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Fornecer, manter e melhorar o Oik</li>
              <li>Processar e exibir suas informações financeiras</li>
              <li>Gerar análises e insights personalizados com inteligência artificial</li>
              <li>Enviar comunicações relacionadas ao serviço</li>
              <li>Responder a solicitações e fornecer suporte</li>
              <li>Detectar e prevenir atividades fraudulentas</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Proteção e Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger 
              suas informações pessoais contra acesso não autorizado, alteração, divulgação 
              ou destruição. Isso inclui criptografia de dados, controles de acesso e 
              monitoramento contínuo de segurança.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Embora nos esforcemos para proteger suas informações, nenhum método de 
              transmissão pela Internet ou método de armazenamento eletrônico é 100% seguro. 
              Portanto, não podemos garantir segurança absoluta.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Direitos do Usuário (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), vocês têm direito a:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Confirmar a existência de tratamento de dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados</li>
              <li>Solicitar a portabilidade dos dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos suas informações pessoais pelo tempo necessário para fornecer os 
              serviços solicitados ou conforme exigido por lei. Quando vocês excluem sua 
              conta, removemos ou anonimizamos suas informações, exceto quando precisamos 
              retê-las para fins legais ou regulatórios.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Contato para Dúvidas</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se tiverem dúvidas sobre esta Política de Privacidade ou sobre como tratamos 
              suas informações pessoais, entrem em contato conosco através dos canais 
              disponíveis no Oik. Responderemos às solicitações dentro do prazo 
              estabelecido pela legislação aplicável.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos 
              sobre quaisquer alterações significativas através do Oik ou por e-mail. 
              Recomendamos que revisem esta política regularmente.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
