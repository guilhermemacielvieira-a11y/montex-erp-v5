// ============================================================
// MOBILE APP - Roteamento e wrapper geral
// ============================================================
// Mantém o mesmo ERPContext / AuthContext / Supabase do desktop.
// Rotas mobile montadas em /m/*
// Páginas desktop são exibidas em modo mobile via wrapper "DesktopInMobile"
// (com header voltar) quando não há versão mobile dedicada.
// ============================================================
import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
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
import HomeMobile from './pages/HomeMobile';
import ProducaoMobile from './pages/ProducaoMobile';
import MontagemMobile from './pages/MontagemMobile';
import FinanceiroMobile from './pages/FinanceiroMobile';
import ExpedicaoMobile from './pages/ExpedicaoMobile';
import EstoqueMobile from './pages/EstoqueMobile';
import MedicaoMobile from './pages/MedicaoMobile';
import PerfilMobile from './pages/PerfilMobile';
import ConfiguracoesMobile from './pages/ConfiguracoesMobile';
import NotificacoesMobile from './pages/NotificacoesMobile';
import GaleriaMobile from './pages/GaleriaMobile';
import DashboardMobile from './pages/DashboardMobile';
import AprovacoesMobile from './pages/AprovacoesMobile';
import DiarioObraMobile from './pages/DiarioObraMobile';
import PainelGlobalMobile from './pages/PainelGlobalMobile';
import UsuariosMobile from './pages/UsuariosMobile';
import MaisMobile from './pages/MaisMobile';

// Páginas desktop que abrem em wrapper "compacto" no mobile
const MontexERP3DPage = lazy(() => import('../pages/MontexERP3DPage'));
const KanbanProducaoIntegrado = lazy(() => import('../pages/KanbanProducaoIntegrado'));
const KanbanCortePage = lazy(() => import('../pages/KanbanCortePage'));
const EnviosExpedicaoPage = lazy(() => import('../pages/EnviosExpedicaoPage'));
const EstoquePageV2 = lazy(() => import('../pages/EstoquePageV2'));
const DespesasPage = lazy(() => import('../pages/DespesasPage'));
const ReceitasPage = lazy(() => import('../pages/ReceitasPage'));
const GestaoFinanceiraObra = lazy(() => import('../pages/GestaoFinanceiraObra'));
const PainelFinanceiroGlobal = lazy(() => import('../pages/PainelFinanceiroGlobal'));
const DREPage = lazy(() => import('../pages/DREPage'));
const Projetos = lazy(() => import('../pages/Projetos'));
const Clientes = lazy(() => import('../pages/Clientes'));
const EquipesPage = lazy(() => import('../pages/EquipesPage'));
const OrcamentosPage = lazy(() => import('../pages/OrcamentosPage'));
const Relatorios = lazy(() => import('../pages/Relatorios'));
const DashboardPremium = lazy(() => import('../pages/DashboardPremium'));
const AnaliseProducaoPage = lazy(() => import('../pages/AnaliseProducaoPage'));
const DiarioProducaoPage = lazy(() => import('../pages/DiarioProducaoPage'));

// 3D em TELA CHEIA no mobile: o viewer dimensiona o canvas com
// h-[calc(100vh-120px)] e root -m-6; dentro do DesktopWrap (header +
// tab bar) o canvas estourava e rolava. Aqui ele ganha a viewport
// inteira — OrbitControls já é touch-nativo (1 dedo gira, pinça dá
// zoom) — com botão Voltar flutuante. O p-6 neutraliza o -m-6 do root.
function Fullscreen3D({ children }) {
  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando 3D…</div>}>
        <div className="p-6">{children}</div>
      </Suspense>
      <Link
        to="/m"
        aria-label="Voltar ao início"
        className="fixed z-[70] flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900/90 border border-slate-700 text-slate-100 text-xs font-bold backdrop-blur-md active:scale-95 transition"
        style={{ top: 'calc(env(safe-area-inset-top) + 10px)', left: '10px' }}
      >
        <ArrowLeft className="w-4 h-4 text-amber-400" /> Voltar
      </Link>
    </div>
  );
}

function DesktopWrap({ title, children }) {
  return (
    <MobileLayout title={title} back>
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando…</div>}>
        <div className="px-2 py-2">
          {/* Wrapper que escala o conteúdo desktop */}
          <div className="origin-top-left transform" style={{ minWidth: '100%' }}>
            {children}
          </div>
        </div>
      </Suspense>
    </MobileLayout>
  );
}

// Estados de foco visíveis (teclado/switch/leitor de tela). Escopo .montex-mobile
// (não afeta o desktop). Campos de formulário mostram o anel ao focar; botões/links
// só em :focus-visible (não aparece no toque/clique).
const FOCUS_STYLES = `
.montex-mobile :is(input, select, textarea):focus,
.montex-mobile :is(button, a):focus-visible {
  outline: 2px solid rgb(251 191 36 / 0.95) !important;
  outline-offset: 2px !important;
  border-radius: 10px;
}`;

// Aviso quando o app mobile e aberto num computador sem touch (ex.: atalho
// salvo em /m). O desktop nunca e redirecionado para ca automaticamente -
// se chegou aqui sem touch e tela larga, quase certamente foi sem querer.
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
    <div className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-slate-950 text-sm font-semibold px-4 py-2 flex items-center justify-center gap-3" role="status">
      <span>Voce esta na versao mobile.</span>
      <a href="/" className="underline font-black">Ir para o desktop</a>
      <button
        onClick={() => { sessionStorage.setItem('m_desktop_hint_off', '1'); setVisivel(false); }}
        aria-label="Fechar aviso"
        className="ml-2 px-1 font-black"
      >
        ✕
      </button>
    </div>
  );
}

export default function MobileApp() {
  // Marca a abertura do app como referência inicial de "atualizado há X".
  useEffect(() => { initLastRefresh(); }, []);
  return (
    <ERPProvider>
      <ProducaoFabricaProvider>
        <ObraMobileProvider>
          <style>{FOCUS_STYLES}</style>
          <SyncManager />
          <DeepLinkHandler />
          <DesktopHintBanner />
          <MobileRoutes />
          <InstallPrompt />
          {/* Toaster do react-hot-toast (estava ausente no app → toasts não apareciam).
              Escopo mobile, tema escuro, abaixo do header. */}
          <Toaster
            position="top-center"
            containerStyle={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}
            toastOptions={{
              duration: 3000,
              style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', fontSize: '13px', maxWidth: '92vw' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
            }}
          />
        </ObraMobileProvider>
      </ProducaoFabricaProvider>
    </ERPProvider>
  );
}

function MobileRoutes() {
  return (
    <Routes>
      <Route index element={<HomeMobile />} />
      <Route path="producao" element={<Protected perm="producao.view"><ProducaoMobile /></Protected>} />
      <Route path="montagem" element={<Protected perm="producao.view"><MontagemMobile /></Protected>} />
      <Route path="financeiro" element={<Protected perm="financeiro.view"><FinanceiroMobile /></Protected>} />
      <Route path="expedicao" element={<Protected perm="expedicao.view"><ExpedicaoMobile /></Protected>} />
      <Route path="mais" element={<MaisMobile />} />

      {/* Páginas desktop em wrapper */}
      <Route path="3d" element={<Protected perm="producao.view"><Fullscreen3D><MontexERP3DPage /></Fullscreen3D></Protected>} />
      <Route path="kanban" element={<Protected perm="kanban.view"><DesktopWrap title="Kanban Produção"><KanbanProducaoIntegrado /></DesktopWrap></Protected>} />
      <Route path="kanban-corte" element={<Protected perm="kanban.view"><DesktopWrap title="Kanban Corte"><KanbanCortePage /></DesktopWrap></Protected>} />
      <Route path="expedicao-desktop" element={<Protected perm="expedicao.view"><DesktopWrap title="Expedição (desktop)"><EnviosExpedicaoPage /></DesktopWrap></Protected>} />
      <Route path="estoque" element={<Protected perm="estoque.view"><EstoqueMobile /></Protected>} />
      <Route path="medicao" element={<Protected perm="medicao.view"><MedicaoMobile /></Protected>} />
      {/* Caixa de aprovações unificada — libera p/ quem aprova medições, orçamentos OU compras */}
      <Route path="aprovacoes" element={<Protected perm={['medicao.aprovar', 'orcamentos.aprovar', 'compras.aprovar']}><AprovacoesMobile /></Protected>} />
      <Route path="evidencias" element={<Protected perm="producao.view"><GaleriaMobile /></Protected>} />
      {/* Diário de obra (montagem em campo, com fotos) — operador pode lançar */}
      <Route path="diario-obra" element={<Protected perm="producao.lancar_avanco"><DiarioObraMobile /></Protected>} />
      <Route path="estoque-desktop" element={<Protected perm="estoque.view"><DesktopWrap title="Estoque (desktop)"><EstoquePageV2 /></DesktopWrap></Protected>} />
      <Route path="despesas" element={<Protected perm="financeiro.view"><DesktopWrap title="Despesas"><DespesasPage /></DesktopWrap></Protected>} />
      <Route path="receitas" element={<Protected perm="financeiro.view"><DesktopWrap title="Receitas"><ReceitasPage /></DesktopWrap></Protected>} />
      <Route path="obras-gfo" element={<Protected perm="financeiro.view"><DesktopWrap title="Gestão por Obra"><GestaoFinanceiraObra /></DesktopWrap></Protected>} />
      {/* Financeiro GERAL da empresa (≠ financeiro de obra): analítico nativo + edição desktop */}
      <Route path="painel-global" element={<Protected perm="financeiro.view"><PainelGlobalMobile /></Protected>} />
      <Route path="painel-global-desktop" element={<Protected perm="financeiro.view"><DesktopWrap title="Painel Global (edição)"><PainelFinanceiroGlobal /></DesktopWrap></Protected>} />
      <Route path="dre" element={<Protected perm="financeiro.view"><DesktopWrap title="DRE"><DREPage /></DesktopWrap></Protected>} />
      <Route path="obras" element={<Protected perm={['obras.view', 'projetos.view']}><DesktopWrap title="Obras"><Projetos /></DesktopWrap></Protected>} />
      <Route path="clientes" element={<Protected perm="clientes.view"><DesktopWrap title="Clientes"><Clientes /></DesktopWrap></Protected>} />
      <Route path="equipes" element={<Protected perm="equipes.view"><DesktopWrap title="Equipes"><EquipesPage /></DesktopWrap></Protected>} />
      <Route path="orcamentos" element={<Protected perm="orcamentos.view"><DesktopWrap title="Orçamentos"><OrcamentosPage /></DesktopWrap></Protected>} />
      <Route path="relatorios" element={<Protected perm="relatorios.view"><DesktopWrap title="Relatórios"><Relatorios /></DesktopWrap></Protected>} />
      {/* Dashboard estratégico NATIVO mobile (gráficos + KPIs). O BI desktop
          completo fica em /m/dashboard-bi (wrapper escalado). */}
      <Route path="dashboard" element={<Protected perm="bi.view"><DashboardMobile /></Protected>} />
      <Route path="dashboard-bi" element={<Protected perm="bi.view"><DesktopWrap title="Dashboard BI"><DashboardPremium /></DesktopWrap></Protected>} />
      <Route path="analise-producao" element={<Protected perm="producao.view"><DesktopWrap title="Análise Produção"><AnaliseProducaoPage /></DesktopWrap></Protected>} />
      <Route path="diario" element={<Protected perm="producao.view"><DesktopWrap title="Diário Produção"><DiarioProducaoPage /></DesktopWrap></Protected>} />
      {/* Gestão de usuários — funções (roles) e atribuições (permissões) completas */}
      <Route path="usuarios" element={<Protected perm="usuarios.manage"><UsuariosMobile /></Protected>} />
      <Route path="notificacoes" element={<NotificacoesMobile />} />
      <Route path="perfil" element={<PerfilMobile />} />
      <Route path="config" element={<ConfiguracoesMobile />} />

      <Route path="*" element={<Navigate to="/m" replace />} />
    </Routes>
  );
}

