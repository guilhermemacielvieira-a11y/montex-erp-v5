// ============================================================
// MOBILE APP - Roteamento e wrapper geral
// ============================================================
// Mantém o mesmo ERPContext / AuthContext / Supabase do desktop.
// Rotas mobile montadas em /m/*
// Páginas desktop são exibidas em modo mobile via wrapper "DesktopInMobile"
// (com header voltar) quando não há versão mobile dedicada.
// ============================================================
import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { initLastRefresh } from './ui/lastRefresh';
import InstallPrompt from './ui/InstallPrompt';
import SyncManager from './SyncManager';
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
const DREPage = lazy(() => import('../pages/DREPage'));
const Projetos = lazy(() => import('../pages/Projetos'));
const Clientes = lazy(() => import('../pages/Clientes'));
const EquipesPage = lazy(() => import('../pages/EquipesPage'));
const OrcamentosPage = lazy(() => import('../pages/OrcamentosPage'));
const Relatorios = lazy(() => import('../pages/Relatorios'));
const DashboardPremium = lazy(() => import('../pages/DashboardPremium'));
const AnaliseProducaoPage = lazy(() => import('../pages/AnaliseProducaoPage'));
const DiarioProducaoPage = lazy(() => import('../pages/DiarioProducaoPage'));

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

export default function MobileApp() {
  // Marca a abertura do app como referência inicial de "atualizado há X".
  useEffect(() => { initLastRefresh(); }, []);
  return (
    <ERPProvider>
      <ProducaoFabricaProvider>
        <ObraMobileProvider>
          <style>{FOCUS_STYLES}</style>
          <SyncManager />
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
      <Route path="3d" element={<Protected perm="producao.view"><DesktopWrap title="Visualizador 3D"><MontexERP3DPage /></DesktopWrap></Protected>} />
      <Route path="kanban" element={<Protected perm="kanban.view"><DesktopWrap title="Kanban Produção"><KanbanProducaoIntegrado /></DesktopWrap></Protected>} />
      <Route path="kanban-corte" element={<Protected perm="kanban.view"><DesktopWrap title="Kanban Corte"><KanbanCortePage /></DesktopWrap></Protected>} />
      <Route path="expedicao-desktop" element={<Protected perm="expedicao.view"><DesktopWrap title="Expedição (desktop)"><EnviosExpedicaoPage /></DesktopWrap></Protected>} />
      <Route path="estoque" element={<Protected perm="estoque.view"><EstoqueMobile /></Protected>} />
      <Route path="medicao" element={<Protected perm="medicao.view"><MedicaoMobile /></Protected>} />
      <Route path="estoque-desktop" element={<Protected perm="estoque.view"><DesktopWrap title="Estoque (desktop)"><EstoquePageV2 /></DesktopWrap></Protected>} />
      <Route path="despesas" element={<Protected perm="financeiro.view"><DesktopWrap title="Despesas"><DespesasPage /></DesktopWrap></Protected>} />
      <Route path="receitas" element={<Protected perm="financeiro.view"><DesktopWrap title="Receitas"><ReceitasPage /></DesktopWrap></Protected>} />
      <Route path="obras-gfo" element={<Protected perm="financeiro.view"><DesktopWrap title="Gestão por Obra"><GestaoFinanceiraObra /></DesktopWrap></Protected>} />
      <Route path="dre" element={<Protected perm="financeiro.view"><DesktopWrap title="DRE"><DREPage /></DesktopWrap></Protected>} />
      <Route path="obras" element={<Protected perm="projetos.view"><DesktopWrap title="Obras"><Projetos /></DesktopWrap></Protected>} />
      <Route path="clientes" element={<Protected perm="clientes.view"><DesktopWrap title="Clientes"><Clientes /></DesktopWrap></Protected>} />
      <Route path="equipes" element={<Protected perm="equipes.view"><DesktopWrap title="Equipes"><EquipesPage /></DesktopWrap></Protected>} />
      <Route path="orcamentos" element={<Protected perm="orcamentos.view"><DesktopWrap title="Orçamentos"><OrcamentosPage /></DesktopWrap></Protected>} />
      <Route path="relatorios" element={<Protected perm="relatorios.view"><DesktopWrap title="Relatórios"><Relatorios /></DesktopWrap></Protected>} />
      <Route path="dashboard" element={<Protected perm="bi.view"><DesktopWrap title="Dashboard BI"><DashboardPremium /></DesktopWrap></Protected>} />
      <Route path="analise-producao" element={<Protected perm="producao.view"><DesktopWrap title="Análise Produção"><AnaliseProducaoPage /></DesktopWrap></Protected>} />
      <Route path="diario" element={<Protected perm="producao.view"><DesktopWrap title="Diário Produção"><DiarioProducaoPage /></DesktopWrap></Protected>} />
      <Route path="notificacoes" element={<MobileLayout title="Notificações" back><div className="p-6 text-slate-400 text-sm text-center">Sem notificações</div></MobileLayout>} />
      <Route path="perfil" element={<PerfilMobile />} />
      <Route path="config" element={<ConfiguracoesMobile />} />

      <Route path="*" element={<Navigate to="/m" replace />} />
    </Routes>
  );
}

