/**
 * pages.config.js - Configuração de rotas e páginas do MONTEX ERP
 *
 * MANUTENÇÃO MANUAL - Este arquivo deve ser editado manualmente.
 *
 * Para adicionar uma nova página:
 *   1. Crie o componente em ./pages/NovaPagina.jsx
 *   2. Adicione o lazy import abaixo:
 *      const NovaPagina = lazy(() => import('./pages/NovaPagina'));
 *   3. Adicione a entrada no objeto PAGES
 *
 * Para remover uma página:
 *   1. Remova o import
 *   2. Remova a entrada do objeto PAGES
 *   3. Delete o arquivo de ./pages/ (se não for mais usado)
 *
 * mainPage: controla a página inicial do app (deve corresponder a uma chave em PAGES)
 *
 * CONSOLIDAÇÃO DE DUPLICATAS (v5.1):
 * - Dashboard canônico: DashboardPremium (substituiu Dashboard, DashboardFuturista, DashboardERPIntegrado)
 * - Estoque canônico: EstoquePageV2 (substituiu EstoquePage)
 * - Orçamentos canônico: OrcamentosPage (substituiu Orcamentos)
 *
 * LAZY LOADING (v5.2):
 * - Todas as páginas usam React.lazy() para code splitting automático
 * - Cada página é carregada sob demanda, reduzindo o bundle inicial
 * - O Suspense fallback está configurado no App.jsx
 */

import { lazy, createElement } from 'react';
import { Navigate } from 'react-router-dom';

// ===== CORE =====
const DashboardPremium = lazy(() => import('./pages/DashboardPremium'));
const VisaoGeralPage = lazy(() => import('./pages/VisaoGeralPage'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Projetos = lazy(() => import('./pages/Projetos'));

// ===== PRODUÇÃO =====
const ParedeProntaPage = lazy(() => import('./pages/ParedeProntaPage'));
const ProducaoPage = lazy(() => import('./pages/ProducaoPage'));
const ProducaoFuncionarioPage = lazy(() => import('./pages/ProducaoFuncionarioPage'));
const DiarioProducaoPage = lazy(() => import('./pages/DiarioProducaoPage'));
const AtualizacaoProducaoIndependente = lazy(() => import('./pages/AtualizacaoProducaoIndependente'));
const AtualizacaoProducaoPublica = lazy(() => import('./pages/AtualizacaoProducaoPublica'));
const AnaliseProducaoPage = lazy(() => import('./pages/AnaliseProducaoPage'));
const MontagemPage = lazy(() => import('./pages/MontagemPage'));

// ===== KANBAN =====
const KanbanCortePage = lazy(() => import('./pages/KanbanCortePage'));
const KanbanProducaoIntegrado = lazy(() => import('./pages/KanbanProducaoIntegrado'));

// ===== ESTOQUE (canônico: EstoquePageV2) =====
const EstoquePageV2 = lazy(() => import('./pages/EstoquePageV2'));

// ===== FINANCEIRO =====
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage'));
const GestaoFinanceiraObra = lazy(() => import('./pages/GestaoFinanceiraObra'));
const ReceitasPage = lazy(() => import('./pages/ReceitasPage'));
const DespesasPage = lazy(() => import('./pages/DespesasPage'));
const MetasFinanceirasPage = lazy(() => import('./pages/MetasFinanceirasPage'));
const PainelFinanceiroGlobal = lazy(() => import('./pages/PainelFinanceiroGlobal'));
const AnaliseCustosPage = lazy(() => import('./pages/AnaliseCustosPage'));
const CentrosCustoPage = lazy(() => import('./pages/CentrosCustoPage'));
const RelatoriosFinanceiros = lazy(() => import('./pages/RelatoriosFinanceiros'));
const DREPage = lazy(() => import('./pages/DREPage'));

// ===== ORÇAMENTOS (canônico: OrcamentosPage) =====
const OrcamentosPage = lazy(() => import('./pages/OrcamentosPage'));
const AprovacaoOrcamento = lazy(() => import('./pages/AprovacaoOrcamento'));
const SimuladorOrcamento = lazy(() => import('./pages/SimuladorOrcamento'));
const SimuladorPage = lazy(() => import('./pages/SimuladorPage'));

// ===== MEDIÇÃO =====
const MedicaoAutomaticaPage = lazy(() => import('./pages/MedicaoAutomaticaPage'));

// ===== EXPEDIÇÃO =====
// ExpedicaoIntegrado ("Romaneios Integrado") foi DESATIVADA: gravava romaneios
// fora do fluxo transacional (RPCs criar/despachar/excluir_romaneio). A URL antiga
// redireciona para a página canônica de Envios.
const RedirectEnviosExpedicao = () => createElement(Navigate, { to: '/EnviosExpedicaoPage', replace: true });
const EnviosExpedicaoPage = lazy(() => import('./pages/EnviosExpedicaoPage'));

// ===== BI & ANALYTICS =====
// BI Analytics (DashboardBI) usava DRE_OBRA/commandCenterData estáticos → BI 360.
const RedirectDashboardBI = () => createElement(Navigate, { to: '/BI360?aba=executivo', replace: true });
// BI 360 substitui BI Estratégico/Tático/Operacional (dados fictícios); as URLs
// antigas redirecionam para a aba correspondente.
const BI360Page = lazy(() => import('./pages/BI360Page'));
const RadarAlertasPage = lazy(() => import('./pages/RadarAlertasPage'));
const RedirectBIEstrategico = () => createElement(Navigate, { to: '/BI360?aba=executivo', replace: true });
const RedirectBITatico = () => createElement(Navigate, { to: '/BI360?aba=obras', replace: true });
const RedirectBIOperacional = () => createElement(Navigate, { to: '/BI360?aba=producao', replace: true });
const CommandCenterUltrawide = lazy(() => import('./pages/CommandCenterUltrawide'));
const CommandCenterUltra = lazy(() => import('./pages/CommandCenterUltra'));

// ===== COMPRAS & MATERIAIS =====
const ComprasPage = lazy(() => import('./pages/ComprasPage'));
const MateriaisPage = lazy(() => import('./pages/MateriaisPage'));
const ImportRomaneioPage = lazy(() => import('./pages/ImportRomaneioPage'));

// ===== RH & EQUIPES =====
const EquipesPage = lazy(() => import('./pages/EquipesPage'));
const RHPage = lazy(() => import('./pages/RHPage'));

// ===== DOCUMENTAÇÃO TÉCNICA =====
const CroquisPage = lazy(() => import('./pages/CroquisPage'));
const DetalhamentosPage = lazy(() => import('./pages/DetalhamentosPage'));
const MontexERP3DPage = lazy(() => import('./pages/MontexERP3DPage'));

// ===== RELATÓRIOS & FERRAMENTAS =====
const Relatorios = lazy(() => import('./pages/Relatorios'));
// Colaboração & IA (Fase 2): Copiloto substitui Chatbot/Analisador; Insights IA
// substitui Sugestões IA/Relatórios IA (regras fixas e números aleatórios).
const CopilotoPage = lazy(() => import('./pages/CopilotoPage'));
const InsightsIAPage = lazy(() => import('./pages/InsightsIAPage'));
const RedirectCopiloto = () => createElement(Navigate, { to: '/Copiloto', replace: true });
const RedirectInsightsIA = () => createElement(Navigate, { to: '/InsightsIA', replace: true });
const GerenciadorRelatorios = lazy(() => import('./pages/GerenciadorRelatorios'));
const AgendamentosRelatorios = lazy(() => import('./pages/AgendamentosRelatorios'));

// ===== OUTROS =====
const Tarefas = lazy(() => import('./pages/Tarefas'));
const Automacoes = lazy(() => import('./pages/Automacoes'));
const ColaboracaoProjetos = lazy(() => import('./pages/ColaboracaoProjetos'));
const MultiObrasPage = lazy(() => import('./pages/MultiObrasPage'));
const GestaoObrasPage = lazy(() => import('./pages/GestaoObrasPage'));
const VendasPage = lazy(() => import('./pages/VendasPage'));

// ===== ADMIN =====
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const GestaoUsuariosPage = lazy(() => import('./pages/GestaoUsuariosPage'));

// ===== LAYOUT (não usa lazy - carregado sempre) =====
import __Layout from './Layout.jsx';


export const PAGES = {
    // Core
    "DashboardPremium": DashboardPremium,
    "VisaoGeralPage": VisaoGeralPage,
    "Clientes": Clientes,
    "Projetos": Projetos,

    // Produção
    "ProducaoPage": ProducaoPage,
    "ProducaoFuncionarioPage": ProducaoFuncionarioPage,
    "DiarioProducaoPage": DiarioProducaoPage,
    "AtualizacaoProducaoIndependente": AtualizacaoProducaoIndependente,
    "AtualizacaoProducaoPublica": AtualizacaoProducaoPublica,
        "AnaliseProducaoPage": AnaliseProducaoPage,
    "MontagemPage": MontagemPage,
    "ParedeProntaPage": ParedeProntaPage,

    // Kanban
    "KanbanCortePage": KanbanCortePage,
    "KanbanProducaoIntegrado": KanbanProducaoIntegrado,

    // Estoque (canônico: V2)
    "EstoquePageV2": EstoquePageV2,
  "EstoquePage": EstoquePageV2,  // Alias para compatibilidade de URL

    // Financeiro
    "FinanceiroPage": FinanceiroPage,
    "GestaoFinanceiraObra": GestaoFinanceiraObra,
    "ReceitasPage": ReceitasPage,
    "DespesasPage": DespesasPage,
    "MetasFinanceirasPage": MetasFinanceirasPage,
    "PainelFinanceiroGlobal": PainelFinanceiroGlobal,
    "AnaliseCustosPage": AnaliseCustosPage,
    "CentrosCustoPage": CentrosCustoPage,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "DREPage": DREPage,

    // Orçamentos (canônico: OrcamentosPage)
    "OrcamentosPage": OrcamentosPage,
    "AprovacaoOrcamento": AprovacaoOrcamento,
    "SimuladorOrcamento": SimuladorOrcamento,
    "SimuladorPage": SimuladorPage,

    // Medição
    "MedicaoAutomaticaPage": MedicaoAutomaticaPage,

    // Expedição
    "ExpedicaoIntegrado": RedirectEnviosExpedicao, // redirect (página desativada)
    "EnviosExpedicaoPage": EnviosExpedicaoPage,

    // BI & Analytics
    "DashboardBI": RedirectDashboardBI, // redirect → BI 360
    "BI360": BI360Page,
    "RadarAlertas": RadarAlertasPage,
    "BIOperacional": RedirectBIOperacional, // redirect → BI 360 (Produção)
    "BITatico": RedirectBITatico,           // redirect → BI 360 (Obras)
    "BIEstrategico": RedirectBIEstrategico, // redirect → BI 360 (Executivo)
    "CommandCenterUltrawide": CommandCenterUltrawide,
    "CommandCenterUltra": CommandCenterUltra,

    // Compras & Materiais
    "ComprasPage": ComprasPage,
    "MateriaisPage": MateriaisPage,
    "ImportRomaneioPage": ImportRomaneioPage,

    // RH & Equipes
    "EquipesPage": EquipesPage,
    "RHPage": RHPage,

    // Documentação Técnica
    "CroquisPage": CroquisPage,
    "DetalhamentosPage": DetalhamentosPage,
    "MontexERP3DPage": MontexERP3DPage,

    // Relatórios & Ferramentas
    "Relatorios": Relatorios,
    "Copiloto": CopilotoPage,
    "InsightsIA": InsightsIAPage,
    "RelatoriosIA": RedirectInsightsIA, // redirect → Insights IA
    "GerenciadorRelatorios": GerenciadorRelatorios,
    "AgendamentosRelatorios": AgendamentosRelatorios,
    "Analisador": RedirectCopiloto, // redirect → Copiloto
    "SugestoesIAPage": RedirectInsightsIA, // redirect → Insights IA

    // Outros
    "Tarefas": Tarefas,
    "Automacoes": Automacoes,
    "ColaboracaoProjetos": ColaboracaoProjetos,
    "Chatbot": RedirectCopiloto, // redirect → Copiloto
    "MultiObrasPage": MultiObrasPage,
    "GestaoObrasPage": GestaoObrasPage,
    "VendasPage": VendasPage,

    // Admin
    "UsuariosPage": UsuariosPage,
    "GestaoUsuariosPage": GestaoUsuariosPage,
}

export const pagesConfig = {
    mainPage: "CommandCenterUltra",
    Pages: PAGES,
    Layout: __Layout,
};
