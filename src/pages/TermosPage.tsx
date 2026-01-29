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
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Versão: 1.7</p>
            <p className="text-muted-foreground text-sm">
              Última atualização: 29 de janeiro de 2026
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Identificação, Titularidade e Escopo</h2>
            <p className="text-muted-foreground leading-relaxed">
              O aplicativo OIK é uma plataforma digital de organização e educação financeira familiar, 
              de titularidade exclusiva da TRIPLE A, CONSULTORIA EM GESTÃO, PLANEJAMENTO E TREINAMENTOS LTDA, 
              pessoa jurídica de direito privado, inscrita no CNPJ sob nº 31.487.532/0001-29, doravante 
              denominada "TRIPLE A", detentora integral da marca, do software, do código-fonte, da 
              infraestrutura tecnológica e de todos os direitos relacionados ao OIK.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O OIK é destinado exclusivamente a pessoas físicas, organizadas em núcleos familiares, 
              sendo expressamente vedada sua utilização por pessoas jurídicas.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Aceitação Expressa e Natureza Jurídica</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar, cadastrar-se, contratar qualquer plano, navegar ou utilizar o OIK, 
              o usuário declara, de forma livre, expressa, informada e inequívoca, que:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Leu e compreendeu integralmente estes Termos de Uso;</li>
              <li>Concorda com todas as cláusulas aqui previstas, sem ressalvas;</li>
              <li>Reconhece que estes Termos constituem contrato de adesão, juridicamente vinculante, 
                nos termos do Código Civil, do Código de Defesa do Consumidor (Lei nº 8.078/1990) e 
                do Marco Civil da Internet (Lei nº 12.965/2014).</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              A utilização do aplicativo implica aceitação plena e irrestrita destes Termos. 
              Caso o usuário não concorde, deverá abster-se imediatamente de utilizar a plataforma.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Natureza do Serviço e Limitação de Escopo</h2>
            <p className="text-muted-foreground leading-relaxed">
              O OIK consiste em ferramenta tecnológica de apoio, voltada à organização de informações 
              financeiras, visualização de dados, projeções e educação financeira básica.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O OIK não presta, em nenhuma hipótese:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Consultoria financeira personalizada;</li>
              <li>Assessoria ou recomendação de investimentos;</li>
              <li>Planejamento patrimonial individualizado;</li>
              <li>Serviços contábeis, fiscais ou jurídicos;</li>
              <li>Qualquer forma de aconselhamento profissional especializado.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Nenhuma funcionalidade, conteúdo, simulação ou informação disponibilizada no OIK 
              deverá ser interpretada como recomendação técnica, parecer profissional ou promessa de resultado.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Inteligência Artificial (IA) – Cláusula de Isenção Total</h2>
            <p className="text-muted-foreground leading-relaxed">
              O OIK poderá utilizar recursos de inteligência artificial, algoritmos e automações 
              para fins de organização de dados, simulações, análises genéricas e apoio educacional.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O usuário declara ciência inequívoca de que:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>A inteligência artificial não possui compreensão integral do contexto pessoal, 
                patrimonial ou emocional do usuário;</li>
              <li>As respostas e sugestões geradas são automatizadas, genéricas e não personalizadas;</li>
              <li>A inteligência artificial não substitui profissionais humanos qualificados.</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6">4.1 Isenção absoluta de responsabilidade</h3>
            <p className="text-muted-foreground leading-relaxed">
              A TRIPLE A não se responsabiliza, em nenhuma hipótese, por:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Decisões financeiras tomadas com base em respostas, sugestões ou simulações geradas por IA;</li>
              <li>Interpretação equivocada ou uso indevido de conteúdos automatizados;</li>
              <li>Conversas, mensagens, diagnósticos ou insights produzidos por IA;</li>
              <li>Danos diretos, indiretos, emergentes, lucros cessantes ou perdas patrimoniais 
                decorrentes do uso da IA.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              O usuário declara estar ciente de que toda e qualquer decisão financeira relevante 
              deve ser previamente analisada com profissionais qualificados, como economistas, 
              planejadores financeiros, contadores ou advogados.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Conta Familiar, Planos e Responsabilidades</h2>
            <p className="text-muted-foreground leading-relaxed">
              O OIK opera sob o conceito de conta familiar.
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>A conta é criada por um responsável familiar;</li>
              <li>O número de usuários vinculados à conta varia conforme o plano contratado;</li>
              <li>O responsável familiar é corresponsável pelos dados inseridos pelos membros vinculados.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              A TRIPLE A não se responsabiliza por conflitos internos, divergências de informações 
              ou uso indevido entre membros de uma mesma família.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Planos, Contratação e Cobrança</h2>
            <p className="text-muted-foreground leading-relaxed">
              O OIK opera por meio de planos de assinatura, cujas condições comerciais, funcionalidades, 
              limites e valores são informados no momento da contratação.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              A TRIPLE A reserva-se o direito de:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Criar, alterar ou descontinuar planos;</li>
              <li>Ajustar valores e condições comerciais, mediante comunicação prévia;</li>
              <li>Definir limites de uso conforme o plano contratado.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Direito de Arrependimento e Reembolso</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos termos do art. 49 do Código de Defesa do Consumidor, o usuário poderá exercer 
              o direito de arrependimento no prazo de 7 (sete) dias corridos, contados a partir 
              da primeira contratação do plano.
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">7.1 Condições do reembolso</h3>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>O reembolso será integral apenas quando solicitado dentro do prazo legal;</li>
              <li>O direito de arrependimento não se aplica a renovações automáticas;</li>
              <li>Após o prazo legal, não haverá reembolso proporcional ou integral de mensalidades já cobradas.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Inadimplência, Bloqueio e Rescisão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em caso de inadimplemento:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Após 7 (sete) dias de atraso: poderá haver limitação parcial das funcionalidades;</li>
              <li>Após 15 (quinze) dias: bloqueio total do acesso à plataforma;</li>
              <li>Após 90 (noventa) dias: encerramento definitivo da conta e exclusão irreversível 
                dos dados, ressalvados os prazos legais de retenção.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              O usuário declara ciência de que a exclusão de dados após esse prazo é definitiva e irreversível.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Na máxima extensão permitida pela legislação aplicável, a responsabilidade total da 
              TRIPLE A, por quaisquer danos comprovadamente causados ao usuário, fica limitada ao 
              valor efetivamente pago pelo usuário nos últimos 12 (doze) meses anteriores ao evento 
              que deu causa à reclamação.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Em nenhuma hipótese a TRIPLE A será responsável por danos indiretos, lucros cessantes, 
              perda de chance ou danos morais presumidos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Indisponibilidade e Manutenção</h2>
            <p className="text-muted-foreground leading-relaxed">
              A TRIPLE A não garante que o OIK estará disponível de forma ininterrupta ou isenta de erros.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O aplicativo poderá sofrer:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Manutenções programadas;</li>
              <li>Atualizações;</li>
              <li>Interrupções técnicas;</li>
              <li>Falhas decorrentes de fatores externos.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Tais ocorrências não configuram descumprimento contratual ou direito a indenização.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todos os direitos relativos ao OIK, incluindo software, layout, marcas, textos, 
              conteúdos e funcionalidades, pertencem exclusivamente à TRIPLE A, sendo vedada qualquer 
              reprodução, engenharia reversa, distribuição ou exploração sem autorização expressa.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">12. Suspensão e Encerramento</h2>
            <p className="text-muted-foreground leading-relaxed">
              A TRIPLE A poderá suspender ou encerrar o acesso do usuário, a seu exclusivo critério, em caso de:
            </p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Violação destes Termos;</li>
              <li>Uso indevido da plataforma;</li>
              <li>Tentativa de fraude;</li>
              <li>Inadimplência prolongada.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">13. Foro</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fica eleito o foro da comarca de São José, Estado de Santa Catarina, para dirimir 
              quaisquer controvérsias oriundas destes Termos de Uso, com renúncia expressa a qualquer 
              outro, por mais privilegiado que seja.
            </p>
            <p className="text-muted-foreground leading-relaxed font-medium">
              Ao utilizar o OIK, o usuário declara estar ciente de que toda decisão financeira é de 
              sua exclusiva responsabilidade, sendo o aplicativo apenas uma ferramenta de apoio.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
