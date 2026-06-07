// ============================================================
// MOBILE LAYOUT - MONTEX MOBILE
// ============================================================
// Layout mobile-first com:
//  - Header sticky (logo + ações)
//  - Conteúdo scrollável com safe-area
//  - Bottom tabs (5 ícones)
//  - Drawer lateral (módulos extras)
// Tema escuro otimizado para galpão/canteiro.
// ============================================================
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Factory, Hammer, Wallet, MoreHorizontal,
  Bell, Search, LogOut, ChevronRight, X, User,
  BarChart3, Package, Truck, FileText, Settings,
  Box, Scissors, Users, ClipboardList, Building2,
  Calculator, Receipt, TrendingUp, Activity, PieChart, Ruler,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useERP } from '@/contexts/ERPContext';
import ObraSelector from './components/ObraSelector';
import MobilePageSkeleton from './ui/Skeleton';
import PullToRefresh from './ui/PullToRefresh';

// 5 abas inferiores (sempre visíveis)
const BOTTOM_TABS = [
  { path: '/m', icon: Home, label: 'Início' },
  { path: '/m/producao', icon: Factory, label: 'Produção' },
  { path: '/m/montagem', icon: Hammer, label: 'Montagem' },
  { path: '/m/expedicao', icon: Truck, label: 'Expedição' },
  { path: '/m/mais', icon: MoreHorizontal, label: 'Mais' },
];

// Drawer: módulos extras agrupados
const DRAWER_GROUPS = [
  {
    title: 'Operação',
    items: [
      { path: '/m/kanban', icon: ClipboardList, label: 'Kanban Produção' },
      { path: '/m/kanban-corte', icon: Scissors, label: 'Kanban Corte' },
      { path: '/m/expedicao', icon: Truck, label: 'Expedição' },
      { path: '/m/medicao', icon: Ruler, label: 'Medição' },
      { path: '/m/3d', icon: Box, label: 'Visualizador 3D' },
      { path: '/m/estoque', icon: Package, label: 'Estoque' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { path: '/m/financeiro', icon: Wallet, label: 'Painel' },
      { path: '/m/despesas', icon: Receipt, label: 'Despesas' },
      { path: '/m/receitas', icon: TrendingUp, label: 'Receitas' },
      { path: '/m/dre', icon: PieChart, label: 'DRE' },
      { path: '/m/obras-gfo', icon: Building2, label: 'Gestão por Obra' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { path: '/m/obras', icon: Building2, label: 'Obras' },
      { path: '/m/clientes', icon: User, label: 'Clientes' },
      { path: '/m/equipes', icon: Users, label: 'Equipes' },
      { path: '/m/orcamentos', icon: Calculator, label: 'Orçamentos' },
      { path: '/m/relatorios', icon: FileText, label: 'Relatórios' },
    ],
  },
  {
    title: 'Analítico',
    items: [
      { path: '/m/dashboard', icon: BarChart3, label: 'Dashboard BI' },
      { path: '/m/analise-producao', icon: Activity, label: 'Análise Produção' },
      { path: '/m/diario', icon: ClipboardList, label: 'Diário Produção' },
    ],
  },
];

export default function MobileLayout({ children, title = 'Montex Mobile', back = false, obraFilter = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth() || {};
  const { dataSource, reloadPecas } = useERP() || {};
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Carregamento inicial dos dados do ERP (Supabase). Mostra esqueleto em vez de
  // telas zeradas/vazias — importante em rede lenta de galpão/canteiro.
  const carregando = dataSource === 'loading';
  // Puxar-para-atualizar recarrega as peças (produção/montagem/expedição mudam
  // o tempo todo no chão de fábrica).
  const handleRefresh = async () => { await reloadPecas?.(); };

  // Fechar drawer ao navegar
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* HEADER ───────────────────────────── */}
      <header
        className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800/80 px-4 flex items-center gap-3 shadow-md"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', minHeight: 'calc(env(safe-area-inset-top) + 56px)' }}
      >
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-800 active:bg-slate-700 transition"
            aria-label="Voltar"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
        ) : (
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-800 active:bg-slate-700 transition"
            aria-label="Menu"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-sm">M</div>
          </button>
        )}
        <h1 className="flex-1 font-bold text-base tracking-tight truncate">{title}</h1>
        <button className="w-11 h-11 -mr-1 flex items-center justify-center rounded-lg hover:bg-slate-800 active:bg-slate-700 transition relative" aria-label="Notificações" onClick={() => navigate('/m/notificacoes')}>
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
        </button>
      </header>

      {/* CONTEÚDO ──────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        <PullToRefresh onRefresh={handleRefresh}>
          {obraFilter && !carregando && (
            <div className="sticky top-0 z-20">
              <ObraSelector />
            </div>
          )}
          <div className="pb-24">{carregando ? <MobilePageSkeleton /> : children}</div>
        </PullToRefresh>
      </main>

      {/* BOTTOM TABS ──────────────────────── */}
      <nav
        className="flex-shrink-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-stretch justify-around"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)', minHeight: '64px' }}
      >
        {BOTTOM_TABS.map(t => {
          const Icon = t.icon;
          // Precisão: '/m/montagem' ativa Montagem, mas '/m/maisItem' NÃO deve ativar 'Mais'.
          // Usa startsWith(t.path + '/') para casar só sub-rotas reais.
          const active = location.pathname === t.path || (t.path !== '/m' && location.pathname.startsWith(t.path + '/'));
          return (
            <Link
              key={t.path}
              to={t.path}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => {
                // Padrão iOS: tocar na aba JÁ ativa rola o conteúdo para o topo
                // (em vez de re-navegar para a mesma rota).
                if (active) {
                  e.preventDefault();
                  // Scroll instantâneo: o smooth não funciona neste scroller
                  // (-webkit-overflow-scrolling: touch + overscroll-contain o ignoram).
                  const sc = document.querySelector('main .overflow-y-auto');
                  if (sc) sc.scrollTop = 0;
                }
              }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 active:bg-slate-800/70 transition relative"
            >
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-amber-500 rounded-b" />}
              <Icon className={`w-5 h-5 transition ${active ? 'text-amber-400' : 'text-slate-400'}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${active ? 'text-amber-400' : 'text-slate-400'}`}>{t.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* DRAWER LATERAL — filhos keyed diretos (sem Fragment) para AnimatePresence
          rastrear o exit e desmontar corretamente. Mesmo padrão do bottom sheet. */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setDrawerOpen(false)}
          />
        )}
        {drawerOpen && (
          <motion.aside
            key="drawer-panel"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.24, ease: 'easeOut' }}
            className="fixed top-0 left-0 bottom-0 w-[82%] max-w-[320px] bg-slate-900 border-r border-slate-800 z-50 flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
              {/* Header do Drawer */}
              <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-lg">M</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{user?.full_name || 'Usuário'}</div>
                  <div className="text-[11px] text-slate-400 truncate">{user?.email || '—'}</div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-800 active:bg-slate-700" aria-label="Fechar menu">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grupos de módulos */}
              <div className="flex-1 overflow-y-auto py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                {DRAWER_GROUPS.map(g => (
                  <div key={g.title} className="mb-2">
                    <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</div>
                    {g.items.map(item => {
                      const Icon = item.icon;
                      const active = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-3 active:bg-slate-800/80 transition border-l-2 ${active ? 'border-amber-500 bg-slate-800/60' : 'border-transparent'}`}
                        >
                          <Icon className={`w-5 h-5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span className={`text-sm flex-1 ${active ? 'text-amber-400 font-semibold' : 'text-slate-200'}`}>{item.label}</span>
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Logout */}
              <div className="border-t border-slate-800 p-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
                <button
                  onClick={() => { logout?.(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 text-red-300 font-semibold text-sm transition"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
