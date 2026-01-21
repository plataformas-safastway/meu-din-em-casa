import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TermosPage() {
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
            <h1 className="text-lg font-semibold">Termos de Uso</h1>
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
            <h2 className="text-xl font-semibold text-foreground">1. Sobre o Oik</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Oik é uma plataforma premium de inteligência financeira familiar, desenvolvida 
              para simplificar o controle financeiro da casa. Utilizamos inteligência artificial 
              para acompanhar o dia a dia financeiro, integrar dados, gerar relatórios e 
              promover educação financeira, trazendo harmonia ao lar e eliminando a ansiedade 
              causada pelo dinheiro.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Uso da Plataforma</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e utilizar o Oik, vocês concordam em cumprir e estar vinculados 
              aos seguintes termos e condições de uso. A plataforma destina-se ao uso pessoal e 
              familiar para organização financeira, não devendo ser utilizada para fins comerciais 
              sem autorização prévia.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O acesso ao Oik é permitido temporariamente, e reservamo-nos o direito de 
              retirar ou alterar o serviço que fornecemos sem aviso prévio. Não seremos 
              responsáveis se, por qualquer motivo, a plataforma estiver indisponível a qualquer 
              momento ou por qualquer período.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Responsabilidade do Usuário</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vocês são responsáveis por manter a confidencialidade de suas credenciais de acesso 
              e por todas as atividades que ocorram sob sua conta. Comprometem-se a notificar 
              imediatamente sobre qualquer uso não autorizado da conta ou qualquer outra violação 
              de segurança.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Os dados financeiros inseridos no Oik são de inteira responsabilidade do 
              usuário. Recomendamos que mantenham registros próprios e não utilizem a plataforma 
              como única fonte de informação financeira.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Inteligência Artificial</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Oik utiliza inteligência artificial para análise de dados, categorização 
              automática, geração de insights e relatórios. As sugestões e análises fornecidas 
              pela IA são apenas para fins informativos e não constituem aconselhamento 
              financeiro profissional.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Limitações de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Oik é fornecido "como está" e "conforme disponível". Não garantimos que a 
              plataforma será ininterrupta, oportuna, segura ou livre de erros. Os cálculos e 
              informações apresentados são apenas para fins informativos e não constituem 
              aconselhamento financeiro profissional.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Em nenhuma circunstância seremos responsáveis por quaisquer danos diretos, 
              indiretos, incidentais, especiais ou consequentes resultantes do uso ou da 
              incapacidade de usar o Oik.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo incluído no Oik, como textos, gráficos, logotipos, ícones, 
              imagens e software, é de nossa propriedade ou de nossos fornecedores de conteúdo e 
              está protegido pelas leis de direitos autorais brasileiras e internacionais. A 
              marca Oik e seu símbolo são propriedade exclusiva da empresa.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações 
              entrarão em vigor imediatamente após sua publicação na plataforma. O uso continuado 
              do Oik após quaisquer alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para questões sobre estes Termos de Uso, entrem em contato conosco através dos 
              canais disponíveis na plataforma Oik.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
