
import React, { useState, useEffect } from 'react';

export const DashboardSim: React.FC = () => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [speed, setSpeed] = useState(42);
  const [rotation, setRotation] = useState(0);

  // Simulação de movimento do veículo
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const newSpeed = prev + delta;
        return Math.max(35, Math.min(65, newSpeed));
      });

      setPosition(prev => {
        // Movimento circular/errático simulado
        const time = Date.now() / 2000;
        const newX = 50 + Math.cos(time) * 20;
        const newY = 50 + Math.sin(time * 0.8) * 15;
        
        // Calcular rotação baseada na direção do movimento
        const angle = Math.atan2(newY - prev.y, newX - prev.x) * (180 / Math.PI);
        setRotation(angle + 90); // +90 para alinhar o ícone do carro

        return { x: newX, y: newY };
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 px-6 bg-secondary overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-primary font-bold uppercase tracking-widest text-xs">Área Restrita</span>
          <h2 className="text-3xl md:text-4xl font-black text-white mt-2 mb-6">Plataforma em Tempo Real</h2>
          <p className="text-slate-400 max-w-2xl mx-auto font-medium">Veja como é fácil gerenciar seus veículos através da nossa interface moderna e tecnológica.</p>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-4 md:p-8 shadow-2xl border border-white/5 relative max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Map Area */}
            <div className="flex-[2] bg-[#1a1a1a] rounded-3xl min-h-[450px] relative overflow-hidden border border-white/5 shadow-inner">
              {/* Grid Background Pattern */}
              <div className="absolute inset-0 opacity-10" style={{ 
                backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', 
                backgroundSize: '40px 40px' 
              }}></div>
              
              {/* Simulated "Roads" Pattern */}
              <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,20 L100,20 M0,50 L100,50 M0,80 L100,80 M20,0 L20,100 M50,0 L50,100 M80,0 L80,100" stroke="white" strokeWidth="0.5" fill="none" />
              </svg>

              {/* Vehicle Marker */}
              <div 
                className="absolute transition-all duration-300 ease-linear"
                style={{ 
                  left: `${position.x}%`, 
                  top: `${position.y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`
                }}
              >
                <div className="relative">
                  {/* Ping Effect */}
                  <div className="absolute inset-0 w-14 h-14 -ml-1 -mt-1 bg-primary/20 rounded-full animate-ping"></div>
                  
                  {/* Car Icon Container */}
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-secondary shadow-[0_0_25px_rgba(251,191,36,0.5)] border-2 border-white relative z-10">
                    <span className="material-icons-round text-2xl">navigation</span>
                  </div>
                  
                  {/* Directional Indicator */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white opacity-80"></div>
                </div>
              </div>

              {/* Map Controls Floating */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center text-white hover:bg-white/20">
                  <span className="material-icons-round">add</span>
                </button>
                <button className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center text-white hover:bg-white/20">
                  <span className="material-icons-round">remove</span>
                </button>
              </div>

              <div className="absolute bottom-4 left-4 glass p-3 rounded-2xl flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse shadow-[0_0_10px_#10B981]"></div>
                <span className="text-white text-[10px] font-black uppercase tracking-widest">SINAL GPS ATIVO (HD)</span>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-white font-black text-xl">Fiat Toro</h3>
                    <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Placa: RAA-3A24</p>
                  </div>
                  <span className="text-[10px] bg-accent/20 text-accent font-black px-3 py-1.5 rounded-full uppercase border border-accent/30">Online</span>
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-center group">
                    <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                      <span className="material-icons-round text-xs opacity-50">vibration</span> Status
                    </span>
                    <span className="text-emerald-400 font-black text-sm">Motor Ligado</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                      <span className="material-icons-round text-xs opacity-50">speed</span> Velocidade
                    </span>
                    <span className="text-white font-black text-lg">{speed} <span className="text-[10px] text-slate-500">km/h</span></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                      <span className="material-icons-round text-xs opacity-50">update</span> Atualização
                    </span>
                    <span className="text-white font-black text-sm">Agora mesmo</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                      <span className="material-icons-round text-xs opacity-50">battery_charging_full</span> Bateria
                    </span>
                    <span className="text-white font-black text-sm">12.8 V</span>
                  </div>
                </div>

                <div className="mt-10 flex flex-col gap-3">
                  <button className="w-full bg-primary text-secondary py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all shadow-lg shadow-primary/10">
                    <span className="material-icons-round">map</span> Ver no Mapa Full HD
                  </button>
                  <button className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2 border border-red-500/20 hover:bg-red-500/20 transition-all group">
                    <span className="material-icons-round group-hover:scale-110 transition-transform">power_settings_new</span> Bloquear Veículo
                  </button>
                </div>
              </div>

              <div className="bg-white/5 rounded-3xl p-5 border border-white/10 flex items-center gap-4 hover:bg-white/[0.08] transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-secondary transition-all">
                  <span className="material-icons-round">history</span>
                </div>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-wider">Histórico Rápido</p>
                  <p className="text-slate-500 text-[10px] font-bold">Últimos 12 trajetos disponíveis</p>
                </div>
                <span className="material-icons-round text-slate-600 ml-auto group-hover:text-white transition-colors">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
