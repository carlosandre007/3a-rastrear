
import React from 'react';

const vehicles = [
  { name: "Carros", desc: "Segurança total para seu veículo pessoal ou frota executiva.", icon: "directions_car", img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400" },
  { name: "Motos", desc: "Rastreadores ultracompactos com economia inteligente de bateria.", icon: "two_wheeler", img: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=400" },
  { name: "Caminhões", desc: "Gestão logística avançada, telemetria e controle de combustível.", icon: "local_shipping", img: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=400" },
  { name: "Ônibus", desc: "Monitoramento de rotas urbanas e rodoviárias com precisão.", icon: "directions_bus", img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=400" }
];

export const VehicleGrid: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-black text-secondary mb-4">Soluções para todos os Veículos</h2>
            <p className="text-slate-500 font-medium">Equipamentos específicos homologados para cada tipo de categoria, garantindo a melhor performance de sinal.</p>
          </div>
          <button className="text-secondary font-bold flex items-center gap-2 hover:text-primary transition-colors">
            Ver todas as especificações <span className="material-icons-round">east</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {vehicles.map((v, idx) => (
            <div key={idx} className="relative group overflow-hidden rounded-3xl h-[400px]">
              <img src={v.img} alt={v.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-secondary mb-4 shadow-xl">
                  <span className="material-icons-round">{v.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{v.name}</h3>
                <p className="text-slate-200 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">
                  {v.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
