import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interface do Contexto do Roteador
interface RouterContextType {
  currentPath: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
  navigate: () => {},
});

interface RouterProviderProps {
  children: ReactNode;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const navigate = (to: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', to);
      setCurrentPath(to);
      // Rola para o topo ao navegar
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePopState = () => {
        setCurrentPath(window.location.pathname);
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
}

export const Link: React.FC<LinkProps> = ({ to, children, ...props }) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Permite que cliques com a tecla Ctrl ou Command abram em nova aba
    if (e.metaKey || e.ctrlKey) {
      return;
    }
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};

interface RouteProps {
  path: string;
  children: ReactNode;
  exact?: boolean;
}

export const Route: React.FC<RouteProps> = ({ path, children, exact = false }) => {
  const { currentPath } = useRouter();

  // Se exact for true, exige match perfeito, senão verifica se inicia com o path
  // Para a rota raiz '/', exigimos correspondência exata para não casar com tudo
  const isRoot = path === '/';
  const isMatch = (exact || isRoot) 
    ? currentPath === path 
    : currentPath.startsWith(path);

  if (!isMatch) return null;

  return <>{children}</>;
};
