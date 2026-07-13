import React, { useState, useEffect } from 'react';

interface ConsentSettings {
  ad_storage: boolean;
  analytics_storage: boolean;
  ad_user_data: boolean;
  ad_personalization: boolean;
}

export const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConsentSettings>({
    ad_storage: false,
    analytics_storage: false,
    ad_user_data: false,
    ad_personalization: false,
  });

  useEffect(() => {
    // Verifica se já existem preferências salvas
    const savedConsent = localStorage.getItem('3a-consent-settings');
    if (!savedConsent) {
      // Exibe após 1.5s
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(savedConsent) as ConsentSettings;
        applyConsent(parsed);
      } catch (e) {
        setShowBanner(true);
      }
    }
  }, []);

  const applyConsent = (consent: ConsentSettings) => {
    // Atualiza o Google Consent Mode v2 via gtag
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: consent.ad_storage ? 'granted' : 'denied',
        analytics_storage: consent.analytics_storage ? 'granted' : 'denied',
        ad_user_data: consent.ad_user_data ? 'granted' : 'denied',
        ad_personalization: consent.ad_personalization ? 'granted' : 'denied',
      });
      console.log('Google Consent Mode v2 atualizado:', consent);
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      ad_storage: true,
      analytics_storage: true,
      ad_user_data: true,
      ad_personalization: true,
    };
    localStorage.setItem('3a-consent-settings', JSON.stringify(allAccepted));
    applyConsent(allAccepted);
    setShowBanner(false);
  };

  const handleDeclineAll = () => {
    const allDeclined = {
      ad_storage: false,
      analytics_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    };
    localStorage.setItem('3a-consent-settings', JSON.stringify(allDeclined));
    applyConsent(allDeclined);
    setShowBanner(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('3a-consent-settings', JSON.stringify(settings));
    applyConsent(settings);
    setShowBanner(false);
    setShowSettings(false);
  };

  const toggleSetting = (key: keyof ConsentSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-fade-in-up">
      <div className="max-w-4xl mx-auto bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 md:p-8 flex flex-col gap-6">
        
        {/* Banner Simples / Inicial */}
        {!showSettings ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-grow space-y-2">
              <h4 className="text-white font-black text-lg flex items-center gap-2">
                <span className="material-icons-round text-primary text-xl">cookie</span>
                Nós respeitamos sua privacidade
              </h4>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                Utilizamos cookies para melhorar sua experiência de navegação, oferecer anúncios personalizados e analisar nosso tráfego. Ao clicar em "Aceitar Todos", você concorda com o uso de cookies de acordo com nossa{' '}
                <a href="/politica-cookies" className="text-primary hover:underline font-bold">
                  Política de Cookies
                </a>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={() => setShowSettings(true)}
                className="flex-grow md:flex-grow-0 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-5 py-3 rounded-xl text-sm transition-all active:scale-95"
              >
                Configurar
              </button>
              <button
                onClick={handleDeclineAll}
                className="flex-grow md:flex-grow-0 border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold px-5 py-3 rounded-xl text-sm transition-all active:scale-95"
              >
                Recusar
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-grow md:flex-grow-0 bg-primary hover:bg-yellow-500 text-secondary font-black px-6 py-3 rounded-xl text-sm transition-all shadow-md active:scale-95"
              >
                Aceitar Todos
              </button>
            </div>
          </div>
        ) : (
          /* Painel de Configurações Granulares (LGPD/Consent Mode v2) */
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <h4 className="text-white font-black text-lg flex items-center gap-2">
                <span className="material-icons-round text-primary text-xl font-bold">settings</span>
                Preferências de Cookies
              </h4>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Essenciais */}
              <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white block">Cookies Necessários</span>
                  <span className="text-xs text-slate-400 block leading-normal">
                    Essenciais para a segurança e funcionalidade básica do site. Não podem ser desativados.
                  </span>
                </div>
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    disabled
                    checked
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-accent rounded-full opacity-60 flex items-center px-1">
                    <div className="w-4 h-4 bg-slate-950 rounded-full translate-x-4 transition-transform"></div>
                  </div>
                </div>
              </div>

              {/* Analíticos */}
              <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white block">Cookies de Análise</span>
                  <span className="text-xs text-slate-400 block leading-normal">
                    Medem estatísticas de visitas de forma anônima com o Google Analytics para podermos otimizar o site.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('analytics_storage')}
                  className="relative shrink-0 focus:outline-none"
                >
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${settings.analytics_storage ? 'bg-primary' : 'bg-slate-800'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full transition-transform ${settings.analytics_storage ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                </button>
              </div>

              {/* Marketing */}
              <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white block">Cookies de Marketing</span>
                  <span className="text-xs text-slate-400 block leading-normal">
                    Usados para personalizar e mensurar o desempenho de anúncios do Google Ads.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('ad_storage')}
                  className="relative shrink-0 focus:outline-none"
                >
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${settings.ad_storage ? 'bg-primary' : 'bg-slate-800'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full transition-transform ${settings.ad_storage ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                </button>
              </div>

              {/* Personalização / Dados do Usuário */}
              <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white block">Dados de Personalização</span>
                  <span className="text-xs text-slate-400 block leading-normal">
                    Permite enviar dados de consentimento de publicidade do usuário ao Google (Consent Mode v2).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleSetting('ad_user_data');
                    toggleSetting('ad_personalization');
                  }}
                  className="relative shrink-0 focus:outline-none"
                >
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${(settings.ad_user_data || settings.ad_personalization) ? 'bg-primary' : 'bg-slate-800'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full transition-transform ${(settings.ad_user_data || settings.ad_personalization) ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                </button>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="border border-slate-800 text-slate-400 font-bold px-5 py-3 rounded-xl text-sm transition-all active:scale-95"
              >
                Voltar
              </button>
              <button
                onClick={handleSaveSettings}
                className="bg-primary hover:bg-yellow-500 text-secondary font-black px-6 py-3 rounded-xl text-sm transition-all shadow-md active:scale-95"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
