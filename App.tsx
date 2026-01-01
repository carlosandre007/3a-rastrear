
import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { Overview } from './Overview';
import { VehicleGrid } from './VehicleGrid';
import { FeaturesList } from './FeaturesList';
import { DashboardSim } from './DashboardSim';
import { CTASection } from './CTASection';
import { Footer } from './Footer';
import { ChatBot } from './ChatBot';

const App: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <Navbar isScrolled={isScrolled} />

      <main>
        <Hero />
        <Overview />
        <VehicleGrid />
        <FeaturesList />
        <DashboardSim />
        <CTASection />
      </main>

      <Footer />

      {/* Floating Chat Assistant */}
      <ChatBot />

      {/* WhatsApp Fixed Button with Number - Always Visible */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-40">
        <a
          href="https://wa.me/5581985938044"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#25D366] text-white pr-6 pl-4 py-3 rounded-full shadow-[0_10px_25px_rgba(37,211,102,0.4)] hover:scale-105 transition-all group border-2 border-white/20"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20 group-hover:hidden"></div>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
              alt="WhatsApp"
              className="w-7 h-7 relative z-10"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest leading-none opacity-80">WhatsApp 24h</span>
            <span className="text-lg font-black leading-tight tracking-tight">81 98593-8044</span>
          </div>
        </a>
      </div>
    </div>
  );
};

export default App;
