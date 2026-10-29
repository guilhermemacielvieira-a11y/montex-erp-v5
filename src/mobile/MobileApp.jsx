// ============================================================
// MONTEX — app da diretoria (mobile) · rotas e providers
// ============================================================
// Mesmo ERPContext / AuthContext / Supabase do desktop. Rotas em /m/*.
// Navegação: Shell (src/mobile/app/Shell.jsx) com 5 abas — Início,
// Obras, Financeiro, Fábrica e Mais. Telas nativas em src/mobile/telas,
// design system em src/mobile/kit (identidade Montex: grafite + #006666).
// Telas de uso raro (3D, Kanban, Relatórios) abrem a versão completa do
// desktop dentro do app (DesktopWrap). Rotas antigas redirecionam.
// ============================================================
import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { initLastRefresh } from './ui/lastRefresh';
import InstallPrompt from './ui/InstallPrompt';
import SyncManager from './SyncManager';
import DeepLinkHandler from './DeepLinkHandler';
import Protected from './Protected';
import { ERPProvider } from '@/contexts/ERPContext';
import { ProducaoFabricaProvider } from '@/contexts/ProducaoFabricaContext';
import { ObraMobileProvider } from './ObraContext';
import MobileLayout from './MobileLayout';
import Shell from './app/Shell';
import { Esqueleto } from './kit';
import Inicio from './telas/Inicio';
import './kit/tema.css';

// Telas nativas sob demanda (code-splitting). O Início segue estático.
const Obras = lazy(() => import('./telas/obras/Obras'));
const ObraDetalhe = lazy(() => import('./telas/obras/ObraDetalhe'));
const Financeiro = lazy(() => import('./telas/financeiro/Financeiro'));
const Fabrica = lazy(() => import('./telas/fabrica/Fabrica'));
const Mais = lazy(() => import('./telas/Mais'));
const Aprovacoes = lazy(() => import('./telas/Aprovacoes'));
const Alertas = lazy(() => import('./telas/Alertas'));
const Comercial = lazy(() => import('./telas/Comercial'));
const Perfil = lazy(() => import('./telas/Perfil'));

// Telas de campo que seguem no app (reaproveitadas com o cabeçalho novo)
const EstoqueMobile = lazy(() => import('./pages/EstoqueMobile'));
const MedicaoMobile = lazy(() => import('./pages/MedicaoMobile'));
const ConfiguracoesMobile = lazy(() => import('./pages/ConfiguracoesMobile'));
const GaleriaMobile = lazy(() => import('./pages/GaleriaMobile'));
const DiarioObraMobile = lazy(() => import('./pages/DiarioObraMobile'));
const UsuariosMobile = lazy(() => import('./pages/UsuariosMobile'));
// Ferramentas de campo (leitor de código, foto, despacho) para quem opera
const ProducaoMobile = lazy(() => import('./pages/ProducaoMobile'));
const MontagemMobile = lazy(() => import('./pages/MontagemMobile'));
const ExpedicaoMobile = lazy(() => import('./pages/ExpedicaoMobile'));

// Versão completa do desktop dentro do app (uso raro)
const MontexERP3DPage = lazy(() => import('../pages/MontexERP3DPage'));
const ParedeProntaPage = lazy(() => import('../pages/ParedeProntaPage'));
const KanbanProducaoIntegrado = lazy(() => import('../pages/KanbanProducaoIntegrado'));
const KanbanCortePage = lazy(() => import('../pages/KanbanCortePage'));
const Relatorios = lazy(() => import('../pages/CentralRelatoriosPage'));

function Carregando() {
  return <div className="px-4 pt-[calc(env(safe-area-inset-top)+64px)]"><Esqueleto linhas={5} metricas={2} /></div>;
}

// 3D em tela cheia: o viewer ocupa a viewport inteira, com Voltar flutuante.
function Fullscreen3D({ children }) {
  return (
    <div className="relative min-h-screen bg-mx-bg text-mx-text">
      <Suspense fallback={<div className="p-8 text-center text-mx-text2">Carregando 3D…</div>}>
        <div className="p-6">{children}</div>
      </Suspense>
      <Link
        to="/m/mais"
        aria-label="Voltar"
        className="fixed z-[70] flex items-center gap-1.5 rounded-full border border-mx-line bg-mx-s1/90 px-3.5 py-2 text-[13px] font-semibold text-mx-text backdrop-blur-md active:scale-95"
        style={{ top: 'calc(env(safe-area-inset-top) + 10px)', left: '10px' }}
      >
        <ArrowLeft className="h-4 w-4 text-mx-tealhi" aria-hidden /> Voltar
      </Link>
    </div>
  );
}

// Página desktop no celular: rolagem horizontal própria e aviso curto.
function DesktopWrap({ title, children }) {
  return (
    <MobileLayout title={title} back="/m/mais">
      <Suspense fallback={<div className="p-8 text-center text-mx-text2">Carregando…</div>}>
        <div className="px-2 py-2">
          <p className="mx-2 mb-2 text-[12px] text-mx-text3">Versão completa do computador. Deslize para o lado para ver tudo.</p>
          <div className="-mx-2 overflow-x-auto overscroll-x-contain px-2">
            <div className="w-max min-w-full max-w-none">{children}</div>
          </div>
        </div>
      </Suspense>
    </MobileLayout>
  );
}

// Aviso quando o app é aberto num computador sem toque.
function DesktopHintBanner() {
  const [visivel, setVisivel] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.Capacitor?.isNativePlatform?.()) return false;
    if (sessionStorage.getItem('m_desktop_hint_off') === '1') return false;
    const semTouch = !window.matchMedia('(pointer: coarse)').matches && (navigator.maxTouchPoints || 0) === 0;
    const telaLarga = window.matchMedia('(min-width: 1024px)').matches;
    return semTouch && telaLarga;
  });
  if (!visivel) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-mx-teal px-4 py-2 text-[14px] font-medium text-white" role="status">
      <span>Você está no app do celular.</span>
      <a href="/" className="font-semibold underline">Abrir a versão do computador</a>
      <button
        type="button"
        onClick={() => { sessionStorage.setItem('m_desktop_hint_off', '1'); setVisivel(false); }}
        aria-label="Fechar aviso"
        className="ml-2 px-1 font-bold"
      >
        ✕
      </button>
    </div>
  );
}

const PERM_OBRAS = ['obras.view', 'projetos.view', 'bi.view'];
const PERM_APROVAR = ['medicao.aprovar', 'orcamentos.aprovar', 'compras.aprovar'];

// Rotas antigas → telas novas (links salvos, push e atalhos do PWA)
const REDIRECTS = {
  producao: '/m/fabrica',
  montagem: '/m/fabrica?aba=montagem',
  expedicao: '/m/fabrica?aba=expedicao',
  'expedicao-desktop': '/m/fabrica?aba=expedicao',
  'estoque-desktop': '/m/estoque',
  dashboard: '/m',
  'dashboard-bi': '/m',
  'analise-producao': '/m/fabrica',
  diario: '/m/fabrica',
  'painel-global': '/m/financeiro',
  'painel-global-desktop': '/m/financeiro',
  dre: '/m/financeiro?aba=dre',
  despesas: '/m/financeiro?aba=pagar',
  receitas: '/m/financeiro?aba=receber',
  custo: '/m/financeiro?aba=custo',
  'obras-gfo': '/m/obras',
  notificacoes: '/m/alertas',
  orcamentos: '/m/comercial',
  clientes: '/m/comercial',
  equipes: '/m/fabrica',
};

function MobileRoutes() {
  return (
    <Routes>
      <Route index element={<Inicio />} />
      <Route path="obras" element={<Protected perm={PERM_OBRAS}><Obras /></Protected>} />
      <Route path="obras/:id" element={<Protected perm={PERM_OBRAS}><ObraDetalhe /></Protected>} />
      <Route path="financeiro" element={<Protected perm="financeiro.view"><Financeiro /></Protected>} />
      <Route path="fabrica" element={<Protected perm="producao.view"><Fabrica /></Protected>} />
      <Route path="mais" element={<Mais />} />
      <Route path="aprovacoes" element={<Protected perm={PERM_APROVAR}><Aprovacoes /></Protected>} />
      <Route path="alertas" element={<Alertas />} />
      <Route path="comercial" element={<Protected perm={['orcamentos.view', 'comercial.view', 'clientes.view']}><Comercial /></Protected>} />
      <Route path="perfil" element={<Perfil />} />

      {/* Campo / operação (telas existentes com o cabeçalho novo) */}
      <Route path="estoque" element={<Protected perm="estoque.view"><EstoqueMobile /></Protected>} />
      <Route path="medicao" element={<Protected perm="medicao.view"><MedicaoMobile /></Protected>} />
      <Route path="evidencias" element={<Protected perm="producao.view"><GaleriaMobile /></Protected>} />
      <Route path="diario-obra" element={<Protected perm="producao.lancar_avanco"><DiarioObraMobile /></Protected>} />
      <Route path="usuarios" element={<Protected perm="usuarios.manage"><UsuariosMobile /></Protected>} />
      <Route path="config" element={<ConfiguracoesMobile />} />
      <Route path="campo/producao" element={<Protected perm="producao.view"><ProducaoMobile /></Protected>} />
      <Route path="campo/montagem" element={<Protected perm={['montagem.view', 'producao.view']}><MontagemMobile /></Protected>} />
      <Route path="campo/expedicao" element={<Protected perm="expedicao.view"><ExpedicaoMobile /></Protected>} />

      {/* Versão completa do computador */}
      <Route path="3d" element={<Protected perm={['viewer3d.view', 'producao.view']}><Fullscreen3D><MontexERP3DPage /></Fullscreen3D></Protected>} />
      <Route path="parede-pronta" element={<Protected perm={['montagem.view', 'producao.view']}><DesktopWrap title="Parede-Pronta R5"><ParedeProntaPage /></DesktopWrap></Protected>} />
      <Route path="kanban" element={<Protected perm="kanban.view"><DesktopWrap title="Kanban de produção"><KanbanProducaoIntegrado /></DesktopWrap></Protected>} />
      <Route path="kanban-corte" element={<Protected perm="kanban.view"><DesktopWrap title="Kanban de corte"><KanbanCortePage /></DesktopWrap></Protected>} />
      <Route path="relatorios" element={<Protected perm="relatorios.view"><DesktopWrap title="Relatórios"><Relatorios /></DesktopWrap></Protected>} />

      {Object.entries(REDIRECTS).map(([de, para]) => (
        <Route key={de} path={de} element={<Navigate to={para} replace />} />
      ))}
      <Route path="*" element={<Navigate to="/m" replace />} />
    </Routes>
  );
}

function Conteudo() {
  const { pathname } = useLocation();
  const telaCheia = pathname.startsWith('/m/3d');
  const rotas = (
    <Suspense fallback={<Carregando />}>
      <MobileRoutes />
    </Suspense>
  );
  return telaCheia ? <div className="mx-app">{rotas}</div> : <Shell>{rotas}</Shell>;
}

export default function MobileApp() {
  useEffect(() => { initLastRefresh(); }, []);
  // Barra de status / tema do PWA no grafite da marca
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const antes = meta?.getAttribute('content');
    meta?.setAttribute('content', '#101416');
    return () => { if (meta && antes) meta.setAttribute('content', antes); };
  }, []);
  return (
    <ERPProvider>
      <ProducaoFabricaProvider>
        <ObraMobileProvider>
          <div className="mx-app">
            <SyncManager />
            <DeepLinkHandler />
            <DesktopHintBanner />
            <Conteudo />
            <InstallPrompt />
            <Toaster
              position="top-center"
              containerStyle={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}
              toastOptions={{
                duration: 3000,
                style: { background: '#1F2629', color: '#E9EEEF', border: '1px solid #2C3438', fontSize: '14px', maxWidth: '92vw', fontFamily: "'Archivo Variable', system-ui, sans-serif" },
                success: { iconTheme: { primary: '#46B37F', secondary: '#101416' } },
                error: { iconTheme: { primary: '#E2604E', secondary: '#101416' } },
              }}
            />
          </div>
        </ObraMobileProvider>
      </ProducaoFabricaProvider>
    </ERPProvider>
  );
}
