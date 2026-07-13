import React, { useState, useEffect } from 'react';
import { Link, useRouter } from './router';
// import { login as traccarLogin } from './src/services/traccarApi';

// Mock traccarLogin temporário (integração desativada)
const traccarLogin = async (email: string, password: string): Promise<any> => {
  return { success: false, error: "A Área do Cliente está em atualização e estará disponível em breve." };
};

// Helper to safely parse session from localStorage
const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem('3a-session') || 'null');
  } catch (e) {
    return null;
  }
};

export const LoginArea: React.FC = () => {
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState<'cliente' | 'admin'>('cliente');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const session = getSession();
  console.log('SESSION:', session);
  const isAuthenticated = () => session?.logged === true;
  const isAdmin = () => session?.role === 'admin';

  // If user is already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      if (session?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/cliente');
      }
    }
  }, []);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = 'O e-mail é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Por favor, insira um e-mail válido.';
    }

    if (!password) {
      newErrors.password = 'A senha é obrigatória.';
    } else if (password.length < 4) {
      newErrors.password = 'A senha deve ter no mínimo 4 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await traccarLogin(email, password);
      setIsSubmitting(false);

      if (result.success && result.user) {
        // Verifica se é administrador (com bypass automático seguro em ambiente de desenvolvimento local)
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isUserAdmin = result.user.administrator === true || (isLocalDev && userRole === 'admin');
        
        // Se tentou fazer login como admin mas não tem permissão
        if (userRole === 'admin' && !isUserAdmin) {
          setErrors({ email: 'Você não possui permissões administrativas nesta conta.' });
          return;
        }

        const session = {
          logged: true,
          role: isUserAdmin ? 'admin' : 'cliente',
          email: email,
          auth: result.auth
        };
        localStorage.setItem('3a-session', JSON.stringify(session));
        setLoginSuccess(true);

        setTimeout(() => {
          setLoginSuccess(false);
          if (isUserAdmin) {
            navigate('/admin');
          } else {
            navigate('/cliente');
          }
        }, 1000);
      } else {
        setErrors({ email: result.error || 'E-mail ou senha incorretos.' });
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrors({ email: 'Erro de conexão com o servidor de rastreamento.' });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#05162e] via-[#0A2540] to-[#0c3156] relative overflow-hidden font-sans py-12 px-4">
      {/* Círculos decorativos brilhantes no fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-[#FBBF24]/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-[#10B981]/10 blur-[120px] pointer-events-none"></div>
      
      {/* Malha sutil de fundo */}
      <div className="absolute inset-0 map-grid opacity-[0.03] pointer-events-none"></div>

      <div className="w-full max-w-md z-10 animate-fade-in-up">
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner mb-4">
            <img 
              src="/logo-final.jpg" 
              alt="3A RASTREAR" 
              className="h-14 w-14 rounded-xl object-cover border border-white/10"
              onError={(e) => {
                // Fallback caso a imagem não carregue
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Ícone reserva caso a imagem não exista */}
            <span className="material-icons-round text-3xl text-primary leading-none pl-1">
              security
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            3A <span className="text-primary font-extrabold">RASTREAR</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Acesse sua conta para monitoramento em tempo real</p>
        </div>

        {/* Card de Login Glassmorphic */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden">
          
          {/* Indicador superior sutil */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FBBF24]/40 to-transparent"></div>

          {/* Seletor de Tipo de Usuário (Cliente vs Admin) */}
          <div className="flex bg-slate-900/50 p-1 rounded-xl mb-8 border border-white/5 relative">
            <button
              type="button"
              onClick={() => {
                setUserRole('cliente');
                setErrors({});
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                userRole === 'cliente'
                  ? 'bg-primary text-secondary shadow-lg font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">person</span>
              Área do Cliente
            </button>
            <button
              type="button"
              onClick={() => {
                setUserRole('admin');
                setErrors({});
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                userRole === 'admin'
                  ? 'bg-primary text-secondary shadow-lg font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">admin_panel_settings</span>
              Administrador
            </button>
          </div>

          {userRole === 'cliente' ? (
            <div className="text-center py-8 flex flex-col items-center gap-4 animate-fade-in">
              <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center animate-pulse">
                <span className="material-icons-round text-primary text-3xl">construction</span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Área em Atualização</h3>
              <p className="text-slate-300 text-xs leading-relaxed max-w-xs mx-auto font-medium">
                A Área do Cliente está em atualização e estará disponível em breve.
              </p>
              <Link
                to="/"
                className="mt-4 px-6 py-2.5 bg-primary text-secondary hover:bg-yellow-500 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg inline-block"
              >
                Voltar ao Início
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo E-mail */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-300 mb-2">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    placeholder="exemplo@3arastrear.com"
                    className={`w-full bg-slate-900/40 border ${
                      errors.email ? 'border-red-500' : 'border-white/10'
                    } focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3.5 pl-12 pr-4 text-white text-sm placeholder-slate-500 outline-none transition-all duration-200`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-xs font-medium mt-2 flex items-center gap-1">
                    <span className="material-icons-round text-sm">error</span>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Campo Senha */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-300">
                    Senha
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert('Funcionalidade de recuperação simulada!'); }} className="text-xs text-primary hover:underline font-medium">
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative">
                  <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    placeholder="••••••••"
                    className={`w-full bg-slate-900/40 border ${
                      errors.password ? 'border-red-500' : 'border-white/10'
                    } focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3.5 pl-12 pr-12 text-white text-sm placeholder-slate-500 outline-none transition-all duration-200`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-150"
                  >
                    <span className="material-icons-round text-lg leading-none">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs font-medium mt-2 flex items-center gap-1">
                    <span className="material-icons-round text-sm">error</span>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Botão de Enviar */}
              <button
                type="submit"
                disabled={isSubmitting || loginSuccess}
                className={`w-full py-4 px-6 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                  loginSuccess
                    ? 'bg-accent text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)]'
                    : 'bg-primary text-secondary hover:scale-[1.02] shadow-[0_10px_30px_rgba(251,191,36,0.25)] hover:shadow-[0_15px_35px_rgba(251,191,36,0.35)]'
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Autenticando...</span>
                  </>
                ) : loginSuccess ? (
                  <>
                    <span className="material-icons-round text-xl">check_circle</span>
                    <span>Acesso Autorizado!</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons-round text-xl">login</span>
                    <span>Entrar na Plataforma</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Link de Retorno */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors duration-200 group font-semibold"
          >
            <span className="material-icons-round text-lg transition-transform duration-200 group-hover:-translate-x-1">
              arrow_back
            </span>
            Voltar para o site principal
          </Link>
        </div>
      </div>
    </div>
  );
};
