import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

// Mapeamento de rotas para nomes legíveis e hierarquia
const ROUTE_MAP = {
  '/': { label: 'Dashboard', parent: null },
  '/DashboardPremium': { label: 'Dashboard Premium', parent: '/' },
  '/DashboardBI': { label: 'BI Dashboard', parent: '/' },
  '/BIEstrategico': { label: 'BI Estratégico', parent: '/DashboardBI' },
  '/BITatico': { label: 'BI Tático', parent: '/DashboardBI' },
  '/BIOperacional': { label: 'BI Operacional', parent: '/DashboardBI' },
  '/ProducaoPage': { label: 'Produção', parent: '/' },
  '/KanbanProducaoIntegrado': { label: 'Kanban Produção', parent: '/ProducaoPage' },
  '/KanbanCorteIntegrado': { label: 'Kanban Corte', parent: '/ProducaoPage' },
  '/KanbanCortePage': { label: 'Corte', parent: '/ProducaoPage' },
  '/MontagemPage': { label: 'Montagem', parent: '/ProducaoPage' },
  '/DiarioProducaoPage': { label: 'Diário de Produção', parent: '/ProducaoPage' },
  '/AnaliseProducaoPage': { label: 'Análise de Produção', parent: '/ProducaoPage' },
  '/AtualizacaoProducao': { label: 'Atualização Produção', parent: '/ProducaoPage' },
  '/ProducaoFuncionarioPage': { label: 'Produção por Funcionário', parent: '/ProducaoPage' },
  '/EstoquePageV2': { label: 'Estoque', parent: '/' },
  '/ComprasPage': { label: 'Compras', parent: '/EstoquePageV2' },
  '/FinanceiroPage': { label: 'Financeiro', parent: '/' },
  '/DespesasPage': { label: 'Despesas', parent: '/FinanceiroPage' },
  '/ReceitasPage': { label: 'Receitas', parent: '/FinanceiroPage' },
  '/MetasFinanceirasPage': { label: 'Metas Financeiras', parent: '/FinanceiroPage' },
  '/AnaliseCustosPage': { label: 'Análise de Custos', parent: '/FinanceiroPage' },
  '/CentrosCustoPage': { label: 'Centros de Custo', parent: '/FinanceiroPage' },
  '/DREPage': { label: 'DRE', parent: '/FinanceiroPage' },
  '/RelatoriosFinanceiros': { label: 'Relatórios Financeiros', parent: '/FinanceiroPage' },
  '/GestaoObrasPage': { label: 'Gestão de Obras', parent: '/' },
  '/GestaoFinanceiraObra': { label: 'Financeiro da Obra', parent: '/GestaoObrasPage' },
  '/MultiObrasPage': { label: 'Multi-Obras', parent: '/GestaoObrasPage' },
  '/MedicaoPage': { label: 'Medições', parent: '/GestaoObrasPage' },
  '/MedicaoAutomaticaPage': { label: 'Medição Automática', parent: '/MedicaoPage' },
  '/OrcamentosPage': { label: 'Orçamentos', parent: '/' },
  '/SimuladorOrcamento': { label: 'Simulador', parent: '/OrcamentosPage' },
  '/ExpedicaoIntegrado': { label: 'Expedição', parent: '/' },
  '/EnviosExpedicaoPage': { label: 'Envios', parent: '/ExpedicaoIntegrado' },
  '/EquipesPage': { label: 'Equipes', parent: '/' },
  '/RHPage': { label: 'RH', parent: '/EquipesPage' },
  '/ImportRomaneioPage': { label: 'Importar Romaneio', parent: '/ProducaoPage' },
  '/Clientes': { label: 'Clientes', parent: '/' },
  '/VendasPage': { label: 'Vendas', parent: '/' },
  '/Relatorios': { label: 'Relatórios', parent: '/' },
  '/RelatoriosIA': { label: 'Relatórios IA', parent: '/Relatorios' },
  '/GerenciadorRelatorios': { label: 'Gerenciador', parent: '/Relatorios' },
  '/AgendamentosRelatorios': { label: 'Agendamentos', parent: '/Relatorios' },
  '/SugestoesIAPage': { label: 'Sugestões IA', parent: '/' },
  '/UsuariosPage': { label: 'Usuários', parent: '/' },
  '/Automacoes': { label: 'Automações', parent: '/' },
  '/Tarefas': { label: 'Tarefas', parent: '/' },
  '/Projetos': { label: 'Projetos', parent: '/' },
};

/**
 * Builds breadcrumb path by traversing parent chain from current page
 * @param {string} pathname - Current page route
 * @returns {Array} Array of breadcrumb objects with path and label
 */
function buildBreadcrumbs(pathname) {
  const crumbs = [];
  let current = pathname;

  while (current && ROUTE_MAP[current]) {
    crumbs.unshift({ path: current, ...ROUTE_MAP[current] });
    current = ROUTE_MAP[current].parent;
  }

  // Always start with Home
  if (crumbs.length === 0 || crumbs[0].path !== '/') {
    crumbs.unshift({ path: '/', label: 'Dashboard' });
  }

  return crumbs;
}

/**
 * Breadcrumbs Navigation Component
 *
 * Displays hierarchical navigation path from home to current page.
 * Uses useLocation hook to track route changes and build breadcrumb trail.
 *
 * @returns {React.ReactElement|null} Breadcrumb navigation or null if on root page
 *
 * @example
 * // In Layout.jsx
 * <main>
 *   <Breadcrumbs />
 *   {children}
 * </main>
 */
export default function Breadcrumbs() {
  const location = useLocation();
  const crumbs = buildBreadcrumbs(location.pathname);

  if (crumbs.length <= 1) return null; // Don't show on root page

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-400 mb-4 px-1">
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.path}>
          {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
          {idx === crumbs.length - 1 ? (
            <span className="text-slate-200 font-medium">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-blue-400 transition-colors"
            >
              {idx === 0 ? <Home className="h-3.5 w-3.5" /> : crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
