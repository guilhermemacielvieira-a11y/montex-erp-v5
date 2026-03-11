import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth, ROLE_COLORS, ROLE_LABELS } from '@/lib/AuthContext';
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
  ChevronRight,
  ChevronLeft,
  Search,
  Scissors,
  Warehouse,
  ShoppingCart,
  FileSpreadsheet,
  ClipboardList,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
  FileBarChart,
  Bell,
  Sun,
  Moon,
  Maximize2,
  Command,
  MoreHorizontal,
  Home,
  BarChart3,
  Layers
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
import Breadcrumbs from '@/components/Breadcrumbs';

// ====== COMPONENTES ERP ======
import { ERPProvider, useERP } from '@/contexts/ERPContext';
import { ProducaoFabricaProvider } from '@/contexts/ProducaoFabricaContext';
import SeletorObra from '@/components/erp/SeletorObra';
import ProgressoObra from '@/components/erp/ProgressoObra';
import Notificacoes from '@/components/erp/Notificacoes';

// ====== MONTEX LOGO SVG INLINE ======
const MontexLogoIcon = ({ className = "w-9 h-9" }) => (
  <div className={cn("relative flex-shrink-0", className)}>
    <img
      src="/images/proposta/logo-montex.png"
      alt="Montex"
      className="w-full h-full object-contain"
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
    <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg items-center justify-center text-white font-black text-lg hidden">
      M
    </div>
  </div>
);

// ====== PREMIUM NAVIGATION STRUCTURE ======
const navigationCategories = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    gradient: 'from-emerald-500 to-teal-600',
    color: 'text-emerald-400',
    activeColor: 'bg-emerald-500/15 border-emerald-500/40',
    items: [
      { name: 'Visão Geral', href: 'VisaoGeralPage', icon: LayoutDashboard, badge: 'LIVE', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
      { name: 'Dashboard', href: 'DashboardPremium', icon: LayoutDashboard },
      { name: 'BI Analytics', href: 'DashboardBI', icon: Database, badge: 'OLAP', badgeColor: 'bg-blue-500/20 text-blue-400' },
    ]
  },
  {
    id: 'comercial',
    name: 'Comercial',
    icon: DollarSign,
    gradient: 'from-green-500 to-emerald-600',
    color: 'text-green-400',
    activeColor: 'bg-green-500/15 border-green-500/40',
    step: 1,
    items: [
      { name: 'Orçamentos', href: 'OrcamentosPage', icon: Calculator, badge: 'NEW', badgeColor: 'bg-orange-500/20 text-orange-400' },
      { name: 'Simulador Orçamento', href: 'SimuladorOrcamento', icon: Target },
      { name: 'Clientes', href: 'Clientes', icon: Users },
      { name: 'Projetos', href: 'Projetos', icon: Building2 },
    ]
  },
  {
    id: 'suprimentos',
    name: 'Suprimentos',
    icon: ShoppingCart,
    gradient: 'from-amber-500 to-orange-600',
    color: 'text-amber-400',
    activeColor: 'bg-amber-500/15 border-amber-500/40',
    step: 2,
    items: [
      { name: 'Import Listas', href: 'ImportRomaneioPage', icon: FileSpreadsheet, badge: 'GADE', badgeColor: 'bg-amber-500/20 text-amber-400' },
      { name: 'Croquis', href: 'CroquisPage', icon: FileSearch },
      { name: 'Detalhamentos', href: 'DetalhamentosPage', icon: ClipboardList },
      { name: 'Estoque', href: 'EstoquePage', icon: Warehouse },
      { name: 'Compras', href: 'ComprasPage', icon: ShoppingCart, badge: 'NEW', badgeColor: 'bg-orange-500/20 text-orange-400' },
    ]
  },
  {
    id: 'producao',
    name: 'Produção',
    icon: Package,
    gradient: 'from-orange-500 to-red-600',
    color: 'text-orange-400',
    activeColor: 'bg-orange-500/15 border-orange-500/40',
    step: 3,
    items: [
      { name: 'Kanban Corte', href: 'KanbanCortePage', icon: Scissors },
      { name: 'Kanban Produção', href: 'KanbanProducaoIntegrado', icon: Package },
      { name: 'Por Funcionário', href: 'ProducaoFuncionarioPage', icon: UserCheck },
      { name: 'Diário Produção', href: 'DiarioProducaoPage', icon: BookOpen },
      { name: 'Análise Produção', href: 'AnaliseProducaoPage', icon: Activity },
      { name: 'Equipes', href: 'EquipesPage', icon: Users },
      { name: 'RH', href: 'RHPage', icon: Users, badge: 'NEW', badgeColor: 'bg-orange-500/20 text-orange-400' },
    ]
  },
  {
    id: 'expedicao',
    name: 'Expedição',
    icon: Truck,
    gradient: 'from-cyan-500 to-blue-600',
    color: 'text-cyan-400',
    activeColor: 'bg-cyan-500/15 border-cyan-500/40',
    step: 4,
    items: [
      { name: 'Envios', href: 'EnviosExpedicaoPage', icon: Truck, badge: 'LIVE', badgeColor: 'bg-cyan-500/20 text-cyan-400' },
      { name: 'Romaneios Integrado', href: 'ExpedicaoIntegrado', icon: ClipboardList },
    ]
  },
  {
    id: 'obras',
    name: 'Obras',
    icon: HardHat,
    gradient: 'from-teal-500 to-cyan-600',
    color: 'text-teal-400',
    activeColor: 'bg-teal-500/15 border-teal-500/40',
    step: 5,
    items: [
      { name: 'Multi-Obras', href: 'MultiObrasPage', icon: Building },
      { name: 'Gestão Obras', href: 'GestaoObrasPage', icon: Building2, badge: 'NEW', badgeColor: 'bg-orange-500/20 text-orange-400' },
      { name: 'Montagem', href: 'MontagemPage', icon: HardHat },
    ]
  },
  {
    id: 'medicao',
    name: 'Medição',
    icon: Target,
    gradient: 'from-emerald-500 to-green-600',
    color: 'text-emerald-400',
    activeColor: 'bg-emerald-500/15 border-emerald-500/40',
    items: [
      { name: 'Produção', href: 'MedicaoAutomaticaPage', icon: Package },
    ]
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    icon: Wallet,
    gradient: 'from-emerald-500 to-teal-600',
    color: 'text-emerald-400',
    activeColor: 'bg-emerald-500/15 border-emerald-500/40',
    items: [
      { name: 'Gestão Financeira Obra', href: 'GestaoFinanceiraObra', icon: DollarSign, badge: 'DRE', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
      { name: 'Painel Financeiro', href: 'FinanceiroPage', icon: DollarSign },
      { name: 'Receitas', href: 'ReceitasPage', icon: Wallet },
      { name: 'Despesas', href: 'DespesasPage', icon: Receipt },
      { name: 'Metas Financeiras', href: 'MetasFinanceirasPage', icon: Flag },
      { name: 'Análise de Custos', href: 'AnaliseCustosPage', icon: PieChart },
      { name: 'Centros de Custo', href: 'CentrosCustoPage', icon: Building2 },
      { name: 'Relatórios Financeiros', href: 'RelatoriosFinanceiros', icon: FileBarChart, badge: 'NEW', badgeColor: 'bg-orange-500/20 text-orange-400' },
      { name: 'Vendas', href: 'VendasPage', icon: TrendingUp, badge: 'NEW', badgeColor: 'bg-orange-500/20 text-orange-400' },
    ]
  },
  {
    id: 'bi',
    name: 'Business Intelligence',
    icon: Database,
    gradient: 'from-purple-500 to-violet-600',
    color: 'text-purple-400',
    activeColor: 'bg-purple-500/15 border-purple-500/40',
    items: [
      { name: 'BI Estratégico', href: 'BIEstrategico', icon: Globe, badge: 'C-LEVEL', badgeColor: 'bg-purple-500/20 text-purple-400' },
      { name: 'BI Tático', href: 'BITatico', icon: TrendingUp, badge: 'MGR', badgeColor: 'bg-indigo-500/20 text-indigo-400' },
      { name: 'BI Operacional', href: 'BIOperacional', icon: Activity, badge: 'LIVE', badgeColor: 'bg-violet-500/20 text-violet-400' },
    ]
  },
  {
    id: 'command',
    name: 'Command Center',
    icon: Gauge,
    gradient: 'from-blue-500 to-indigo-600',
    color: 'text-blue-400',
    activeColor: 'bg-blue-500/15 border-blue-500/40',
    items: [
      { name: 'Visualização 3D', href: 'MontexERP3DPage', icon: Globe, badge: '3D', badgeColor: 'bg-blue-500/20 text-blue-400' },
      { name: 'Simulador', href: 'SimuladorPage', icon: Target },
      { name: 'Ultrawide 49"', href: 'CommandCenterUltrawide', icon: Monitor, badge: '5K', badgeColor: 'bg-indigo-500/20 text-indigo-400' },
      { name: 'Command Ultra', href: 'CommandCenterUltra', icon: Gauge },
    ]
  },
  {
    id: 'colaboracao',
    name: 'Colaboração & IA',
    icon: Sparkles,
    gradient: 'from-pink-500 to-rose-600',
    color: 'text-pink-400',
    activeColor: 'bg-pink-500/15 border-pink-500/40',
    items: [
      { name: 'Sugestões IA', href: 'SugestoesIAPage', icon: Sparkles, badge: 'AI', badgeColor: 'bg-pink-500/20 text-pink-400' },
      { name: 'Tarefas', href: 'Tarefas', icon: CheckSquare },
      { name: 'Colaboração', href: 'ColaboracaoProjetos', icon: Users },
      { name: 'Relatórios IA', href: 'RelatoriosIA', icon: FileSearch },
      { name: 'Relatórios', href: 'Relatorios', icon: FileBarChart, badge: 'NEW', badgeColor: 'bg-orange-500/20 text-orange-400' },
      { name: 'Gerenciador Relatórios', href: 'GerenciadorRelatorios', icon: FileBarChart },
      { name: 'Agendamento Relatórios', href: 'AgendamentosRelatorios', icon: FileBarChart },
      { name: 'Automações', href: 'Automacoes', icon: Zap },
      { name: 'Analisador', href: 'Analisador', icon: FileSearch },
      { name: 'Chatbot', href: 'Chatbot', icon: MessageSquare },
    ]
  },
  {
    id: 'sistema',
    name: 'Sistema',
    icon: Settings,
    gradient: 'from-slate-400 to-slate-600',
    color: 'text-slate-400',
    activeColor: 'bg-slate-500/15 border-slate-500/40',
    items: [
      { name: 'Usuários', href: 'UsuariosPage', icon: Users, badge: 'ADMIN', badgeColor: 'bg-red-500/20 text-red-400' },
    ]
  },
];

// ====== PERMISSÕES POR CATEGORIA ======
const CATEGORY_PERMISSIONS = {
  'dashboard': 'dashboard.view',
  'comercial': 'orcamentos.view',
  'suprimentos': 'estoque.view',
  'producao': 'producao.view',
  'expedicao': 'expedicao.view',
  'obras': 'producao.view',
  'medicao': 'medicao.view',
  'financeiro': 'financeiro.view',
  'bi': 'bi.view',
  'command': 'dashboard.view',
  'colaboracao': 'dashboard.view',
  'sistema': null,
};

// ====== SIDEBAR NAV ITEM (COLLAPSED) ======
function CollapsedNavItem({ category, currentPageName, onNavigate }) {
  const hasActiveItem = category.items.some(item => currentPageName === item.href);
  const [showFlyout, setShowFlyout] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setShowFlyout(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowFlyout(false), 150);
  };

  return (
    <div
      className="relative mb-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        to={createPageUrl(category.items[0]?.href || '')}
        onClick={onNavigate}
        className={cn(
          "w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all duration-200",
          hasActiveItem
            ? `bg-gradient-to-br ${category.gradient} shadow-lg shadow-${category.gradient.split('-')[1]}-500/20`
            : "text-slate-400 hover:text-white hover:bg-white/5"
        )}
        title={category.name}
      >
        <category.icon className={cn("h-[18px] w-[18px]", hasActiveItem && "text-white")} />
      </Link>

      {/* Flyout */}
      <AnimatePresence>
        {showFlyout && (
          <motion.div
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-0 ml-3 z-[70]"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 py-2 px-1 min-w-[220px]">
              <div className={cn("px-3 py-2 text-xs font-bold uppercase tracking-widest mb-1", category.color)}>
                {category.step && <span className="mr-1 opacity-50">{category.step}.</span>}
                {category.name}
              </div>
              <div className="space-y-0.5">
                {category.items.map((item) => {
                  const isActive = currentPageName === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={createPageUrl(item.href)}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-sm mx-1",
                        isActive
                          ? `bg-gradient-to-r ${category.gradient} text-white shadow-md`
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-500")} />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className={cn("px-1.5 py-0.5 text-[9px] font-bold rounded-md", item.badgeColor || "bg-slate-700 text-slate-400")}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ====== SIDEBAR ACCORDION CATEGORY (EXPANDED) ======
function AccordionCategory({ category, isOpen, onToggle, currentPageName, onNavigate }) {
  const hasActiveItem = category.items.some(item => currentPageName === item.href);

  return (
    <div className="mb-0.5">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group",
          hasActiveItem
            ? `bg-white/[0.04] border border-white/[0.06]`
            : "hover:bg-white/[0.03]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
            hasActiveItem
              ? `bg-gradient-to-br ${category.gradient} shadow-sm`
              : "bg-white/5 group-hover:bg-white/10"
          )}>
            <category.icon className={cn("h-3.5 w-3.5", hasActiveItem ? "text-white" : category.color)} />
          </div>
          <span className={cn("font-medium text-[13px]", hasActiveItem ? "text-white" : "text-slate-300")}>
            {category.step && <span className="text-slate-600 mr-1">{category.step}.</span>}
            {category.name}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-colors", isOpen ? "text-slate-400" : "text-slate-600")} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-[22px] pr-2 py-1 space-y-0.5">
              {category.items.map((item) => {
                const isActive = currentPageName === item.href;
                return (
                  <Link
                    key={item.href}
                    to={createPageUrl(item.href)}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-between px-3 py-[7px] rounded-xl transition-all duration-150 text-[13px] relative",
                      isActive
                        ? `bg-gradient-to-r ${category.gradient} text-white shadow-md shadow-black/20`
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {!isActive && <div className="w-1 h-1 rounded-full bg-slate-600" />}
                      <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-slate-500")} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={cn(
                        "px-1.5 py-0.5 text-[9px] font-bold rounded-md",
                        isActive ? "bg-white/20 text-white" : (item.badgeColor || "bg-slate-800 text-slate-500")
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

// ====== MAIN LAYOUT CONTENT ======
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
  const { user, logout, hasPermission } = useAuth();

  const filteredCategoriesByRole = useMemo(() => {
    return navigationCategories.filter(cat => {
      const requiredPerm = CATEGORY_PERMISSIONS[cat.id];
      if (requiredPerm === null) return user?.role === 'admin';
      if (!requiredPerm) return true;
      return hasPermission(requiredPerm);
    });
  }, [user, hasPermission]);

  useEffect(() => {
    try { localStorage.setItem('montex-sidebar-collapsed', sidebarCollapsed); } catch {}
  }, [sidebarCollapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const { alertasEstoque, obraAtualData, notificacoes } = useERP();
  const { addNotification } = useNotification();

  useEffect(() => {
    window.__notificationDispatch = (notification) => {
      addNotification(notification);
    };
    return () => { delete window.__notificationDispatch; };
  }, [addNotification]);

  const handleLogout = () => { logout(); };

  const toggleCategory = (categoryId) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleShortcut = (action) => {
    switch (action) {
      case 'show-shortcuts': setShowShortcuts(true); break;
      case 'command-palette': break;
      case 'new-item': toast.info('Pressione Ctrl+K e selecione a ação desejada'); break;
      default: break;
    }
  };

  const handleCommandAction = (action) => {
    toast.success(`Ação ${action} executada`);
  };

  const filteredCategories = searchQuery
    ? filteredCategoriesByRole.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.items.length > 0)
    : filteredCategoriesByRole;

  const currentPageTitle = useMemo(() => {
    return filteredCategoriesByRole.flatMap(c => c.items).find(i => i.href === currentPageName)?.name || 'Dashboard';
  }, [filteredCategoriesByRole, currentPageName]);

  const currentCategory = useMemo(() => {
    return filteredCategoriesByRole.find(c => c.items.some(i => i.href === currentPageName));
  }, [filteredCategoriesByRole, currentPageName]);

  // Mobile bottom nav items
  const mobileBottomNav = useMemo(() => [
    { id: 'home', name: 'Início', icon: Home, href: 'VisaoGeralPage' },
    { id: 'producao', name: 'Produção', icon: Package, href: 'KanbanProducaoIntegrado' },
    { id: 'financeiro', name: 'Financeiro', icon: Wallet, href: 'GestaoFinanceiraObra' },
    { id: 'expedicao', name: 'Expedição', icon: Truck, href: 'EnviosExpedicaoPage' },
    { id: 'mais', name: 'Mais', icon: MoreHorizontal, href: null },
  ], []);

  return (
    <>
      <CommandPalette onAction={handleCommandAction} />
      <KeyboardShortcuts onShortcut={handleShortcut} />
      <ShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />
      <DisplaySettings isOpen={showDisplaySettings} onClose={() => setShowDisplaySettings(false)} />
      <Notificacoes />

      <div className="min-h-screen bg-[#0a0e1a]">

        {/* ============ MOBILE HEADER ============ */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
          <div className="h-14 bg-[#0f1422]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <MontexLogoIcon className="w-7 h-7" />
              <div className="flex items-center">
                <span className="text-white font-bold text-sm tracking-wide">MONTEX</span>
                <span className="text-orange-400 text-[9px] font-bold ml-1">V5</span>
              </div>
            </div>
            <div className="flex-1 mx-2 flex justify-center">
              <SeletorObra compact />
            </div>
            <div className="flex items-center gap-1">
              <NotificationCenter />
              <button
                onClick={() => setShowDisplaySettings(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white active:scale-95 transition-all"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ============ MOBILE BOTTOM NAV ============ */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          <div className="bg-[#0f1422]/95 backdrop-blur-xl border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16 px-1">
              {mobileBottomNav.map((item) => {
                const isActive = item.href && currentPageName === item.href;
                const isMore = item.id === 'mais';
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (isMore) {
                        setMobileOpen(!mobileOpen);
                      } else if (item.href) {
                        window.location.href = createPageUrl(item.href);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-2xl transition-all active:scale-90",
                      isActive
                        ? "text-orange-400"
                        : isMore && mobileOpen
                          ? "text-orange-400"
                          : "text-slate-500"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-7 flex items-center justify-center rounded-xl transition-all",
                      isActive ? "bg-orange-500/15" : ""
                    )}>
                      <item.icon className={cn("h-5 w-5", isActive && "text-orange-400")} />
                    </div>
                    <span className="text-[10px] font-medium leading-none">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============ SIDEBAR ============ */}
        <aside
          className={cn(
            "fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 ease-in-out",
            "bg-[#0f1422]/95 backdrop-blur-xl",
            "border-r border-white/[0.06]",
            sidebarCollapsed ? "w-[68px]" : "w-[280px]",
            "lg:translate-x-0",
            mobileOpen ? "translate-x-0 !w-[280px]" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* ---- Logo Header ---- */}
          <div className="h-16 flex items-center px-4 border-b border-white/[0.06] relative">
            {sidebarCollapsed && !mobileOpen ? (
              <div className="w-full flex justify-center">
                <MontexLogoIcon className="w-9 h-9" />
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <MontexLogoIcon className="w-9 h-9" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-white font-extrabold text-[15px] tracking-wide">MONTEX</h1>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/20">
                      V5
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-[0.15em] mt-0.5">Enterprise Resource Planning</p>
                </div>
              </div>
            )}

            {/* Mobile close button */}
            {mobileOpen && (
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Collapse/Expand button */}
            {(!sidebarCollapsed || mobileOpen) && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                title="Recolher menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {sidebarCollapsed && !mobileOpen && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#0f1422] border border-white/10 rounded-full hidden lg:flex items-center justify-center text-slate-400 hover:text-white hover:bg-orange-500 hover:border-orange-500 transition-all z-[60] shadow-lg"
                title="Expandir menu"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* ---- Obra Selector (desktop sidebar only, mobile uses header) ---- */}
          {!sidebarCollapsed && (
            <div className="hidden lg:block px-3 py-2 border-b border-white/[0.04]">
              <SeletorObra />
            </div>
          )}

          {/* ---- Stock Alerts ---- */}
          {alertasEstoque && alertasEstoque.length > 0 && (
            sidebarCollapsed && !mobileOpen ? (
              <div className="px-2 py-2 flex justify-center">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center relative" title={`${alertasEstoque.length} itens em estoque baixo`}>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {alertasEstoque.length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-3 mt-2 p-2 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-semibold">{alertasEstoque.length} alerta(s) estoque</span>
                </div>
              </div>
            )
          )}

          {/* ---- Search Box (expanded only) ---- */}
          {(!sidebarCollapsed || mobileOpen) && (
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar módulo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2 pl-9 pr-4 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/40 focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>
          )}

          {/* ---- Navigation ---- */}
          <nav className={cn(
            "flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent",
            sidebarCollapsed && !mobileOpen ? "px-2 pt-2 space-y-0.5" : "px-3 pb-2"
          )}>
            {sidebarCollapsed && !mobileOpen
              ? filteredCategories.map((category) => (
                  <CollapsedNavItem
                    key={category.id}
                    category={category}
                    currentPageName={currentPageName}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))
              : filteredCategories.map((category) => (
                  <AccordionCategory
                    key={category.id}
                    category={category}
                    isOpen={openCategories.includes(category.id) || searchQuery.length > 0}
                    onToggle={() => toggleCategory(category.id)}
                    currentPageName={currentPageName}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))
            }
          </nav>

          {/* ---- Bottom Actions ---- */}
          <div className={cn("border-t border-white/[0.06] flex-shrink-0", sidebarCollapsed && !mobileOpen ? "p-2 space-y-1" : "p-2 space-y-0.5")}>
            {sidebarCollapsed && !mobileOpen ? (
              <div className="flex flex-col items-center gap-1">
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  onClick={() => setShowDisplaySettings(true)}
                  title="Configurações"
                >
                  <Settings className="h-[18px] w-[18px]" />
                </button>
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  onClick={() => setShowShortcuts(true)}
                  title="Atalhos"
                >
                  <Command className="h-[18px] w-[18px]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all text-[12px]"
                  onClick={() => { setShowDisplaySettings(true); setMobileOpen(false); }}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Config</span>
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all text-[12px]"
                  onClick={() => { setShowShortcuts(true); setMobileOpen(false); }}
                >
                  <Command className="h-3.5 w-3.5" />
                  <span>Atalhos</span>
                </button>
              </div>
            )}
          </div>

          {/* ---- User Info ---- */}
          {user && (
            <div className={cn("border-t border-white/[0.06] flex-shrink-0", sidebarCollapsed && !mobileOpen ? "p-2" : "p-2")}>
              {sidebarCollapsed && !mobileOpen ? (
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer ring-2 ring-white/10",
                    ROLE_COLORS[user.role] || 'bg-gradient-to-br from-slate-600 to-slate-700'
                  )} title={user.name || user.email}>
                    <span className="text-white font-bold text-sm">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <button
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    onClick={handleLogout}
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/[0.02]">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    ROLE_COLORS[user.role] || 'bg-gradient-to-br from-slate-600 to-slate-700'
                  )}>
                    <span className="text-white font-bold text-xs">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[12px] font-semibold truncate">
                      {user.name || 'Usuário'}
                    </p>
                    <span className={cn(
                      "text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wide",
                      user.role === 'admin' ? 'bg-orange-500/20 text-orange-400' :
                      user.role === 'gerente' ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'supervisor' ? 'bg-blue-500/20 text-blue-400' :
                      user.role === 'operador' ? 'bg-green-500/20 text-green-400' :
                      user.role === 'financeiro' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-slate-500/20 text-slate-400'
                    )}>
                      {ROLE_LABELS[user.role] || (user.role || 'viewer').toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ============ TOP BAR (DESKTOP) ============ */}
        <header className={cn(
          "fixed top-0 right-0 h-16 z-40 hidden lg:flex items-center justify-between px-6 transition-all duration-300",
          "bg-[#0f1422]/80 backdrop-blur-xl border-b border-white/[0.06]",
          sidebarCollapsed ? "left-[68px]" : "left-[280px]"
        )}>
          <div className="flex items-center gap-4">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
                title="Expandir menu"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              {currentCategory && (
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                  currentCategory.gradient
                )}>
                  <currentCategory.icon className="h-4 w-4 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-white font-semibold text-[15px] leading-tight">{currentPageTitle}</h2>
                {currentCategory && (
                  <p className="text-slate-500 text-[11px]">{currentCategory.name}</p>
                )}
              </div>
            </div>
            {currentPageName !== 'SimuladorOrcamento' && currentPageName !== 'DespesasPage' && currentPageName !== 'ReceitasPage' && (
              <div className="ml-4">
                <SeletorObra compact />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ProgressoObra compact />
            <div className="w-px h-6 bg-white/10 mx-1" />
            <NotificationCenter />
            <ThemeToggle />
            <button
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              onClick={() => setShowDisplaySettings(true)}
              title="Configurações de exibição"
            >
              <Settings className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        {/* ============ MAIN CONTENT ============ */}
        <main className={cn(
          "min-h-screen transition-all duration-300",
          // Top padding: mobile header (h-14) + desktop header (h-16)
          "pt-14 lg:pt-16",
          // Bottom padding: mobile bottom nav bar
          "pb-20 lg:pb-0",
          // Left margin: sidebar on desktop
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[280px]"
        )}>
          <motion.div
            key={currentPageName}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="p-3 sm:p-4 lg:p-5"
          >
            <div className="hidden lg:block">
              <Breadcrumbs />
            </div>
            {children}
          </motion.div>
        </main>
      </div>
    </>
  );
}

// ====== LAYOUT PRINCIPAL ======
export default function Layout({ children, currentPageName }) {
  return (
    <ERPProvider>
      <ProducaoFabricaProvider>
        <LayoutContent currentPageName={currentPageName}>
          {children}
        </LayoutContent>
      </ProducaoFabricaProvider>
    </ERPProvider>
  );
}
