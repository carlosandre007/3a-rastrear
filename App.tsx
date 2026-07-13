import React, { useEffect } from 'react';
import { RouterProvider, Route, useRouter } from './router';
import { SiteArea } from './SiteArea';
import { LoginArea } from './LoginArea';
import { ClienteArea } from './ClienteArea';
import { AdminArea } from './AdminArea';
import { ResponsiveWrapper } from './src/components/ResponsiveWrapper';

const DashboardRedirect: React.FC = () => {
  const { navigate } = useRouter();
  useEffect(() => {
    try {
      const stored = localStorage.getItem('3a-session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.logged) {
          if (session.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/cliente');
          }
          return;
        }
      }
    } catch (e) {}
    navigate('/login');
  }, [navigate]);
  return null;
};

const App: React.FC = () => {
  return (
    <ResponsiveWrapper>
      <RouterProvider>
        {/* Rota raiz "/" exibe a Landing Page */}
        <Route path="/">
          <SiteArea />
        </Route>

        {/* Rota "/site" também mapeia para a Landing Page */}
        <Route path="/site">
          <SiteArea />
        </Route>

        {/* Rota "/login" exibe a tela de login premium */}
        <Route path="/login">
          <LoginArea />
        </Route>

        {/* Rota "/cliente" exibe o painel do cliente (Dark Mode) */}
        <Route path="/cliente">
          <ClienteArea />
        </Route>

        {/* Rota de Alertas centralizados */}
        <Route path="/alerts">
          <ClienteArea />
        </Route>

        {/* Rota de Histórico de veículo */}
        <Route path="/vehicle">
          <ClienteArea />
        </Route>

        {/* Rota "/admin" exibe o painel do administrador (Corporativo) */}
        <Route path="/admin">
          <AdminArea />
        </Route>

        {/* Rota "/dashboard" redireciona inteligentemente de acordo com a sessão */}
        <Route path="/dashboard">
          <DashboardRedirect />
        </Route>
      </RouterProvider>
    </ResponsiveWrapper>
  );
};

export default App;
