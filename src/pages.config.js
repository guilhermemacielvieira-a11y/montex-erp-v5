/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AgendamentosRelatorios from './pages/AgendamentosRelatorios';
import Analisador from './pages/Analisador';
import AprovacaoOrcamento from './pages/AprovacaoOrcamento';
import AssistenteTecnico from './pages/AssistenteTecnico';
import AtualizacaoProducao from './pages/AtualizacaoProducao';
import AtualizacaoProducaoIndependente from './pages/AtualizacaoProducaoIndependente';
import AtualizacaoProducaoPublica from './pages/AtualizacaoProducaoPublica';
import Chatbot from './pages/Chatbot';
import Clientes from './pages/Clientes';
// Dashboard.jsx DEPRECADO - consolidado no DashboardPremium
// import Dashboard from './pages/Dashboard';
import DashboardPremium from './pages/DashboardPremium';
import GerenciadorRelatorios from './pages/GerenciadorRelatorios';
import Orcamentos from './pages/Orcamentos';
import Projetos from './pages/Projetos';
import Relatorios from './pages/Relatorios';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import RelatoriosIA from './pages/RelatoriosIA';
import Tarefas from './pages/Tarefas';
import Automacoes from './pages/Automacoes';
import ColaboracaoProjetos from './pages/ColaboracaoProjetos';
// Novas páginas Premium
import ProducaoPage from './pages/ProducaoPage';
import FinanceiroPage from './pages/FinanceiroPage';
import OrcamentosPage from './pages/OrcamentosPage';
// DashboardFuturista DEPRECADO - consolidado no DashboardPremium
// import DashboardFuturista from './pages/DashboardFuturista';
import DashboardBI from './pages/DashboardBI';
import BIOperacional from './pages/BIOperacional';
import BITatico from './pages/BITatico';
import BIEstrategico from './pages/BIEstrategico';
import CommandCenterUltrawide from './pages/CommandCenterUltrawide';
import CommandCenterUltra from './pages/CommandCenterUltra';
import MedicaoPage from './pages/MedicaoPage';
import SimuladorPage from './pages/SimuladorPage';
import MontagemPage from './pages/MontagemPage';
// Novos módulos integrados
import MetasFinanceirasPage from './pages/MetasFinanceirasPage';
import AnaliseCustosPage from './pages/AnaliseCustosPage';
import DiarioProducaoPage from './pages/DiarioProducaoPage';
import EquipesPage from './pages/EquipesPage';
import SugestoesIAPage from './pages/SugestoesIAPage';
import CentrosCustoPage from './pages/CentrosCustoPage';
// Módulos adicionais
import ProducaoFuncionarioPage from './pages/ProducaoFuncionarioPage';
import MultiObrasPage from './pages/MultiObrasPage';
import ImportRomaneioPage from './pages/ImportRomaneioPage';
import ReceitasPage from './pages/ReceitasPage';
import DespesasPage from './pages/DespesasPage';
import EnviosExpedicaoPage from './pages/EnviosExpedicaoPage';
import MedicaoAutomaticaPage from './pages/MedicaoAutomaticaPage';
import KanbanCortePage from './pages/KanbanCortePage';
import EstoquePage from './pages/EstoquePage';
// Gestão Financeira da Obra
import GestaoFinanceiraObra from './pages/GestaoFinanceiraObra';
import SimuladorOrcamento from './pages/SimuladorOrcamento';
// DashboardERPIntegrado DEPRECADO - consolidado no DashboardPremium
// import DashboardERPIntegrado from './pages/DashboardERPIntegrado';
import ExpedicaoIntegrado from './pages/ExpedicaoIntegrado';
// Módulo 3D
import MontexERP3DPage from './pages/MontexERP3DPage';
// Croquis & Desenhos Técnicos
import CroquisPage from './pages/CroquisPage';
// Detalhamentos (Conjuntos Montados)
import DetalhamentosPage from './pages/DetalhamentosPage';
// Páginas adicionais não registradas anteriormente
import VendasPage from './pages/VendasPage';
import RHPage from './pages/RHPage';
import ComprasPage from './pages/ComprasPage';
import EstoquePageV2 from './pages/EstoquePageV2';
import KanbanCorteIntegrado from './pages/KanbanCorteIntegrado';
import KanbanProducaoIntegrado from './pages/KanbanProducaoIntegrado';
// Gestão de Usuários
import UsuariosPage from './pages/UsuariosPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgendamentosRelatorios": AgendamentosRelatorios,
    "Analisador": Analisador,
    "AprovacaoOrcamento": AprovacaoOrcamento,
    "AssistenteTecnico": AssistenteTecnico,
    "AtualizacaoProducao": AtualizacaoProducao,
    "AtualizacaoProducaoIndependente": AtualizacaoProducaoIndependente,
    "AtualizacaoProducaoPublica": AtualizacaoProducaoPublica,
    "Chatbot": Chatbot,
    "Clientes": Clientes,
    // "Dashboard": Dashboard,  // DEPRECADO → DashboardPremium
    "DashboardPremium": DashboardPremium,
    "GerenciadorRelatorios": GerenciadorRelatorios,
    "Orcamentos": Orcamentos,
    "Projetos": Projetos,
    "Relatorios": Relatorios,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "RelatoriosIA": RelatoriosIA,
    "Tarefas": Tarefas,
    "Automacoes": Automacoes,
    "ColaboracaoProjetos": ColaboracaoProjetos,
    // Novas páginas Premium com Mock Data
    "ProducaoPage": ProducaoPage,
    "FinanceiroPage": FinanceiroPage,
    "OrcamentosPage": OrcamentosPage,
    // "DashboardFuturista": DashboardFuturista,  // DEPRECADO → DashboardPremium
    "DashboardBI": DashboardBI,
    "BIOperacional": BIOperacional,
    "BITatico": BITatico,
    "BIEstrategico": BIEstrategico,
    "CommandCenterUltrawide": CommandCenterUltrawide,
    "CommandCenterUltra": CommandCenterUltra,
    "MedicaoPage": MedicaoPage,
    "SimuladorPage": SimuladorPage,
    "MontagemPage": MontagemPage,
    // Novos módulos integrados
    "MetasFinanceirasPage": MetasFinanceirasPage,
    "AnaliseCustosPage": AnaliseCustosPage,
    "DiarioProducaoPage": DiarioProducaoPage,
    "EquipesPage": EquipesPage,
    "SugestoesIAPage": SugestoesIAPage,
    "CentrosCustoPage": CentrosCustoPage,
    // Módulos adicionais
    "ProducaoFuncionarioPage": ProducaoFuncionarioPage,
    "MultiObrasPage": MultiObrasPage,
    "ImportRomaneioPage": ImportRomaneioPage,
    "ReceitasPage": ReceitasPage,
    "DespesasPage": DespesasPage,
    "EnviosExpedicaoPage": EnviosExpedicaoPage,
    "MedicaoAutomaticaPage": MedicaoAutomaticaPage,
    "KanbanCortePage": KanbanCortePage,
    "EstoquePage": EstoquePage,
    // Módulos Gestão Financeira Integrada
    "GestaoFinanceiraObra": GestaoFinanceiraObra,
    "SimuladorOrcamento": SimuladorOrcamento,
    // "DashboardERPIntegrado": DashboardERPIntegrado,  // DEPRECADO → DashboardPremium
    "ExpedicaoIntegrado": ExpedicaoIntegrado,
    // Módulo 3D
    "MontexERP3DPage": MontexERP3DPage,
    // Croquis & Desenhos Técnicos
    "CroquisPage": CroquisPage,
    // Detalhamentos (Conjuntos Montados)
    "DetalhamentosPage": DetalhamentosPage,
    // Páginas adicionais
    "VendasPage": VendasPage,
    "RHPage": RHPage,
    "ComprasPage": ComprasPage,
    "EstoquePageV2": EstoquePageV2,
    "KanbanCorteIntegrado": KanbanCorteIntegrado,
    "KanbanProducaoIntegrado": KanbanProducaoIntegrado,
    // Gestão de Usuários
    "UsuariosPage": UsuariosPage,
}

export const pagesConfig = {
    mainPage: "DashboardPremium",
    Pages: PAGES,
    Layout: __Layout,
};