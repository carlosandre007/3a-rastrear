import React from 'react';
import { Navbar } from '../../../Navbar';
import { Footer } from '../../../Footer';

export const TermosUso: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar isScrolled={true} />

      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b border-slate-800 pb-8 mb-12">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block mb-2">Termos e Condições</span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Termos de Uso</h1>
            <p className="text-slate-400 mt-4 text-sm font-medium">Última atualização: 13 de julho de 2026</p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-slate-300 leading-relaxed font-medium">
            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                1. Aceitação dos Termos
              </h2>
              <p>
                Ao acessar e utilizar os serviços da <strong>3A RASTREAR</strong>, incluindo este website, nosso aplicativo móvel e nossa plataforma de rastreamento veicular, você concorda expressamente em cumprir e vincular-se a estes Termos de Uso. Se você não concordar com qualquer termo aqui descrito, orientamos que suspenda a utilização dos nossos serviços imediatamente.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                2. Descrição dos Serviços
              </h2>
              <p>
                A 3A RASTREAR é uma empresa especializada em monitoramento inteligente, rastreamento veicular e gestão de frotas. Nossos serviços consistem na instalação de hardware (rastreador) no veículo do cliente e na disponibilização de software (via web e app) para visualização de localização, telemetria básica e recepção de alertas.
              </p>
              <p>
                <strong>IMPORTANTE:</strong> O serviço de rastreamento prestado pela 3A RASTREAR constitui ferramenta tecnológica voltada a mitigar riscos e auxiliar na localização do patrimônio. Nossos serviços <strong>NÃO SUBSTITUEM CONTRATO DE SEGURO VEICULAR</strong>. A 3A RASTREAR não se responsabiliza por roubo, furto, colisão, avarias, incêndio ou lucros cessantes decorrentes de incidentes envolvendo o veículo do cliente.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                3. Cadastro e Segurança da Conta
              </h2>
              <p>
                Para acessar a Área do Cliente ou o aplicativo de rastreamento, o usuário deverá criar uma conta com dados verdadeiros, exatos e atualizados.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li>O cliente é o único responsável pela guarda e confidencialidade de sua senha de acesso.</li>
                <li>Qualquer atividade realizada sob suas credenciais de login será considerada de autoria e responsabilidade do cliente.</li>
                <li>Caso identifique qualquer uso não autorizado de sua conta, o cliente deve notificar a 3A RASTREAR imediatamente.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                4. Utilização Adequada do Sistema
              </h2>
              <p>
                O cliente concorda em utilizar a plataforma de forma lícita, ética e dentro dos limites acordados no contrato de prestação de serviços. Fica expressamente vedado:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-400">
                <li>Tentar decodificar, descompilar, realizar engenharia reversa ou violar a segurança da plataforma de rastreamento.</li>
                <li>Utilizar o rastreador para fins ilícitos ou para monitorar terceiros sem a devida autorização legal (invasão de privacidade).</li>
                <li>Interferir intencionalmente no envio ou recepção de sinal do rastreador (utilização de bloqueadores de sinal/jammers).</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                5. Disponibilidade do Sistema e Conectividade
              </h2>
              <p>
                Os rastreadores dependem de tecnologias de terceiros para seu pleno funcionamento, especificamente da rede de telefonia celular (sinal GPRS/GSM) e do sistema de posicionamento global (satélites GPS). O cliente reconhece que a precisão da localização e a transmissão de dados podem sofrer interferências ou interrupções temporárias em locais sem cobertura (como subsolos, túneis, garagens fechadas ou áreas de sombra de sinal de telefonia). A 3A RASTREAR não se responsabiliza por eventuais atrasos ou falhas na transmissão decorrentes dessas limitações tecnológicas de cobertura de operadoras de telefonia.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                6. Cancelamento e Penalidades
              </h2>
              <p>
                O descumprimento de qualquer obrigação presente nestes Termos ou nos contratos de prestação de serviços individuais poderá acarretar a suspensão imediata ou cancelamento definitivo das credenciais de acesso do usuário, sem prejuízo das cobranças financeiras devidas e das medidas legais cabíveis.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                7. Foro de Eleição
              </h2>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca do Recife, Estado de Pernambuco, como competente para dirimir quaisquer controvérsias oriundas destes Termos, renunciando a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
