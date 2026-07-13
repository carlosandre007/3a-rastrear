
import React from 'react';

const features = [
  { title: "Geofence (Cerca Virtual)", desc: "Seja notificado se o veículo sair de uma área definida." },
  { title: "Monitoramento 24h", desc: "Central de suporte ativa para emergências a qualquer hora." },
  { title: "Relatórios de Ignição", desc: "Saiba exatamente quando o motor foi ligado ou desligado." },
  { title: "Acesso Multiplataforma", desc: "Use no smartphone, tablet ou diretamente pelo seu navegador." },
  { title: "Velocidade em Tempo Real", desc: "Acompanhe a velocidade atual e receba alertas de excesso." },
  { title: "Instalação Discreta", desc: "Equipamentos ocultos que não interferem na garantia de fábrica." }
];

export const FeaturesList: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
        <div className="flex-1 order-2 lg:order-1">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-secondary mb-6 leading-tight">
              Funcionalidades Pensadas para a sua <span className="text-primary">Tranquilidade</span>
            </h2>
            <p className="text-slate-500 font-medium">
              Nossa plataforma foi desenvolvida com foco na experiência do usuário, oferecendo controles complexos de forma simples e intuitiva.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <span className="material-icons-round text-sm">check</span>
                </div>
                <div>
                  <h4 className="font-bold text-secondary mb-1">{f.title}</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-12 px-8 py-4 bg-secondary text-white font-bold rounded-2xl hover:bg-slate-900 transition-colors shadow-xl">
            Conhecer Todas as Funções
          </button>
        </div>

        <div className="flex-1 order-1 lg:order-2 relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full -z-10 animate-pulse"></div>
          <img 
            src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800" 
            alt="Dashboard Mobile Preview" 
            className="rounded-[3rem] shadow-2xl border-8 border-slate-900 mx-auto max-w-[320px]"
          />
        </div>
      </div>
    </section>
  );
};
