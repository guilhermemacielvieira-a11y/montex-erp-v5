import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard,
  Calculator,
  FileSearch,
  MessageSquare,
  Wrench,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  CheckSquare,
  DollarSign,
  Package,
  Zap,
  Gauge,
  Database,
  Activity,
  TrendingUp,
  Globe,
  Monitor,
  Settings,
  Target,
  HardHat,
  PieChart,
  BookOpen,
  Sparkles,
  Flag,
  UserCheck,
  Building,
  Wallet,
  Receipt,
  Truck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Scissors,
  Warehouse,
  ShoppingCart,
  FileSpreadsheet,
  ClipboardList,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import NotificationCenter from '@/components/NotificationCenter';
import { motion, AnimatePresence } from 'framer-motion';
import CommandPalette from '@/components/desktop/CommandPalette';
import KeyboardShortcuts from '@/components/desktop/KeyboardShortcuts';
import ShortcutsHelp from '@/components/desktop/ShortcutsHelp';
import { toast } from 'sonner';
import DisplaySettings from '@/components/DisplaySettings';
import { useDisplay } from '@/contexts/DisplayContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useNotification } from '@/contexts/NotificationContext';

// ====== COMPONENTES ERP ======
import { ERPProvider, useERP } from '@/contexts/ERPContext';
import SeletorObra from '@/components/erp/SeletorObra';
import ProgressoObra from '@/components/erp/ProgressoObra';
import Notificacoes from '@/components/erp/Notificacoes';

// ====== MONTEX ERP PREMIUM - MENU ACORDEÃO POR FLUXO ======
const navigationCategories = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    color: 'text-emerald-500',
    bgHover: 'hover:bg-emerald-500/10',
    items: [
      { name: 'Visão Geral', href: 'DashboardPremium', icon: LayoutDashboard },
      { name: 'ERP Integrado', href: 'DashboardERPIntegrado', icon: Database, badge: 'NEW' },
    ]
  },
  {
    id: 'comercial',
    name: '1. Comercial',
    icon: DollarSign,
    color: 'text-green-500',
    bgHover: 'hover:bg-green-500/10',
    badge: '💰',
    items: [
      { name: 'Orçamentos', href: 'OrcamentosPage', icon: Calculator, badge: 'NEW' },
      { name: 'Simulador Orçamento', href: 'SimuladorOrcamento', icon: Target, badge: 'CALC' },
      { name: 'Clientes', href: 'Clientes', icon: Users },
      { name: 'Projetos', href: 'Projetos', icon: Building2 },
    ]
  },
  {
    id: 'suprimentos',
    name: '2. Suprimentos',
    icon: ShoppingCart,
    color: 'text-amber-500',
    bgHover: 'hover:bg-amber-500/10',
    badge: '📦',
    items: [
      { name: 'Import Listas', href: 'ImportRomaneioPage', icon: FileSpreadsheet, badge: 'GADE' },
      { name: 'Croquis', href: 'CroquisPage', icon: FileSearch, badge: 'PDF' },
      { name: 'Detalhamentos', href: 'DetalhamentosPage', icon: ClipboardList, badge: 'EM' },
      { name: 'Estoque', href: 'EstoquePage', icon: Warehouse, badge: '📊' },
    ]
  },
  {
    id: 'producao',
    name: '3. Produção (Fábrica)',
    icon: Package,
    color: 'text-orange-500',
    bgHover: 'hover:bg-orange-500/10',
    badge: '🏭',
    items: [
      { name: 'Kanban Corte', href: 'KanbanCortePage', icon: Scissors, badge: '✂️' },
      { name: 'Kanban Produção', href: 'KanbanProducaoIntegrado', icon: Package, badge: 'FAB' },
      { name: 'Por Funcionário', href: 'ProducaoFuncionarioPage', icon: UserCheck },
      { name: 'Diário Produção', href: 'DiarioProducaoPage', icon: BookOpen },
      { name: 'Equipes', href: 'EquipesPage', icon: Users },
    ]
  },
  {
    id: 'expedicao',
    name: '4. Expedição',
    icon: Truck,
    color: 'text-cyan-500',
    bgHover: 'hover:bg-cyan-500/10',
    badge: '🚚',
    items: [
      { name: 'Envios', href: 'EnviosExpedicaoPage', icon: Truck, badge: 'LIVE' },
      { name: 'Romaneios Integrado', href: 'ExpedicaoIntegrado', icon: ClipboardList, badge: 'INT' },
    ]
  },
  {
    id: 'obras',
    name: '5. Obras (Campo)',
    icon: HardHat,
    color: 'text-teal-500',
    bgHover: 'hover:bg-teal-500/10',
    badge: '🏗️',
    items: [
      { name: 'Multi-Obras', href: 'MultiObrasPage', icon: Building, badge: 'ALL' },
      { name: 'Montagem', href: 'MontagemPage', icon: HardHat },
    ]
  },
  {
    id: 'medicao',
    name: 'Medição',
    icon: Target,
    color: 'text-emerald-500',
    bgHover: 'hover:bg-emerald-500/10',
    badge: 'R$/KG',
    items: [
      { name: 'Obra Campo', href: 'MedicaoPage', icon: HardHat, badge: '🏗️' },
      { name: 'Produção', href: 'MedicaoAutomaticaPage', icon: Package, badge: '🏭' },
    ]
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    icon: Wallet,
    color: 'text-emerald-500',
    bgHover: 'hover:bg-emerald-500/10',
    items: [
      { name: 'Gestão Financeira Obra', href: 'GestaoFinanceiraObra', icon: DollarSign, badge: '⭐ DRE' },
      { name: 'Painel Financeiro', href: 'FinanceiroPage', icon: DollarSign },
      { name: 'Receitas', href: 'ReceitasPage', icon: Wallet, badge: 'IN' },
      { name: 'Despesas', href: 'DespesasPage', icon: Receipt, badge: 'OUT' },
      { name: 'Metas Financeiras', href: 'MetasFinanceirasPage', icon: Flag },
      { name: 'Análise de Custos', href: 'AnaliseCustosPage', icon: PieChart },
      { name: 'Centros de Custo', href: 'CentrosCustoPage', icon: Building2 },
    ]
  },
  {
    id: 'bi',
    name: 'Business Intelligence',
    icon: Database,
    color: 'text-purple-500',
    bgHover: 'hover:bg-purple-500/10',
    items: [
      { name: 'BI Estratégico', href: 'BIEstrategico', icon: Globe, badge: 'C-LEVEL' },
      { name: 'BI Tático', href: 'BITatico', icon: TrendingUp, badge: 'MGR' },
      { name: 'BI Operacional', href: 'BIOperacional', icon: Activity, badge: 'LIVE' },
      { name: 'BI Analytics', href: 'DashboardBI', icon: Database },
    ]
  },
  {
    id: 'command',
    name: 'Command Center',
    icon: Gauge,
    color: 'text-blue-500',
    bgHover: 'hover:bg-blue-500/10',
    items: [
      { name: 'Visualização 3D', href: 'MontexERP3DPage', icon: Globe, badge: '3D' },
      { name: 'Simulador', href: 'SimuladorPage', icon: Target },
      { name: 'Dashboard HUD', href: 'DashboardFuturista', icon: Gauge, badge: 'HUD' },
      { name: 'Ultrawide 49"', href: 'CommandCenterUltrawide', icon: Monitor, badge: '5K' },
      { name: 'Command Ultra', href: 'CommandCenterUltra', icon: Gauge },
    ]
  },
  {
    id: 'colaboracao',
    name: 'Colaboração & IA',
    icon: Sparkles,
    color: 'text-pink-500',
    bgHover: 'hover:bg-pink-500/10',
    items: [
      { name: 'Sugestões IA', href: 'SugestoesIAPage', icon: Sparkles, badge: 'AI' },
      { name: 'Tarefas', href: 'Tarefas', icon: CheckSquare },
      { name: 'Colaboração', href: 'ColaboracaoProjetos', icon: Users },
      { name: 'Relatórios IA', href: 'RelatoriosIA', icon: FileSearch },
      { name: 'Automações', href: 'Automacoes', icon: Zap },
      { name: 'Analisador', href: 'Analisador', icon: FileSearch },
      { name: 'Chatbot', href: 'Chatbot', icon: MessageSquare },
    ]
  },
];

// Componente de Categoria Acordeão - suporta modo colapsado
function AccordionCategory({ category, isOpen, onToggle, currentPageName, onNavigate, collapsed }) {
  const hasActiveItem = category.items.some(item => currentPageName === item.href);

  // Modo colapsado: mostra apenas ícone com dropdown ao hover
  if (collapsed) {
    return (
      <div className="mb-1 relative group">
        <div className="flex flex-col items-center">
          <Link
            to={createPageUrl(category.items[0]?.href || '')}
            onClick={onNavigate}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200",
              "text-slate-300 hover:text-white",
              category.bgHover,
              hasActiveItem && "bg-slate-800/50 ring-1 ring-orange-500/30"
            )}
            title={category.name}
          >
            <category.icon className={cn("h-5 w-5", hasActiveItem ? "text-orange-400" : category.color)} />
          </Link>
        </div>
        {/* Tooltip flyout no hover */}
        <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-[60]">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 px-1 min-w-[200px]">
            <div className={cn("px-3 py-1.5 text-xs font-semibold uppercase tracking-wider mb-1", category.color)}>
              {category.name}
            </div>
            {category.items.map((item) => {
              const isActive = currentPageName === item.href;
              return (
                <Link
                  key={item.href}
                  to={createPageUrl(item.href)}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm",
                    isActive
                      ? "bg-orange-500/20 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-orange-400" : "text-slate-500")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Modo expandido: acordeão normal
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200",
          "text-slate-300 hover:text-white",
          category.bgHover,
          hasActiveItem && "bg-slate-800/50"
        )}
      >
        <div className="flex items-center gap-3">
          <category.icon className={cn("h-4 w-4", category.color)} />
          <span className="font-medium text-sm">{category.name}</span>
          {category.badge && (
            <span className="text-xs">{category.badge}</span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pr-2 py-1 space-y-0.5">
              {category.items.map((item) => {
                const isActive = currentPageName === item.href;
                return (
                  <Link
                    key={item.href}
                    to={createPageUrl(item.href)}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150",
                      "text-sm",
                      isActive
                        ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-white border-l-2 border-orange-500"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-4 w-4",
                        isActive ? "text-orange-400" : "text-slate-500"
                      )} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={cn(
                        "px-1.5 py-0.5 text-[10px] font-semibold rounded",
                        isActive
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-slate-700 text-slate-400"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente interno do Layout que usa o contexto ERP
function LayoutContent({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [openCategories, setOpenCategories] = useState(['dashboard', 'comercial', 'suprimentos', 'producao', 'expedicao', 'obras', 'medicao', 'financeiro']);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('montex-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const location = useLocation();
  const { displaySettings, screenInfo, preferences, animationSettings } = useDisplay();
  const { user, logout } = useAuth();

  // Persiste estado da sidebar
  useEffect(() => {
    try { localStorage.setItem('montex-sidebar-collapsed', sidebarCollapsed); } catch {}
  }, [sidebarCollapsed]);

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-72';
  const sidebarMargin = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72';
  const headerLeft = sidebarCollapsed ? 'left-16' : 'left-72';

  // Usa o contexto ERP
  const { alertasEstoque, obraAtualData, notificacoes } = useERP();

  // Usa o contexto de Notificações
  const { addNotification } = useNotification();

  // Setup global notification dispatch
  useEffect(() => {
    window.__notificationDispatch = (notification) => {
      addNotification(notification);
    };

    return () => {
      delete window.__notificationDispatch;
    };
  }, [addNotification]);

  const handleLogout = () => {
    logout();
  };

  const toggleCategory = (categoryId) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleShortcut = (action) => {
    switch (action) {
      case 'show-shortcuts':
        setShowShortcuts(true);
        break;
      case 'command-palette':
        break;
      case 'new-item':
        toast.info('Pressione Ctrl+K e selecione a ação desejada');
        break;
      default:
        break;
    }
  };

  const handleCommandAction = (action) => {
    toast.success(`Ação ${action} executada`);
  };

  const filteredCategories = searchQuery
    ? navigationCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.items.length > 0)
    : navigationCategories;

  return (
    <>
      <CommandPalette onAction={handleCommandAction} />
      <KeyboardShortcuts onShortcut={handleShortcut} />
      <ShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />
      <DisplaySettings isOpen={showDisplaySettings} onClose={() => setShowDisplaySettings(false)} />
      <Notificacoes />

      <div className="min-h-screen bg-slate-950">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-3">
            <img src="/images/montex-icon.svg" alt="Montex" className="w-8 h-8" />
            <span className="text-white font-semibold">MONTEX</span>
          </div>
          <div className="flex items-center gap-2">
            <SeletorObra compact />
            <NotificationCenter />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar - Colapsável */}
        <aside
          className={cn(
            "fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-800 z-50 flex flex-col transition-all duration-300",
            sidebarCollapsed ? "w-16" : "w-72",
            "lg:translate-x-0",
            mobileOpen ? "translate-x-0 !w-72" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Logo Header */}
          <div className="h-14 flex items-center justify-between px-3 border-b border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/images/montex-icon.svg" alt="Montex" className="w-8 h-8 flex-shrink-0" />
              {(!sidebarCollapsed || mobileOpen) && (
                <div>
                  <h1 className="text-white font-bold text-base tracking-wide">MONTEX</h1>
                  <p className="text-slate-500 text-[9px] uppercase tracking-wider">ERP Premium V5</p>
                </div>
              )}
            </div>
            {(!sidebarCollapsed || mobileOpen) && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="text-slate-500 hover:text-white p-1 rounded hidden lg:flex"
                title="Recolher menu"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
            {sidebarCollapsed && !mobileOpen && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="absolute -right-3 top-4 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-orange-500/20 transition-all hidden lg:flex z-[60]"
                title="Expandir menu"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Seletor de Obra - oculto no modo colapsado */}
          {(!sidebarCollapsed || mobileOpen) && (
            <div className="p-3 border-b border-slate-800">
              <SeletorObra />
            </div>
          )}

          {/* Alertas de Estoque - compacto */}
          {alertasEstoque && alertasEstoque.length > 0 && (!sidebarCollapsed || mobileOpen) && (
            <div className="mx-3 mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-medium">{alertasEstoque.length} itens em estoque baixo</span>
              </div>
            </div>
          )}
          {alertasEstoque && alertasEstoque.length > 0 && sidebarCollapsed && !mobileOpen && (
            <div className="mx-2 mt-2 flex justify-center">
              <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-center" title={`${alertasEstoque.length} itens em estoque baixo`}>
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </div>
            </div>
          )}

          {/* Search Box - oculto no modo colapsado */}
          {(!sidebarCollapsed || mobileOpen) && (
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar módulo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-1.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className={cn(
            "flex-1 overflow-y-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent",
            sidebarCollapsed && !mobileOpen ? "px-2 pt-2" : "px-3"
          )}>
            {filteredCategories.map((category) => (
              <AccordionCategory
                key={category.id}
                category={category}
                isOpen={openCategories.includes(category.id) || searchQuery.length > 0}
                onToggle={() => toggleCategory(category.id)}
                currentPageName={currentPageName}
                onNavigate={() => setMobileOpen(false)}
                collapsed={sidebarCollapsed && !mobileOpen}
              />
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className={cn("border-t border-slate-800", sidebarCollapsed && !mobileOpen ? "p-2" : "p-3 space-y-1")}>
            {sidebarCollapsed && !mobileOpen ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  onClick={() => setShowDisplaySettings(true)}
                  title="Configurações"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                  onClick={() => setShowDisplaySettings(true)}
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Configurações
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                  onClick={() => setShowShortcuts(true)}
                >
                  <Wrench className="h-4 w-4 mr-3" />
                  Atalhos
                </Button>
              </>
            )}
          </div>

          {/* User Info */}
          {user && (
            <div className={cn("border-t border-slate-800 bg-slate-900/50", sidebarCollapsed && !mobileOpen ? "p-2" : "p-3")}>
              {sidebarCollapsed && !mobileOpen ? (
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
                    user.role === 'admin' ? 'bg-gradient-to-br from-orange-600 to-amber-700' :
                    'bg-gradient-to-br from-slate-600 to-slate-700'
                  }`} title={user.name || user.email}>
                    <span className="text-white font-bold text-sm">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <button
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800"
                    onClick={handleLogout}
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    user.role === 'admin' ? 'bg-gradient-to-br from-orange-600 to-amber-700' :
                    user.role === 'producao' ? 'bg-gradient-to-br from-blue-600 to-cyan-700' :
                    'bg-gradient-to-br from-slate-600 to-slate-700'
                  }`}>
                    <span className="text-white font-bold text-sm">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {user.name || 'Usuário'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        user.role === 'admin' ? 'bg-orange-500/20 text-orange-300' :
                        user.role === 'producao' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {(user.role || 'viewer').toUpperCase()}
                      </span>
                      <p className="text-slate-500 text-xs truncate">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-500 hover:text-white hover:bg-slate-800 flex-shrink-0"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Top Bar */}
        <header className={cn(
          "fixed top-0 right-0 h-14 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 z-40 hidden lg:flex items-center justify-between px-6 transition-all duration-300",
          headerLeft === 'left-16' ? "left-16" : "left-72"
        )}>
          <div className="flex items-center gap-4">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 mr-1"
                title="Expandir menu"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-white font-medium">
              {navigationCategories.flatMap(c => c.items).find(i => i.href === currentPageName)?.name || 'Dashboard'}
            </h2>
            {obraAtualData && (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg">
                <Building2 className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-slate-300">{obraAtualData.codigo}</span>
                <span className="text-xs text-slate-500">|</span>
                <span className="text-sm text-slate-400">{obraAtualData.nome}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ProgressoObra compact />
            <NotificationCenter />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={() => setShowDisplaySettings(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main Content - sem espaço ocioso */}
        <main className={cn(
          "min-h-screen pt-14 lg:pt-14 transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-72"
        )}>
          <motion.div
            key={currentPageName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </>
  );
}

// Layout principal com ERPProvider
export default function Layout({ children, currentPageName }) {
  return (
    <ERPProvider>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </ERPProvider>
  );
}
