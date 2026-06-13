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
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Factory, Hammer, Wallet, MoreHorizontal,
  Bell, Search, LogOut, ChevronRight, X, User,
  BarChart3, Package, Truck, FileText, Settings,
  Box, Scissors, Users, ClipboardList, Building2,
  Calculator, Receipt, TrendingUp, Activity, PieChart, Ruler, Image, Shield,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { useERP } from '@/contexts/ERPContext';
import ObraSelector from './components/ObraSelector';
import MobilePageSkeleton from './ui/Skeleton';
import PullToRefresh from './ui/PullToRefresh';
import NetworkBanner from './ui/NetworkBanner';
import LastUpdated from './ui/LastUpdated';
import PendingBadge from './ui/PendingBadge';
import { setLastRefresh } from './ui/lastRefresh';
import { useAlertas } from './useAlertas';

// 5 abas inferiores. `perm` = permissão exigida (ausente = sempre visível).
const BOTTOM_TABS = [
  { path: '/m', icon: Home, label: 'Início' },
  { path: '/m/producao', icon: Factory, label: 'Produção', perm: 'producao.view' },
  { path: '/m/montagem', icon: Hammer, label: 'Montagem', perm: 'producao.view' },
  { path: '/m/expedicao', icon: Truck, label: 'Expedição', perm: 'expedicao.view' },
  { path: '/m/mais', icon: MoreHorizontal, label: 'Mais' },
];

// Índice da aba ativa para a rota (-1 se não for aba). Usado para a direção
// do slide de transição (avançar = entra da direita; voltar = da esquerda).
function tabIndexOf(pathname) {
  return BOTTOM_TABS.findIndex(t => pathname === t.path || (t.path !== '/m' && pathname.startsWith(t.path + '/')));
}
// Última aba visitada (módulo: sobrevive ao remount por navegação).
let lastNavIndex = 0;

// Drawer: módulos extras agrupados
const DRAWER_GROUPS = [
  {
    title: 'Operação',
    items: [
      { path: '/m/kanban', icon: ClipboardList, label: 'Kanban Produção', perm: 'kanban.view' },
      { path: '/m/kanban-corte', icon: Scissors, label: 'Kanban Corte', perm: 'kanban.view' },
      { path: '/m/expedicao', icon: Truck, label: 'Expedição', perm: 'expedicao.view' },
      { path: '/m/medicao', icon: Ruler, label: 'Medição', perm: 'medicao.view' },
      { path: '/m/evidencias', icon: Image, label: 'Evidências', perm: 'producao.view' },
      { path: '/m/3d', icon: Box, label: 'Visualizador 3D', perm: 'producao.view' },
      { path: '/m/estoque', icon: Package, label: 'Estoque', perm: 'estoque.view' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { path: '/m/financeiro', icon: Wallet, label: 'Painel', perm: 'financeiro.view' },
      { path: '/m/despesas', icon: Receipt, label: 'Despesas', perm: 'financeiro.view' },
      { path: '/m/receitas', icon: TrendingUp, label: 'Receitas', perm: 'financeiro.view' },
      { path: '/m/dre', icon: PieChart, label: 'DRE', perm: 'financeiro.view' },
      { path: '/m/obras-gfo', icon: Building2, label: 'Gestão por Obra', perm: 'financeiro.view' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { path: '/m/obras', icon: Building2, label: 'Obras', perm: 'projetos.view' },
      { path: '/m/clientes', icon: User, label: 'Clientes', perm: 'clientes.view' },
      { path: '/m/equipes', icon: Users, label: 'Equipes', perm: 'equipes.view' },
      { path: '/m/orcamentos', icon: Calculator, label: 'Orçamentos', perm: 'orcamentos.view' },
      { path: '/m/relatorios', icon: FileText, label: 'Relatórios', perm: 'relatorios.view' },
    ],
  },
  {
    title: 'Analítico',
    items: [
      { path: '/m/dashboard', icon: BarChart3, label: 'Dashboard BI', perm: 'bi.view' },
      { path: '/m/analise-producao', icon: Activity, label: 'Análise Produção', perm: 'producao.view' },
      { path: '/m/diario', icon: ClipboardList, label: 'Diário Produção', perm: 'producao.view' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { path: '/m/usuarios', icon: Shield, label: 'Usuários', perm: 'usuarios.manage' },
    ],
  },
];

export default function MobileLayout({ children, title = 'Montex Mobile', back = false, onBack = null, obraFilter = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth() || {};
  const { dataSource, reloadPecas, reloadEstoque, reloadExpedicoes } = useERP() || {};
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Menu por ROLE: esconde tabs/itens cuja permissão o usuário não tem (operador
  // não vê Financeiro/BI/Expedição etc.). Sem hasPermission (fallback) mostra tudo.
  const visibleTabs = useMemo(
    () => BOTTOM_TABS.filter(t => !t.perm || !hasPermission || hasPermission(t.perm)),
    [hasPermission]
  );
  const visibleGroups = useMemo(
    () => DRAWER_GROUPS
      .map(g => ({ ...g, items: g.items.filter(i => !i.perm || !hasPermission || hasPermission(i.perm)) }))
      .filter(g => g.items.length > 0),
    [hasPermission]
  );
  const [refreshTick, setRefreshTick] = useState(0); // força releitura do "atualizado há X"
  // Carregamento inicial dos dados do ERP (Supabase). Mostra esqueleto em vez de
  // telas zeradas/vazias — importante em rede lenta de galpão/canteiro.
  const carregando = dataSource === 'loading';
  const nAlertas = useAlertas().length; // contagem real p/ o badge do sino
  // Puxar-para-atualizar recarrega os dados operacionais que mudam o tempo todo
  // no chão de fábrica (peças/produção/montagem, estoque e romaneios), em paralelo.
  const handleRefresh = async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.error('Sem conexão — não foi possível atualizar');
      return;
    }
    await Promise.all([reloadPecas?.(), reloadEstoque?.(), reloadExpedicoes?.()]);
    setLastRefresh();
    setRefreshTick(t => t + 1);
  };

  // Direção do slide de transição conforme a ordem das abas (avançar/voltar).
  // Lido na montagem (lastNavIndex ainda é a aba anterior); atualizado no efeito.
  const slideDir = useMemo(() => {
    const cur = tabIndexOf(location.pathname);
    if (cur < 0 || lastNavIndex < 0) return 0;
    return cur === lastNavIndex ? 0 : (cur > lastNavIndex ? 1 : -1);
  }, [location.pathname]);
  useEffect(() => {
    const cur = tabIndexOf(location.pathname);
    if (cur >= 0) lastNavIndex = cur;
  }, [location.pathname]);

  // Fechar drawer ao navegar
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <div className="montex-mobile fixed inset-0 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* HEADER ───────────────────────────── */}
      <header
        className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800/80 px-4 flex items-center gap-3 shadow-md"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', minHeight: 'calc(env(safe-area-inset-top) + 56px)' }}
      >
        {back ? (
          <button
            onClick={onBack || (() => navigate(-1))}
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
        <PendingBadge />
        <LastUpdated tick={refreshTick} />
        <button className="w-11 h-11 -mr-1 flex items-center justify-center rounded-lg hover:bg-slate-800 active:bg-slate-700 transition relative" aria-label={nAlertas ? `Notificações, ${nAlertas} alerta(s)` : 'Notificações'} onClick={() => navigate('/m/notificacoes')}>
          <Bell className="w-5 h-5" />
          {nAlertas > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">{nAlertas > 9 ? '9+' : nAlertas}</span>
          )}
        </button>
      </header>

      {/* Aviso de rede/falha (offline ou erro de carga) */}
      <NetworkBanner erro={dataSource === 'error'} />

      {/* CONTEÚDO ──────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        <PullToRefresh onRefresh={handleRefresh}>
          {obraFilter && !carregando && (
            <div className="sticky top-0 z-20">
              <ObraSelector />
            </div>
          )}
          {/* Transição de rota: o CONTEÚDO desliza ao montar — horizontal e direcional
              entre abas (avançar=da direita, voltar=da esquerda), settle vertical nas
              demais rotas. Não é fixed → transform seguro; sem AnimatePresence → sem
              vazar camadas. Padrão nativo de tab bar (conteúdo desliza, chrome fica). */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: slideDir * 24, y: slideDir === 0 ? 8 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pb-24"
          >
            {carregando ? <MobilePageSkeleton /> : children}
          </motion.div>
        </PullToRefresh>
      </main>

      {/* BOTTOM TABS ──────────────────────── */}
      <nav
        className="flex-shrink-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-stretch justify-around"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)', minHeight: '64px' }}
      >
        {visibleTabs.map(t => {
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
              {/* Header do Drawer — toca para abrir o Perfil */}
              <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950">
                <Link to="/m/perfil" className="flex-1 flex items-center gap-3 min-w-0 active:opacity-80">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-lg">M</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{user?.nome || user?.name || 'Usuário'}</div>
                    <div className="text-[11px] text-slate-400 truncate">{user?.email || '—'}</div>
                  </div>
                </Link>
                <button onClick={() => setDrawerOpen(false)} className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-800 active:bg-slate-700" aria-label="Fechar menu">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grupos de módulos */}
              <div className="flex-1 overflow-y-auto py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                {visibleGroups.map(g => (
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
