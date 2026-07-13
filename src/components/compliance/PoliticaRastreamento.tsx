import React from 'react';
import { Navbar } from '../../../Navbar';
import { Footer } from '../../../Footer';

export const PoliticaRastreamento: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar isScrolled={true} />

      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b border-slate-800 pb-8 mb-12">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block mb-2">Orientações Operacionais</span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Política de Rastreamento Veicular</h1>
            <p className="text-slate-400 mt-4 text-sm font-medium">Última atualização: 13 de julho de 2026</p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-slate-300 leading-relaxed font-medium">
            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                1. Propósito do Rastreamento Veicular
              </h2>
              <p>
                O objetivo fundamental do serviço de rastreamento veicular fornecido pela <strong>3A RASTREAR</strong> é a segurança patrimonial e a gestão de frotas. Os dispositivos instalados monitoram continuamente a posição geográfica do veículo, gerando dados cruciais para a proteção contra roubos ou furtos e para a otimização logística.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                2. Como funciona a tecnologia de rastreamento?
              </h2>
              <p>
                Nosso sistema utiliza uma tecnologia híbrida que combina:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li><strong>Mapeamento por GPS (Sistema de Posicionamento Global):</strong> Satélites determinam as coordenadas exatas do veículo com margem mínima de erro.</li>
                <li><strong>Conexão via Rede Celular GPRS (chips M2M multi-operadora):</strong> Transmite os dados de coordenadas geográficas e status da ignição em tempo real para os nossos servidores em nuvem.</li>
                <li><strong>Plataforma Web/App Inteligente:</strong> Processa os dados brutos e os exibe de forma simples em mapas dinâmicos na tela do cliente.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                3. Coleta e Finalidade dos Dados de Localização
              </h2>
              <p>
                Os dados de localização do veículo são transmitidos em tempo real sempre que a ignição estiver ativa ou de acordo com intervalos configurados quando o veículo estiver estacionado. Esses dados têm finalidades exclusivas de:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li>Exibir o histórico de rotas, paradas e velocidades no painel privado do cliente.</li>
                <li>Habilitar o envio de alertas em tempo real definidos pelo proprietário do veículo.</li>
                <li>Permitir ações de apoio à recuperação do veículo em situações emergenciais reportadas de roubo ou furto.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                4. Procedimento Padrão em caso de Roubo ou Furto
              </h2>
              <p>
                Em caso de sinistro envolvendo o veículo monitorado, o cliente deve seguir rigorosamente o seguinte protocolo de segurança:
              </p>
              <div className="bg-slate-900 border-l-4 border-primary p-6 rounded-r-xl space-y-4">
                <p className="text-sm font-bold text-white uppercase tracking-wider">Passo a Passo de Emergência:</p>
                <ol className="list-decimal pl-6 space-y-2 text-slate-300 text-sm">
                  <li><strong>Ligue para a Polícia (190):</strong> Registre a ocorrência imediatamente junto aos órgãos de segurança pública.</li>
                  <li><strong>Entre em contato com o suporte 3A RASTREAR:</strong> Acesse nosso canal de emergência pelo telefone/WhatsApp <strong>81 98593-8044</strong>.</li>
                  <li><strong>Forneça os detalhes:</strong> Informe seu nome, placa do veículo e local aproximado do evento. Nossa equipe monitorará a rota ativa do veículo para compartilhamento das coordenadas com as forças policiais competentes.</li>
                </ol>
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Atenção: Sob nenhuma circunstância o cliente deve tentar efetuar a abordagem ou a recuperação do veículo por conta própria, sob risco de severos danos à sua integridade física.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                5. Responsabilidades do Cliente e Teste de Equipamento
              </h2>
              <p>
                A eficácia técnica do sistema de rastreamento depende diretamente do bom estado físico do equipamento.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li>O cliente compromete-se a não tentar manipular ou alterar a instalação física do rastreador, sob pena de perda imediata da garantia técnica e quebra contratual.</li>
                <li><strong>Recomendação de Teste Mensal:</strong> Aconselhamos que o cliente verifique ao menos uma vez ao mês através da plataforma ou aplicativo se a localização do veículo está atualizando corretamente no mapa. Qualquer divergência de sinal deve ser notificada imediatamente ao nosso suporte técnico para agendamento de manutenção.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                6. Privacidade de Rotas e Segurança de Dados
              </h2>
              <p>
                A 3A RASTREAR zela pela privacidade de seus clientes. Os dados históricos de deslocamento veicular são confidenciais e protegidos por criptografia em nossos servidores. Colaboradores da empresa somente acessam os registros de rotas para fins de manutenção técnica solicitada pelo cliente ou em situações urgentes de apoio a sinistros.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
