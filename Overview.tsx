
import React from 'react';

const cards = [
  {
    title: "Localização Exata",
    desc: "Saiba onde seu veículo está a qualquer momento com precisão de metros.",
    icon: "my_location",
    color: "bg-blue-50 text-blue-600"
  },
  {
    title: "Bloqueio Remoto",
    desc: "Imobilize o veículo instantaneamente pelo app em caso de roubo ou furto.",
    icon: "lock",
    color: "bg-red-50 text-red-600"
  },
  {
    title: "Histórico de Rotas",
    desc: "Acesse o relatório completo de trajetos percorridos nos últimos 90 dias.",
    icon: "timeline",
    color: "bg-emerald-50 text-emerald-600"
  },
  {
    title: "Alertas Inteligentes",
    desc: "Notificações em tempo real de ignição, excesso de velocidade e área restrita.",
    icon: "notifications_active",
    color: "bg-amber-50 text-amber-600"
  }
];

export const Overview: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-secondary mb-4">Monitoramento Sem Limites</h2>
          <div className="w-20 h-1.5 bg-primary mx-auto rounded-full mb-6"></div>
          <p className="text-slate-500 max-w-xl mx-auto font-medium">
            Nossa plataforma reúne o que há de mais moderno em geolocalização e segurança preventiva.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cards.map((card, idx) => (
            <div key={idx} className="p-8 rounded-3xl border border-slate-100 bg-white hover:shadow-2xl hover:shadow-secondary/10 hover:-translate-y-2 transition-all duration-300 group">
              <div className={`w-16 h-16 rounded-2xl ${card.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <span className="material-icons-round text-3xl">{card.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-secondary mb-3">{card.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
