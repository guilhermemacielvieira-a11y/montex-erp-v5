/**
 * pages.config.js - Configuração de rotas e páginas do MONTEX ERP
 *
 * MANUTENÇÃO MANUAL - Este arquivo deve ser editado manualmente.
 *
 * Para adicionar uma nova página:
 *   1. Crie o componente em ./pages/NovaPagina.jsx
 *   2. Adicione o import abaixo
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
 */

// ===== CORE =====
import DashboardPremium from './pages/DashboardPremium';
import Clientes from './pages/Clientes';
import Projetos from './pages/Projetos';

// ===== PRODUÇÃO =====
import ProducaoPage from './pages/ProducaoPage';
import ProducaoFuncionarioPage from './pages/ProducaoFuncionarioPage';
import DiarioProducaoPage from './pages/DiarioProducaoPage';
import AtualizacaoProducao from './pages/AtualizacaoProducao';
import AtualizacaoProducaoIndependente from './pages/AtualizacaoProducaoIndependente';
import AtualizacaoProducaoPublica from './pages/AtualizacaoProducaoPublica';
import MontagemPage from './pages/MontagemPage';

// ===== KANBAN =====
import KanbanCortePage from './pages/KanbanCortePage';
import KanbanCorteIntegrado from './pages/KanbanCorteIntegrado';
import KanbanProducaoIntegrado from './pages/KanbanProducaoIntegrado';

// ===== ESTOQUE (canônico: EstoquePageV2) =====
import EstoquePageV2 from './pages/EstoquePageV2';
// EstoquePage removido — funcionalidade consolidada no EstoquePageV2

// ===== FINANCEIRO =====
import FinanceiroPage from './pages/FinanceiroPage';
import GestaoFinanceiraObra from './pages/GestaoFinanceiraObra';
import ReceitasPage from './pages/ReceitasPage';
import DespesasPage from './pages/DespesasPage';
import MetasFinanceirasPage from './pages/MetasFinanceirasPage';
import AnaliseCustosPage from './pages/AnaliseCustosPage';
import CentrosCustoPage from './pages/CentrosCustoPage';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';

// ===== ORÇAMENTOS (canônico: OrcamentosPage) =====
import OrcamentosPage from './pages/OrcamentosPage';
import AprovacaoOrcamento from './pages/AprovacaoOrcamento';
import SimuladorOrcamento from './pages/SimuladorOrcamento';
import SimuladorPage from './pages/SimuladorPage';
// Orcamentos.jsx removido — funcionalidade consolidada no OrcamentosPage

// ===== MEDIÇÃO =====
import MedicaoPage from './pages/MedicaoPage';
import MedicaoAutomaticaPage from './pages/MedicaoAutomaticaPage';

// ===== EXPEDIÇÃO =====
import ExpedicaoIntegrado from './pages/ExpedicaoIntegrado';
import EnviosExpedicaoPage from './pages/EnviosExpedicaoPage';

// ===== BI & ANALYTICS =====
import DashboardBI from './pages/DashboardBI';
import BIOperacional from './pages/BIOperacional';
import BITatico from './pages/BITatico';
import BIEstrategico from './pages/BIEstrategico';
import CommandCenterUltrawide from './pages/CommandCenterUltrawide';
import CommandCenterUltra from './pages/CommandCenterUltra';

// ===== COMPRAS & MATERIAIS =====
import ComprasPage from './pages/ComprasPage';
import ImportRomaneioPage from './pages/ImportRomaneioPage';

// ===== RH & EQUIPES =====
import EquipesPage from './pages/EquipesPage';
import RHPage from './pages/RHPage';

// ===== DOCUMENTAÇÃO TÉCNICA =====
import CroquisPage from './pages/CroquisPage';
import DetalhamentosPage from './pages/DetalhamentosPage';
import MontexERP3DPage from './pages/MontexERP3DPage';

// ===== RELATÓRIOS & FERRAMENTAS =====
import Relatorios from './pages/Relatorios';
import RelatoriosIA from './pages/RelatoriosIA';
import GerenciadorRelatorios from './pages/GerenciadorRelatorios';
import AgendamentosRelatorios from './pages/AgendamentosRelatorios';
import Analisador from './pages/Analisador';
import SugestoesIAPage from './pages/SugestoesIAPage';

// ===== OUTROS =====
import Tarefas from './pages/Tarefas';
import Automacoes from './pages/Automacoes';
import ColaboracaoProjetos from './pages/ColaboracaoProjetos';
import AssistenteTecnico from './pages/AssistenteTecnico';
import Chatbot from './pages/Chatbot';
import MultiObrasPage from './pages/MultiObrasPage';
import VendasPage from './pages/VendasPage';

// ===== ADMIN =====
import UsuariosPage from './pages/UsuariosPage';

// ===== LAYOUT =====
import __Layout from './Layout.jsx';


export const PAGES = {
    // Core
    "DashboardPremium": DashboardPremium,
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
