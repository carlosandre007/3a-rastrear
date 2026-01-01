
import React from 'react';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-secondary">
      {/* Background Image with Dark Map Pattern */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2000" 
          alt="Fleet Background" 
          className="w-full h-full object-cover opacity-30 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/80 via-secondary/90 to-secondary"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 animate-bounce">
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
          <span className="text-white text-xs font-bold uppercase tracking-widest">Tecnologia Satelital de Ponta</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold text-white leading-tight mb-6">
          Rastreamento Veicular em <br />
          <span className="text-primary italic">Tempo Real</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Segurança e controle total para carros, motos, caminhões e ônibus. Proteja seu patrimônio com a plataforma mais rápida do Brasil.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="w-full sm:w-auto px-10 py-5 bg-primary hover:bg-yellow-500 text-secondary font-extrabold text-lg rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
            <span className="material-icons-round">login</span>
            Acessar Plataforma
          </button>
          <button className="w-full sm:w-auto px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-lg rounded-2xl transition-all flex items-center justify-center gap-3">
            <span className="material-icons-round text-primary">play_circle_filled</span>
            Solicitar Demonstração
          </button>
        </div>

        {/* Stats Row */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {[
            { value: "5k+", label: "Veículos Ativos" },
            { value: "99%", label: "Recuperação" },
            { value: "24/7", label: "Monitoramento" },
            { value: "< 10s", label: "Latência" }
          ].map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-black text-white mb-1">{stat.value}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
        <span className="material-icons-round text-white/40 text-4xl">expand_more</span>
      </div>
    </section>
  );
};
