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

import { lazy } from 'react';

// ===== CORE =====
const DashboardPremium = lazy(() => import('./pages/DashboardPremium'));
const VisaoGeralPage = lazy(() => import('./pages/VisaoGeralPage'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Projetos = lazy(() => import('./pages/Projetos'));

// ===== PRODUÇÃO =====
const ProducaoPage = lazy(() => import('./pages/ProducaoPage'));
const ProducaoFuncionarioPage = lazy(() => import('./pages/ProducaoFuncionarioPage'));
const DiarioProducaoPage = lazy(() => import('./pages/DiarioProducaoPage'));
const AtualizacaoProducao = lazy(() => import('./pages/AtualizacaoProducao'));
const AtualizacaoProducaoIndependente = lazy(() => import('./pages/AtualizacaoProducaoIndependente'));
const AtualizacaoProducaoPublica = lazy(() => import('./pages/AtualizacaoProducaoPublica'));
const MontagemPage = lazy(() => import('./pages/MontagemPage'));

// ===== KANBAN =====
const KanbanCortePage = lazy(() => import('./pages/KanbanCortePage'));
const KanbanCorteIntegrado = lazy(() => import('./pages/KanbanCorteIntegrado'));
const KanbanProducaoIntegrado = lazy(() => import('./pages/KanbanProducaoIntegrado'));

// ===== ESTOQUE (canônico: EstoquePageV2) =====
const EstoquePageV2 = lazy(() => import('./pages/EstoquePageV2'));

// ===== FINANCEIRO =====
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage'));
const GestaoFinanceiraObra = lazy(() => import('./pages/GestaoFinanceiraObra'));
const ReceitasPage = lazy(() => import('./pages/ReceitasPage'));
const DespesasPage = lazy(() => import('./pages/DespesasPage'));
const MetasFinanceirasPage = lazy(() => import('./pages/MetasFinanceirasPage'));
const AnaliseCustosPage = lazy(() => import('./pages/AnaliseCustosPage'));
const CentrosCustoPage = lazy(() => import('./pages/CentrosCustoPage'));
const RelatoriosFinanceiros = lazy(() => import('./pages/RelatoriosFinanceiros'));

// ===== ORÇAMENTOS (canônico: OrcamentosPage) =====
const OrcamentosPage = lazy(() => import('./pages/OrcamentosPage'));
const AprovacaoOrcamento = lazy(() => import('./pages/AprovacaoOrcamento'));
const SimuladorOrcamento = lazy(() => import('./pages/SimuladorOrcamento'));
const SimuladorPage = lazy(() => import('./pages/SimuladorPage'));

// ===== MEDIÇÃO =====
const MedicaoPage = lazy(() => import('./pages/MedicaoPage'));
const MedicaoAutomaticaPage = lazy(() => import('./pages/MedicaoAutomaticaPage'));

// ===== EXPEDIÇÃO =====
const ExpedicaoIntegrado = lazy(() => import('./pages/ExpedicaoIntegrado'));
const EnviosExpedicaoPage = lazy(() => import('./pages/EnviosExpedicaoPage'));

// ===== BI & ANALYTICS =====
const DashboardBI = lazy(() => import('./pages/DashboardBI'));
const BIOperacional = lazy(() => import('./pages/BIOperacional'));
const BITatico = lazy(() => import('./pages/BITatico'));
const BIEstrategico = lazy(() => import('./pages/BIEstrategico'));
const CommandCenterUltrawide = lazy(() => import('./pages/CommandCenterUltrawide'));
const CommandCenterUltra = lazy(() => import('./pages/CommandCenterUltra'));

// ===== COMPRAS & MATERIAIS =====
const ComprasPage = lazy(() => import('./pages/ComprasPage'));
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
const RelatoriosIA = lazy(() => import('./pages/RelatoriosIA'));
const GerenciadorRelatorios = lazy(() => import('./pages/GerenciadorRelatorios'));
const AgendamentosRelatorios = lazy(() => import('./pages/AgendamentosRelatorios'));
const Analisador = lazy(() => import('./pages/Analisador'));
const SugestoesIAPage = lazy(() => import('./pages/SugestoesIAPage'));

// ===== OUTROS =====
const Tarefas = lazy(() => import('./pages/Tarefas'));
const Automacoes = lazy(() => import('./pages/Automacoes'));
const ColaboracaoProjetos = lazy(() => import('./pages/ColaboracaoProjetos'));
const AssistenteTecnico = lazy(() => import('./pages/AssistenteTecnico'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const MultiObrasPage = lazy(() => import('./pages/MultiObrasPage'));
const VendasPage = lazy(() => import('./pages/VendasPage'));

// ===== ADMIN =====
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));

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
    "AtualizacaoProducao": AtualizacaoProducao,
    "AtualizacaoProducaoIndependente": AtualizacaoProducaoIndependente,
    "AtualizacaoProducaoPublica": AtualizacaoProducaoPublica,
    "MontagemPage": MontagemPage,

    // Kanban
    "KanbanCortePage": KanbanCortePage,
    "KanbanCorteIntegrado": KanbanCorteIntegrado,
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
    "AnaliseCustosPage": AnaliseCustosPage,
    "CentrosCustoPage": CentrosCustoPage,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,

    // Orçamentos (canônico: OrcamentosPage)
    "OrcamentosPage": OrcamentosPage,
    "AprovacaoOrcamento": AprovacaoOrcamento,
    "SimuladorOrcamento": SimuladorOrcamento,
    "SimuladorPage": SimuladorPage,

    // Medição
    "MedicaoPage": MedicaoPage,
    "MedicaoAutomaticaPage": MedicaoAutomaticaPage,

    // Expedição
    "ExpedicaoIntegrado": ExpedicaoIntegrado,
    "EnviosExpedicaoPage": EnviosExpedicaoPage,

    // BI & Analytics
    "DashboardBI": DashboardBI,
    "BIOperacional": BIOperacional,
    "BITatico": BITatico,
    "BIEstrategico": BIEstrategico,
    "CommandCenterUltrawide": CommandCenterUltrawide,
    "CommandCenterUltra": CommandCenterUltra,

    // Compras & Materiais
    "ComprasPage": ComprasPage,
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
    "RelatoriosIA": RelatoriosIA,
    "GerenciadorRelatorios": GerenciadorRelatorios,
    "AgendamentosRelatorios": AgendamentosRelatorios,
    "Analisador": Analisador,
    "SugestoesIAPage": SugestoesIAPage,

    // Outros
    "Tarefas": Tarefas,
    "Automacoes": Automacoes,
    "ColaboracaoProjetos": ColaboracaoProjetos,
    "AssistenteTecnico": AssistenteTecnico,
    "Chatbot": Chatbot,
    "MultiObrasPage": MultiObrasPage,
    "VendasPage": VendasPage,

    // Admin
    "UsuariosPage": UsuariosPage,
}

export const pagesConfig = {
    mainPage: "DashboardPremium",
    Pages: PAGES,
    Layout: __Layout,
};
