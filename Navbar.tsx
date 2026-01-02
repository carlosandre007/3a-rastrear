
import React, { useState } from 'react';

interface NavbarProps {
  isScrolled: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isScrolled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPriceTip, setShowPriceTip] = useState(false);
  const logoUrl = "/logo-final.jpg";

  const handlePlanosClick = () => {
    setShowPriceTip(true);
    setTimeout(() => setShowPriceTip(false), 3500);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-14 w-auto bg-white rounded-xl flex items-center justify-center p-1 shadow-md border border-slate-100 overflow-hidden">
            <img
              src={logoUrl}
              alt="3A Rastrear Logo"
              className="h-full w-full object-contain scale-110"
            />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className={`text-xl font-black tracking-tighter leading-none ${isScrolled ? 'text-secondary' : 'text-white'}`}>
              3A <span className="text-primary">RASTREAR</span>
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${isScrolled ? 'text-slate-400' : 'text-slate-300 opacity-80'}`}>
              Monitoramento Inteligente
            </span>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className={`font-bold text-sm hover:text-primary transition-colors ${isScrolled ? 'text-secondary' : 'text-white'}`}>Home</a>
          <a href="#" className={`font-bold text-sm hover:text-primary transition-colors ${isScrolled ? 'text-secondary' : 'text-white'}`}>Funcionalidades</a>
          <a href="#" className={`font-bold text-sm hover:text-primary transition-colors ${isScrolled ? 'text-secondary' : 'text-white'}`}>Frota</a>

          <button
            onClick={handlePlanosClick}
            className={`relative font-bold text-sm hover:text-primary transition-colors flex flex-col items-center ${isScrolled ? 'text-secondary' : 'text-white'}`}
          >
            Planos
            {showPriceTip && (
              <div className="absolute top-full mt-2 bg-primary text-secondary px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap shadow-2xl border border-yellow-500 animate-bounce z-50">
                A PARTIR DE R$ 29,90
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-l border-t border-yellow-500"></div>
              </div>
            )}
          </button>

          {/* Persistent WhatsApp in Navbar */}
          <a
            href="https://wa.me/5581985938044"
            className={`hidden lg:flex items-center gap-2 border-l pl-8 ml-2 ${isScrolled ? 'border-slate-200 text-secondary' : 'border-white/20 text-white'}`}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" className="w-5 h-5" />
            <span className="text-sm font-black">81 98593-8044</span>
          </a>

          <button className="bg-primary hover:bg-yellow-500 text-secondary px-6 py-2.5 rounded-xl font-black text-sm shadow-lg transition-all active:scale-95">
            ÁREA DO CLIENTE
          </button>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-primary">
          <span className="material-icons-round text-3xl">{isOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-2xl p-6 flex flex-col gap-4 border-t animate-fade-in-down">
          <a href="#" className="font-bold text-secondary py-2 border-b border-slate-50">Home</a>
          <a href="#" className="font-bold text-secondary py-2 border-b border-slate-50">Funcionalidades</a>
          <a href="#" className="font-bold text-secondary py-2 border-b border-slate-50">Frota</a>

          <button
            onClick={handlePlanosClick}
            className="flex flex-col items-start gap-1 py-2 border-b border-slate-50"
          >
            <span className="font-bold text-secondary">Planos</span>
            {showPriceTip && (
              <span className="text-[10px] font-black text-primary bg-secondary px-3 py-1 rounded-full animate-pulse">
                A PARTIR DE R$ 29,90
              </span>
            )}
          </button>

          <button className="w-full bg-secondary text-white py-4 rounded-xl font-bold mt-2">Acessar Plataforma</button>
          <a
            href="https://wa.me/5581985938044"
            className="w-full bg-primary text-secondary py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" className="w-6 h-6" />
            81 98593-8044
          </a>
        </div>
      )}
    </nav>
  );
};
