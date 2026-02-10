import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

// ============================================================
// SISTEMA DE ROLES E PERMISSÕES - MONTEX ERP PREMIUM V5
// 6 Níveis de acesso hierárquicos
// ============================================================

export const ROLES = {
  ADMIN: 'admin',
  GERENTE: 'gerente',
  SUPERVISOR: 'supervisor',
  OPERADOR: 'operador',
  FINANCEIRO: 'financeiro',
  VIEWER: 'viewer',
  // Legacy - mapeamento retrocompatível
  PRODUCAO: 'supervisor'
};

export const ROLE_LABELS = {
  admin: 'Administrador',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  operador: 'Operador',
  financeiro: 'Financeiro',
  viewer: 'Visualização'
};

export const ROLE_COLORS = {
  admin: 'bg-gradient-to-br from-orange-600 to-amber-700',
  gerente: 'bg-gradient-to-br from-purple-600 to-violet-700',
  supervisor: 'bg-gradient-to-br from-blue-600 to-cyan-700',
  operador: 'bg-gradient-to-br from-green-600 to-emerald-700',
  financeiro: 'bg-gradient-to-br from-yellow-600 to-orange-700',
  viewer: 'bg-gradient-to-br from-slate-600 to-slate-700'
};

// Permissões detalhadas por role
const PERMISSIONS = {
  // ADMIN — Acesso total irrestrito
  admin: ['*'],

  // GERENTE — Gerencia produção, equipes, financeiro, comercial
  gerente: [
    'dashboard.view', 'dashboard.export',
    'projetos.view', 'projetos.edit', 'projetos.create',
    'producao.view', 'producao.edit', 'producao.lancar_avanco', 'producao.aprovar',
    'estoque.view', 'estoque.edit', 'estoque.movimentar',
    'compras.view', 'compras.edit', 'compras.aprovar',
    'expedicao.view', 'expedicao.edit', 'expedicao.aprovar',
    'medicao.view', 'medicao.edit', 'medicao.aprovar',
    'equipes.view', 'equipes.edit', 'equipes.escalar',
    'kanban.view', 'kanban.edit',
    'materiais.view', 'materiais.edit',
    'nfs.view', 'nfs.edit',
    'financeiro.view', 'financeiro.edit',
    'orcamentos.view', 'orcamentos.edit', 'orcamentos.aprovar',
    'clientes.view', 'clientes.edit',
    'relatorios.view', 'relatorios.export',
    'bi.view',
    'usuarios.view',
  ],

  // SUPERVISOR — Gerencia operações diárias de fábrica
  supervisor: [
    'dashboard.view',
    'projetos.view',
    'producao.view', 'producao.edit', 'producao.lancar_avanco',
    'estoque.view', 'estoque.edit', 'estoque.movimentar',
    'compras.view',
    'expedicao.view', 'expedicao.edit',
    'medicao.view', 'medicao.edit',
    'equipes.view', 'equipes.edit', 'equipes.escalar',
    'kanban.view', 'kanban.edit',
    'materiais.view', 'materiais.edit',
    'nfs.view',
    'relatorios.view',
  ],

  // OPERADOR — Input de dados de produção
  operador: [
    'dashboard.view',
    'producao.view', 'producao.lancar_avanco',
    'estoque.view',
    'kanban.view', 'kanban.edit',
    'equipes.view',
    'materiais.view',
  ],

  // FINANCEIRO — Módulos financeiros e comerciais
  financeiro: [
    'dashboard.view', 'dashboard.export',
    'projetos.view',
    'financeiro.view', 'financeiro.edit', 'financeiro.aprovar',
    'compras.view', 'compras.edit',
    'nfs.view', 'nfs.edit',
    'orcamentos.view', 'orcamentos.edit',
    'clientes.view', 'clientes.edit',
    'medicao.view', 'medicao.edit',
    'relatorios.view', 'relatorios.export',
    'bi.view',
  ],

  // VIEWER — Somente visualização
  viewer: [
    'dashboard.view',
    'projetos.view',
    'producao.view',
    'estoque.view',
    'compras.view',
    'expedicao.view',
    'medicao.view',
    'equipes.view',
    'kanban.view',
    'materiais.view',
    'nfs.view',
    'bi.view',
    'relatorios.view',
  ]
};

export const AuthProvider = ({ children }) => {
  // DEV_BYPASS: false = modo produção com login obrigatório
  const DEV_BYPASS = false;
  const DEV_USER = {
    id: 'dev-admin',
    authId: 'dev-admin',
    email: 'admin@montex.com',
    name: 'Admin Dev',
    nome: 'Admin Dev',
    role: 'admin',
    cargo: 'Administrador',
    avatar: null,
    obraPadrao: null,
    ativo: true
  };

  const [user, setUser] = useState(DEV_BYPASS ? DEV_USER : null);
  const [profile, setProfile] = useState(DEV_BYPASS ? DEV_USER : null);
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_BYPASS ? true : false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(DEV_BYPASS ? false : true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({
    id: 'montex-erp-premium',
    public_settings: {
      app_name: 'MONTEX ERP Premium',
      theme: 'light'
    }
  });

  // Buscar perfil do usuário na tabela user_profiles
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser?.email) return null;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', authUser.email)
        .eq('ativo', true)
        .single();

      if (error || !data) {
        console.warn('⚠️ Perfil não encontrado para:', authUser.email);
        return null;
      }

      return {
        id: data.id,
        authId: data.auth_id,
        email: data.email,
        name: data.nome,
        nome: data.nome,
        role: data.role,
        cargo: data.cargo,
        avatar: data.avatar_url,
        obraPadrao: data.obra_padrao,
        ativo: data.ativo
      };
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      return null;
    }
  }, []);

  // Guard para evitar múltiplas execuções de initAuth
  const initAuthRunning = useRef(false);

  // Helper: limpar sessão corrompida do localStorage
  const clearStaleSession = useCallback(async () => {
    console.warn('[Auth] Limpando sessão corrompida do localStorage...');
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {
      // Se signOut falhar, limpar manualmente
      try {
        const storageKey = `sb-trxbohjcwsogthabairh-auth-token`;
        localStorage.removeItem(storageKey);
      } catch (_2) {}
    }
  }, []);

  // Inicializar autenticação
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Se DEV_BYPASS está ativo, não verificar auth
      if (DEV_BYPASS) {
        setIsLoadingAuth(false);
        return;
      }
      // Evitar execuções concorrentes (React StrictMode/re-renders)
      if (initAuthRunning.current) {
        console.log('[Auth] initAuth já em execução, pulando...');
        return;
      }
      initAuthRunning.current = true;
      setIsLoadingAuth(true);
      console.log('[Auth] initAuth: iniciando...');

      try {
        // Verificar se há sessão ativa com TIMEOUT para evitar travamento
        console.log('[Auth] Chamando getSession com timeout de 10s...');

        const getSessionWithTimeout = () => {
          return Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 10000)
            )
          ]);
        };

        let session = null;
        let error = null;

        try {
          const result = await getSessionWithTimeout();
          session = result.data?.session;
          error = result.error;
        } catch (timeoutOrFetchErr) {
          console.error('[Auth] getSession falhou (timeout ou rede):', timeoutOrFetchErr.message);
          // Sessão corrompida ou rede com problema — limpar e ir para login
          await clearStaleSession();
          if (mounted) {
            setIsLoadingAuth(false);
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_required' });
          }
          initAuthRunning.current = false;
          return;
        }

        console.log('[Auth] getSession retornou:', { hasSession: !!session, error: error?.message });

        if (error) {
          console.error('[Auth] Erro ao verificar sessão:', error);
          // Limpar sessão corrompida
          await clearStaleSession();
          if (mounted) {
            setIsLoadingAuth(false);
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_required' });
          }
          initAuthRunning.current = false;
          return;
        }

        if (session?.user) {
          console.log('[Auth] Sessão encontrada, buscando perfil para:', session.user.email);
          const userProfile = await fetchProfile(session.user);
          console.log('[Auth] fetchProfile retornou:', userProfile ? userProfile.email : 'null');

          if (mounted) {
            if (userProfile) {
              setUser(userProfile);
              setProfile(userProfile);
              setIsAuthenticated(true);
              setAuthError(null);
              console.log(`✅ Logado como: ${userProfile.name} (${userProfile.role})`);
            } else {
              // Usuário autenticado mas sem perfil
              setAuthError({ type: 'user_not_registered' });
              setIsAuthenticated(false);
            }
          }
        } else {
          // Sem sessão — redirecionar para login
          console.log('[Auth] Sem sessão ativa, mostrando login');
          if (mounted) {
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_required' });
          }
        }
      } catch (err) {
        console.error('[Auth] Erro na inicialização auth:', err);
        // Limpar sessão potencialmente corrompida
        await clearStaleSession();
        if (mounted) {
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required' });
        }
      } finally {
        // SEMPRE desliga o loading, mesmo se componente desmontou
        console.log('[Auth] finally: setIsLoadingAuth(false), mounted=', mounted);
        if (mounted) {
          setIsLoadingAuth(false);
        }
        initAuthRunning.current = false;
      }
    };

    initAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('[Auth] onAuthStateChange:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          const userProfile = await fetchProfile(session.user);
          if (userProfile && mounted) {
            setUser(userProfile);
            setProfile(userProfile);
            setIsAuthenticated(true);
            setAuthError(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required' });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[Auth] Token renovado com sucesso');
        }
      }
    );

    // Capturar erros globais de refresh token do Supabase
    const handleUnhandledRejection = (event) => {
      const msg = event?.reason?.message || String(event?.reason || '');
      if (msg.includes('Failed to fetch') || msg.includes('refresh_token') || msg.includes('NetworkError')) {
        console.warn('[Auth] Erro global de refresh token capturado:', msg);
        event.preventDefault(); // Evitar log no console
        // Limpar sessão corrompida e forçar re-login
        clearStaleSession().then(() => {
          if (mounted) {
            setUser(null);
            setProfile(null);
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_required' });
            setIsLoadingAuth(false);
          }
        });
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [fetchProfile, clearStaleSession]);

  // Login com email e senha
  const login = useCallback(async (email, password) => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setIsLoadingAuth(false);
        return { success: false, error: error.message };
      }

      // Buscar perfil
      const userProfile = await fetchProfile(data.user);

      if (!userProfile) {
        await supabase.auth.signOut();
        setIsLoadingAuth(false);
        return { success: false, error: 'Usuário sem perfil no sistema. Contate o administrador.' };
      }

      if (!userProfile.ativo) {
        await supabase.auth.signOut();
        setIsLoadingAuth(false);
        return { success: false, error: 'Usuário desativado. Contate o administrador.' };
      }

      setUser(userProfile);
      setProfile(userProfile);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);

      return { success: true, user: userProfile };
    } catch (err) {
      setIsLoadingAuth(false);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }, [fetchProfile]);

  // Logout
  const logout = useCallback(async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required' });
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  }, []);

  // Navegar para login
  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  // Checar permissão
  const hasPermission = useCallback((permission) => {
    if (!user?.role) return false;
    const rolePerms = PERMISSIONS[user.role] || [];
    return rolePerms.includes('*') || rolePerms.includes(permission);
  }, [user]);

  // Checar se é admin
  const isAdmin = useCallback(() => {
    return user?.role === ROLES.ADMIN;
  }, [user]);

  const checkAppState = useCallback(async () => {
    // Mantido para compatibilidade
  }, []);

  // Expor funções no window para debug/testing
  useEffect(() => {
    window.__montexLogin = login;
    window.__montexLogout = logout;
  }, [login, logout]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      logout,
      navigateToLogin,
      checkAppState,
      hasPermission,
      isAdmin,
      ROLES,
      ROLE_LABELS,
      ROLE_COLORS
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
