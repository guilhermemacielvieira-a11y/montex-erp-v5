// ============================================================
// ACESSO POR PÁGINA (desktop) — fonte única
// ============================================================
// Cada página do desktop (pages.config) exige:
//   modulo: permissão de ACESSO ao módulo (a mesma do menu lateral) — OR se array
//   perm:   permissão fina da tela (ex.: estoque.view, kanban.view) — OR se array
// A página abre só com as duas. Página fora do mapa = só administrador ('*').
// Usado pelo menu lateral, pela barra inferior, pela paleta de comandos e pela
// trava de rota (App.jsx): quem digita o link de um módulo não liberado vê
// "Sem acesso", não a tela.
// Testado em src/__tests__/acessoPaginas.test.js.
// ============================================================

const P = (modulo, perm = null) => ({ modulo, perm });

export const PAGINAS = {
  // Dashboard
  VisaoGeralPage: P('dashboard.view'),
  DashboardPremium: P('dashboard.view'),

  // Comercial
  OrcamentosPage: P('comercial.view', 'orcamentos.view'),
  SimuladorOrcamento: P('comercial.view', 'orcamentos.view'),
  AprovacaoOrcamento: P('comercial.view', ['orcamentos.aprovar', 'orcamentos.view']),
  Clientes: P('comercial.view', 'clientes.view'),
  Projetos: P('comercial.view', 'projetos.view'),

  // Suprimentos
  ImportRomaneioPage: P('suprimentos.view', 'materiais.view'),
  CroquisPage: P('suprimentos.view', 'materiais.view'),
  DetalhamentosPage: P('suprimentos.view', 'materiais.view'),
  EstoquePage: P('suprimentos.view', 'estoque.view'),
  EstoquePageV2: P('suprimentos.view', 'estoque.view'),
  ComprasPage: P('suprimentos.view', 'compras.view'),
  MateriaisPage: P('suprimentos.view', 'materiais.view'),

  // Produção
  KanbanCortePage: P('producao.view', 'kanban.view'),
  KanbanProducaoIntegrado: P('producao.view', 'kanban.view'),
  ProducaoPage: P('producao.view'),
  ProducaoFuncionarioPage: P('producao.view'),
  DiarioProducaoPage: P('producao.view'),
  AnaliseProducaoPage: P('producao.view'),
  AtualizacaoProducaoIndependente: P('producao.view', 'producao.lancar_avanco'),
  AtualizacaoProducaoPublica: P('producao.view', 'producao.lancar_avanco'),
  EquipesPage: P('producao.view', 'equipes.view'),
  RHPage: P('producao.view', 'equipes.edit'),

  // Expedição
  EnviosExpedicaoPage: P('expedicao.view'),
  ExpedicaoIntegrado: P('expedicao.view'),

  // Obras
  MultiObrasPage: P('obras.view'),
  GestaoObrasPage: P('obras.view'),
  MontagemPage: P('obras.view', 'montagem.view'),
  ParedeProntaPage: P('obras.view'),

  // Medição
  MedicaoAutomaticaPage: P('medicao.view'),

  // Financeiro
  GestaoFinanceiraObra: P('financeiro.view'),
  FinanceiroPage: P('financeiro.view'),
  ReceitasPage: P('financeiro.view'),
  DespesasPage: P('financeiro.view'),
  MetasFinanceirasPage: P('financeiro.view'),
  PainelFinanceiroGlobal: P('financeiro.view'),
  AnaliseCustosPage: P('financeiro.view'),
  CentrosCustoPage: P('financeiro.view'),
  RelatoriosFinanceiros: P('financeiro.view'),
  DREPage: P('financeiro.view'),
  VendasPage: P('financeiro.view'),

  // BI
  BI360: P('bi.view'),
  RadarAlertas: P('bi.view'),
  DashboardBI: P('bi.view'),
  BIOperacional: P('bi.view'),
  BITatico: P('bi.view'),
  BIEstrategico: P('bi.view'),

  // Command Center / 3D
  MontexERP3DPage: P('viewer3d.view'),
  SimuladorPage: P('command.view'),
  CommandCenterUltrawide: P('command.view'),
  CommandCenterUltra: P('command.view'),

  // Colaboração & IA (relatórios também ficam no Financeiro)
  Copiloto: P('colaboracao.view'),
  InsightsIA: P('colaboracao.view'),
  CentralTarefas: P('colaboracao.view'),
  Tarefas: P('colaboracao.view'),
  Automacoes: P('colaboracao.view'),
  ColaboracaoProjetos: P('colaboracao.view'),
  Chatbot: P('colaboracao.view'),
  Analisador: P('colaboracao.view'),
  SugestoesIAPage: P('colaboracao.view'),
  CentralRelatorios: P(['colaboracao.view', 'financeiro.view'], 'relatorios.view'),
  Relatorios: P(['colaboracao.view', 'financeiro.view'], 'relatorios.view'),
  RelatoriosIA: P(['colaboracao.view', 'financeiro.view'], 'relatorios.view'),
  GerenciadorRelatorios: P(['colaboracao.view', 'financeiro.view'], 'relatorios.view'),
  AgendamentosRelatorios: P(['colaboracao.view', 'financeiro.view'], 'relatorios.view'),

  // Sistema
  GestaoUsuariosPage: P('usuarios.manage'),
  UsuariosPage: P('usuarios.manage'),
};

// Ordem de preferência da página inicial quando a padrão não é permitida.
export const ORDEM_INICIAL = [
  'CommandCenterUltra', 'VisaoGeralPage', 'DashboardPremium', 'KanbanProducaoIntegrado',
  'EnviosExpedicaoPage', 'EstoquePage', 'ComprasPage', 'MateriaisPage', 'GestaoObrasPage',
  'MontagemPage', 'FinanceiroPage', 'OrcamentosPage', 'BI360', 'MedicaoAutomaticaPage',
  'CentralTarefas', 'MontexERP3DPage',
];

const algum = (spec, tem) => (Array.isArray(spec) ? spec : [spec]).some((p) => tem(p));

/**
 * A página `pagina` está liberada? `tem(perm)` = hasPermission do AuthContext
 * (já resolve '*', override por usuário e preset do papel).
 */
export function podeAcessarPagina(pagina, tem) {
  if (typeof tem !== 'function' || !pagina) return false;
  const regra = PAGINAS[pagina];
  if (!regra) return tem('*');
  if (!algum(regra.modulo, tem)) return false;
  return regra.perm == null || algum(regra.perm, tem);
}

/** Primeira página liberada (para a inicial e para "Sem acesso"). null = nenhuma. */
export function primeiraPaginaPermitida(tem, preferida = null) {
  if (preferida && podeAcessarPagina(preferida, tem)) return preferida;
  const ordem = [...ORDEM_INICIAL, ...Object.keys(PAGINAS)];
  return ordem.find((p) => podeAcessarPagina(p, tem)) || null;
}

/** Nomes legíveis dos módulos liberados (resumo para o usuário). */
export const ROTULOS_MODULO = {
  'dashboard.view': 'Dashboard', 'comercial.view': 'Comercial', 'suprimentos.view': 'Suprimentos',
  'producao.view': 'Produção', 'expedicao.view': 'Expedição', 'obras.view': 'Obras',
  'medicao.view': 'Medição', 'financeiro.view': 'Financeiro', 'bi.view': 'BI',
  'viewer3d.view': '3D', 'command.view': 'Command Center', 'colaboracao.view': 'Colaboração',
  'usuarios.manage': 'Usuários',
};

export function modulosLiberados(tem) {
  if (typeof tem !== 'function') return [];
  return Object.entries(ROTULOS_MODULO).filter(([perm]) => tem(perm)).map(([, rotulo]) => rotulo);
}
