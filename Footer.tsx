
import React from 'react';

export const Footer: React.FC = () => {
  const logoUrl = "/logo-final.jpg";

  return (
    <footer className="bg-slate-950 pt-20 pb-10 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg border border-slate-800">
              <img
                src={logoUrl}
                className="w-full h-full object-contain scale-110"
                alt="3A Rastrear"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-xl leading-none">3A <span className="text-primary">RASTREAR</span></span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Segurança Veicular</span>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Líder em tecnologia de rastreamento veicular e gestão de frotas com cobertura em todo território nacional. Proteção real para o seu patrimônio.
          </p>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Institucional</h4>
          <ul className="space-y-4 text-slate-400 text-sm font-medium">
            <li><a href="#" className="hover:text-primary transition-colors">Sobre a Empresa</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Trabalhe Conosco</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Blog de Segurança</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Política de Privacidade</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Nossas Soluções</h4>
          <ul className="space-y-4 text-slate-400 text-sm font-medium">
            <li><a href="#" className="hover:text-primary transition-colors">Para Pessoa Física</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Para Frotas Comerciais</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Telemetria Avançada</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Recuperação de Carga</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Atendimento</h4>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm font-medium">Comercial e Suporte Técnico:</p>
            <a
              href="https://wa.me/5581985938044"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-2xl font-black block hover:text-primary transition-colors"
            >
              81 98593-8044
            </a>
            <div className="flex gap-4 pt-4">
              <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-primary hover:text-secondary transition-all">
                <span className="material-icons-round text-lg">facebook</span>
              </a>
              <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-primary hover:text-secondary transition-all">
                <span className="material-icons-round text-lg">camera_alt</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-xs font-bold">
        <p>© 2024 3A Rastreamento Veicular. Todos os direitos reservados.</p>
        <p>Desenvolvido com tecnologia de ponta para sua segurança.</p>
      </div>
    </footer>
  );
};
