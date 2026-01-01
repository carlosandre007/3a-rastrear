
import React from 'react';

export const CTASection: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-white relative overflow-hidden">
      <div className="max-w-5xl mx-auto bg-secondary rounded-[3rem] p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 blur-[100px] -ml-32 -mb-32"></div>

        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Proteja seu veículo agora mesmo</h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-10 text-lg">
            Junte-se a milhares de clientes que confiam na 3A Rastrear para proteger o que mais importa.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-12 py-5 bg-primary text-secondary font-black text-xl rounded-2xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
              Contratar Rastreamento
            </button>
            <a 
              href="https://wa.me/5581985938044" 
              className="w-full sm:w-auto px-12 py-5 bg-transparent border-2 border-emerald-500 text-emerald-500 font-bold text-xl rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-500/10 transition-colors"
            >
              <span className="material-icons-round">whatsapp</span>
              Falar com Especialista
            </a>
          </div>

          <p className="mt-8 text-slate-500 text-sm font-bold flex items-center justify-center gap-2">
            <span className="material-icons-round text-accent">verified_user</span>
            Dados 100% Protegidos • Sem Taxa de Adesão
          </p>
        </div>
      </div>
    </section>
  );
};
