import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DisplayProvider } from './contexts/DisplayContext';
import { EstoqueRealProvider } from './contexts/EstoqueRealContext';
import LoginPage from './pages/LoginPage';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  // SAFETY NET: Se loading demorar mais de 15 segundos, forçar login
  // (aumentado de 8s para evitar falsos positivos em conexões lentas)
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) {
      const timer = setTimeout(() => {
        console.error('[App] Loading timeout de 15s atingido! Forçando tela de login...');
        setLoadingTimedOut(true);
      }, 15000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimedOut(false);
    }
  }, [isLoadingAuth, isLoadingPublicSettings]);

  // Rota de login é pública
  if (location.pathname === '/login') {
    return <LoginPage />;
  }

  // Se loading deu timeout, limpar sessão e mostrar login
  if (loadingTimedOut) {
    try {
      // Limpar localStorage do Supabase de forma dinâmica
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
          <h2 className="text-white text-lg font-semibold mb-2">Sessao expirada</h2>
          <p className="text-blue-200 text-sm mb-4">
            Sua sessao anterior expirou ou a conexao esta lenta. Faca login novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading spinner while checking auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200 text-sm">Carregando MONTEX ERP...</p>
        </div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <LoginPage />;
    }
  }

  // Se nao esta autenticado, mostrar login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Render the main app (autenticado)
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <DisplayProvider>
          <EstoqueRealProvider>
            <QueryClientProvider client={queryClientInstance}>
              <Router>
                <NavigationTracker />
                <AuthenticatedApp />
              </Router>
              <Toaster />
            </QueryClientProvider>
          </EstoqueRealProvider>
        </DisplayProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
