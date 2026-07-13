import React, { createContext, useContext, useEffect, useState } from 'react';

// Contexto para fornecer informações de breakpoint (mobile‑first)
const ResponsiveContext = createContext({ isMobile: false, isTablet: false, isDesktop: false });

export const ResponsiveWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [size, setSize] = useState({ width: window.innerWidth });

  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = size.width < 640; // até 639px
  const isTablet = size.width >= 640 && size.width < 1024; // 640‑1023px
  const isDesktop = size.width >= 1024; // 1024px ou mais

  return (
    <ResponsiveContext.Provider value={{ isMobile, isTablet, isDesktop }}>
      {children}
    </ResponsiveContext.Provider>
  );
};

// Hook para consumo fácil
export const useResponsive = () => useContext(ResponsiveContext);
