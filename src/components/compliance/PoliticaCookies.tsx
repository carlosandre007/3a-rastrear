import React from 'react';
import { Navbar } from '../../../Navbar';
import { Footer } from '../../../Footer';

export const PoliticaCookies: React.FC = () => {
  const handleResetConsent = () => {
    localStorage.removeItem('3a-consent-settings');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar isScrolled={true} />

      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b border-slate-800 pb-8 mb-12">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block mb-2">Conformidade Legal</span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Política de Cookies</h1>
            <p className="text-slate-400 mt-4 text-sm font-medium">Última atualização: 13 de julho de 2026</p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-slate-300 leading-relaxed font-medium">
            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                1. O que são Cookies?
              </h2>
              <p>
                Cookies são pequenos arquivos de texto armazenados no seu computador ou dispositivo móvel quando você visita determinados sites. Eles são amplamente utilizados para fazer os sites funcionarem ou melhorarem sua eficiência, além de fornecer informações analíticas aos proprietários do site.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                2. Como usamos os Cookies?
              </h2>
              <p>
                A 3A RASTREAR utiliza cookies para entender como os usuários interagem com nosso site, aprimorar a navegação, personalizar conteúdos e anúncios, além de garantir a correta segurança do sistema.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                3. Categorias de Cookies Utilizados
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    Cookies Necessários (Essenciais)
                  </h3>
                  <p className="text-sm text-slate-400">
                    Estes cookies são fundamentais para que o site funcione corretamente. Eles permitem a navegação básica, o acesso a áreas seguras do site (como a Área do Cliente) e a gravação de preferências fundamentais de segurança. Sem estes cookies, o site pode apresentar instabilidades e falhas críticas.
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Cookies de Análise (Estatísticos)
                  </h3>
                  <p className="text-sm text-slate-400">
                    Estes cookies nos ajudam a entender como os visitantes navegam pelas páginas do site (por exemplo, quais páginas são mais populares, o tempo gasto em cada uma e se ocorrem erros). Utilizamos o Google Analytics para coletar esses dados de forma agregada e anônima.
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Cookies de Marketing e Anúncios
                  </h3>
                  <p className="text-sm text-slate-400">
                    Utilizados para direcionar anúncios relevantes aos usuários no Google Search, Youtube e em sites parceiros, ajudando a medir a eficácia de nossas campanhas publicitárias do Google Ads.
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
                  <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Cookies de Personalização (Dados do Usuário)
                  </h3>
                  <p className="text-sm text-slate-400">
                    Servem para lembrar escolhas que você faz (como seu nome de usuário ou preferências de idioma) e fornecer recursos personalizados para uma experiência mais fluida em nosso ecossistema de rastreamento.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                4. Gerenciamento e Preferências de Cookies
              </h2>
              <p>
                Sob a LGPD, você tem o direito de escolher quais tipos de cookies deseja autorizar em nosso site. Você pode gerenciar ou redefinir suas configurações de consentimento a qualquer momento.
              </p>
              <div className="bg-slate-900 border border-primary/20 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
                <div>
                  <h4 className="text-white font-bold text-base mb-1">Quer alterar suas preferências atuais?</h4>
                  <p className="text-xs text-slate-400">Clique no botão ao lado para resetar suas decisões de cookies e abrir o banner de configurações.</p>
                </div>
                <button
                  onClick={handleResetConsent}
                  className="bg-primary hover:bg-yellow-500 text-secondary font-black px-6 py-3 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-sm whitespace-nowrap"
                >
                  REDEFINIR COOKIES
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                5. Alterações nesta Política
              </h2>
              <p>
                A 3A RASTREAR pode revisar esta Política de Cookies periodicamente para refletir mudanças tecnológicas ou legais. Recomendamos que você revise esta página regularmente para se manter informado.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
