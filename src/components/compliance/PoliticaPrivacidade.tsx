import React from 'react';
import { Navbar } from '../../../Navbar';
import { Footer } from '../../../Footer';

export const PoliticaPrivacidade: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar isScrolled={true} />

      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b border-slate-800 pb-8 mb-12">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block mb-2">Conformidade Legal</span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Política de Privacidade</h1>
            <p className="text-slate-400 mt-4 text-sm font-medium">Última atualização: 13 de julho de 2026</p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-slate-300 leading-relaxed font-medium">
            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                1. Introdução
              </h2>
              <p>
                A <strong>3A RASTREAR</strong> está comprometida com a proteção e a privacidade dos dados pessoais de seus clientes, parceiros e usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações fornecidas e coletadas durante a prestação de nossos serviços de monitoramento inteligente e rastreamento veicular.
              </p>
              <p>
                Ao contratar nossos serviços ou acessar nossa plataforma, você declara estar ciente das práticas descritas nesta Política, estruturada em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                2. Quais dados coletamos?
              </h2>
              <p>
                Para prestar serviços de excelência na segurança de seu patrimônio, coletamos os seguintes tipos de informações:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li><strong>Dados Cadastrais:</strong> Nome completo, CPF/CNPJ, e-mail, telefone de contato, endereço residencial ou comercial e informações de pagamento.</li>
                <li><strong>Dados do Veículo:</strong> Marca, modelo, ano, cor, placa, chassi (VIN) e número do dispositivo rastreador instalado.</li>
                <li><strong>Dados de Telemetria e Localização (GPS):</strong> Coordenadas geográficas em tempo real, velocidade, rotas percorridas, paradas, ignição (ligada/desligada), alertas de segurança e histórico de deslocamento.</li>
                <li><strong>Dados de Acesso:</strong> Endereço IP, tipo de navegador, sistema operacional, páginas visitadas, datas e horários de acesso ao nosso painel ou aplicativo.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                3. Como utilizamos seus dados?
              </h2>
              <p>
                Os dados coletados são tratados estritamente para as seguintes finalidades:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li>Prestação de serviços de rastreamento, localização e bloqueio remoto do veículo em caso de emergência.</li>
                <li>Envio de alertas de segurança configurados pelo usuário (ex: excesso de velocidade, saída de cerca eletrônica).</li>
                <li>Gestão financeira, faturamento de mensalidades, cobrança e emissão de notas fiscais.</li>
                <li>Suporte técnico ao cliente e atendimento a chamados de emergência 24 horas.</li>
                <li>Cumprimento de obrigações legais, regulatórias ou ordens judiciais emitidas por autoridades de segurança pública.</li>
                <li>Melhoria contínua do aplicativo, site e das tecnologias de conectividade da nossa frota.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                4. Compartilhamento de dados
              </h2>
              <p>
                A 3A RASTREAR não vende nem aluga seus dados pessoais. O compartilhamento ocorre apenas de forma estrita nas seguintes circunstâncias:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li><strong>Provedores de Tecnologia:</strong> Empresas parceiras que fornecem infraestrutura de servidores em nuvem, conectividade móvel (chips M2M) e processamento de pagamentos.</li>
                <li><strong>Autoridades Policiais e Judiciais:</strong> Em caso de roubo, furto, sequestro ou requisição legal, para auxiliar na recuperação do veículo e garantir a segurança do titular.</li>
                <li><strong>Com seu Consentimento:</strong> Quando previamente autorizado de forma explícita por você para fins específicos.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                5. Segurança e Retenção dos Dados
              </h2>
              <p>
                Adotamos rígidas medidas técnicas e administrativas para proteger suas informações de acessos não autorizados, perdas ou alterações. Isso inclui criptografia de dados em trânsito e em repouso, firewalls, controle estrito de acesso físico e digital aos nossos servidores.
              </p>
              <p>
                Os dados de localização e rotas históricas são armazenados pelo período necessário para a prestação do serviço e cumprimento de obrigações legais, sendo arquivados ou anonimizados permanentemente após o término da relação contratual.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                6. Seus Direitos (LGPD)
              </h2>
              <p>
                Como titular dos dados pessoais, a LGPD garante a você os seguintes direitos mediante requisição ao nosso Encarregado de Proteção de Dados:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li>Confirmar a existência de tratamento e acessar seus dados cadastrais.</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                <li>Solicitar a eliminação dos dados desnecessários ou tratados em desconformidade.</li>
                <li>Revogar o consentimento a qualquer momento (o que pode impactar a prestação de determinados serviços de monitoramento).</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                7. Fale Conosco
              </h2>
              <p>
                Para exercer seus direitos ou tirar dúvidas sobre como tratamos seus dados pessoais, você pode entrar em contato conosco através do e-mail de atendimento <a href="mailto:contato@3arastrear.com.br" className="text-primary hover:underline">contato@3arastrear.com.br</a> ou em nossa seção <a href="/#contato" className="text-primary hover:underline">Fale Conosco</a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
