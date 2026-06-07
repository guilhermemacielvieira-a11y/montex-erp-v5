// ============================================================
// MOBILE APP - Roteamento e wrapper geral
// ============================================================
// Mantém o mesmo ERPContext / AuthContext / Supabase do desktop.
// Rotas mobile montadas em /m/*
// Páginas desktop são exibidas em modo mobile via wrapper "DesktopInMobile"
// (com header voltar) quando não há versão mobile dedicada.
// ============================================================
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
  return (
    <ERPProvider>
      <ProducaoFabricaProvider>
        <ObraMobileProvider>
          <style>{FOCUS_STYLES}</style>
          <MobileRoutes />
        </ObraMobileProvider>
      </ProducaoFabricaProvider>
    </ERPProvider>
  );
}

function MobileRoutes() {
  return (
    <Routes>
      <Route index element={<HomeMobile />} />
      <Route path="producao" element={<ProducaoMobile />} />
      <Route path="montagem" element={<MontagemMobile />} />
      <Route path="financeiro" element={<FinanceiroMobile />} />
      <Route path="expedicao" element={<ExpedicaoMobile />} />
      <Route path="mais" element={<MaisMobile />} />

      {/* Páginas desktop em wrapper */}
      <Route path="3d" element={<DesktopWrap title="Visualizador 3D"><MontexERP3DPage /></DesktopWrap>} />
      <Route path="kanban" element={<DesktopWrap title="Kanban Produção"><KanbanProducaoIntegrado /></DesktopWrap>} />
      <Route path="kanban-corte" element={<DesktopWrap title="Kanban Corte"><KanbanCortePage /></DesktopWrap>} />
      <Route path="expedicao-desktop" element={<DesktopWrap title="Expedição (desktop)"><EnviosExpedicaoPage /></DesktopWrap>} />
      <Route path="estoque" element={<EstoqueMobile />} />
      <Route path="medicao" element={<MedicaoMobile />} />
      <Route path="estoque-desktop" element={<DesktopWrap title="Estoque (desktop)"><EstoquePageV2 /></DesktopWrap>} />
      <Route path="despesas" element={<DesktopWrap title="Despesas"><DespesasPage /></DesktopWrap>} />
      <Route path="receitas" element={<DesktopWrap title="Receitas"><ReceitasPage /></DesktopWrap>} />
      <Route path="obras-gfo" element={<DesktopWrap title="Gestão por Obra"><GestaoFinanceiraObra /></DesktopWrap>} />
      <Route path="dre" element={<DesktopWrap title="DRE"><DREPage /></DesktopWrap>} />
      <Route path="obras" element={<DesktopWrap title="Obras"><Projetos /></DesktopWrap>} />
      <Route path="clientes" element={<DesktopWrap title="Clientes"><Clientes /></DesktopWrap>} />
      <Route path="equipes" element={<DesktopWrap title="Equipes"><EquipesPage /></DesktopWrap>} />
      <Route path="orcamentos" element={<DesktopWrap title="Orçamentos"><OrcamentosPage /></DesktopWrap>} />
      <Route path="relatorios" element={<DesktopWrap title="Relatórios"><Relatorios /></DesktopWrap>} />
      <Route path="dashboard" element={<DesktopWrap title="Dashboard BI"><DashboardPremium /></DesktopWrap>} />
      <Route path="analise-producao" element={<DesktopWrap title="Análise Produção"><AnaliseProducaoPage /></DesktopWrap>} />
      <Route path="diario" element={<DesktopWrap title="Diário Produção"><DiarioProducaoPage /></DesktopWrap>} />
      <Route path="notificacoes" element={<MobileLayout title="Notificações" back><div className="p-6 text-slate-400 text-sm text-center">Sem notificações</div></MobileLayout>} />
      <Route path="perfil" element={<MobileLayout title="Perfil" back><div className="p-6 text-slate-400 text-sm text-center">Em breve</div></MobileLayout>} />
      <Route path="config" element={<MobileLayout title="Configurações" back><div className="p-6 text-slate-400 text-sm text-center">Em breve</div></MobileLayout>} />

      <Route path="*" element={<Navigate to="/m" replace />} />
    </Routes>
  );
}

