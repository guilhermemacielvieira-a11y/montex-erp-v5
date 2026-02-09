import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

// Roles e permissões
export const ROLES = {
  ADMIN: 'admin',
  PRODUCAO: 'producao',
  VIEWER: 'viewer'
};

export const ROLE_LABELS = {
  admin: 'Administrador',
  producao: 'Produção',
  viewer: 'Visualização'
};

// Permissões por role
const PERMISSIONS = {
  admin: ['*'], // Acesso total
  producao: [
    'dashboard.view',
    'producao.view', 'producao.edit', 'producao.lancar_avanco',
    'estoque.view', 'estoque.edit',
    'compras.view',
    'expedicao.view', 'expedicao.edit',
    'medicao.view', 'medicao.edit',
    'equipes.view',
    'kanban.view', 'kanban.edit',
    'materiais.view', 'materiais.edit',
    'nfs.view',
  ],
  viewer: [
    'dashboard.view',
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
  ]
};

export const AuthProvider = ({ children }) => {
  // DEV_BYPASS: Desabilitar auth para conferência
  const DEV_BYPASS = true;
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

  // Inicializar autenticação
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Se DEV_BYPASS está ativo, não verificar auth
      if (DEV_BYPASS) {
        setIsLoadingAuth(false);
        return;
      }
      setIsLoadingAuth(true);

      try {
        // Verificar se há sessão ativa
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Erro ao verificar sessão:', error);
          if (mounted) {
            setIsLoadingAuth(false);
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_required' });
          }
          return;
        }

        if (session?.user) {
          const userProfile = await fetchProfile(session.user);

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
          if (mounted) {
            setIsAuthenticated(false);
            setAuthError({ type: 'auth_required' });
          }
        }
      } catch (err) {
        console.error('Erro na inicialização auth:', err);
        if (mounted) {
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required' });
        }
      } finally {
        if (mounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    initAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const userProfile = await fetchProfile(session.user);
          if (userProfile) {
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
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

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
      ROLE_LABELS
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
