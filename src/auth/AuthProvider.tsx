import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface Session {
  logged: boolean;
  role: 'admin' | 'cliente';
  email: string;
  auth?: string;
}

interface AuthContextType {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('3a-session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.logged) {
          setSession(parsed);
        }
      } catch (_) {}
    }
  }, []);

  const login = (newSession: Session) => {
    localStorage.setItem('3a-session', JSON.stringify(newSession));
    setSession(newSession);
  };

  const logout = () => {
    localStorage.removeItem('3a-session');
    setSession(null);
  };

  const isAuthenticated = !!session?.logged;
  const isAdmin = session?.role === 'admin';

  return (
    <AuthContext.Provider value={{ session, login, logout, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
