// MONTEX ERP Premium - Command Center Data
// Sistema de dados - Estrutura limpa para nova implementação

// ============================================
// PRODUÇÃO EM TEMPO REAL
// ============================================
export const producaoTempoReal = [];

// ============================================
// MÉTRICAS DE MÁQUINAS EM TEMPO REAL
// ============================================
export const maquinasStatus = [];

// ============================================
// KPIs INDUSTRIAIS
// ============================================
export const kpisIndustriais = {
  oee: {
    valor: 0,
    meta: 85,
    disponibilidade: 0,
    performance: 0,
    qualidade: 0,
    tendencia: [],
  },
  mtbf: {
    valor: 0,
    meta: 720,
    unidade: 'horas',
    ultimaFalha: null,
    tendencia: [],
  },
  mttr: {
    valor: 0,
    meta: 4,
    unidade: 'horas',
    ultimoReparo: null,
    tendencia: [],
  },
  taxaRetrabalho: {
    valor: 0,
    meta: 2,
    tendencia: [],
  },
  produtividade: {
    valor: 0,
    meta: 100,
    unidade: 'peças/hora',
    tendencia: [],
  },
};

// ============================================
// FLUXO FINANCEIRO
// ============================================
export const fluxoFinanceiro = {
  receitasMes: 0,
  despesasMes: 0,
  lucroMes: 0,
  receitasPorDia: [],
  despesasPorDia: [],
  fluxoCaixa: [],
};

// ============================================
// PIPELINE DE VENDAS
// ============================================
export const pipelineVendas = {
  totalPipeline: 0,
  probabilidadePonderada: 0,
  conversaoMedia: 0,
  cicloMedio: 0,
  etapas: [],
  topOportunidades: [],
};

// ============================================
// RECURSOS HUMANOS
// ============================================
export const recursosHumanos = {
  totalColaboradores: 0,
  presentes: 0,
  ausentes: 0,
  ferias: 0,
  turnos: [],
  setores: [],
  indicadores: {
    turnover: 0,
    absenteismo: 0,
    satisfacao: 0,
    treinamentoHoras: 0,
  },
};

// ============================================
// DADOS GEOGRÁFICOS
// ============================================
export const dadosGeograficos = {
  projetos: [],
  clientes: [],
  fornecedores: [],
};

// ============================================
// MÉTRICAS DE QUALIDADE
// ============================================
export const qualidadeMetricas = {
  conformidade: 0,
  naoConformidades: 0,
  inspecoesPendentes: 0,
  certificacoes: [],
  auditoriaProxima: null,
  defeitosPorTipo: [],
  tendenciaQualidade: [],
};

// ============================================
// LOGÍSTICA E ENTREGAS
// ============================================
export const logisticaMetricas = {
  expedicoesHoje: 0,
  expedicoesSemana: 0,
  pesoExpedido: 0,
  entregas: {
    noPrazo: 0,
    atrasadas: 0,
  },
  entregasPendentes: 0,
  veiculos: [],
};

// ============================================
// ENERGIA E SUSTENTABILIDADE
// ============================================
export const energiaMetricas = {
  consumoAtual: 0,
  consumoMedio: 0,
  picoConsumo: 0,
  custoMensal: 0,
  emissoesCO2: 0,
  fonteEnergia: {
    rede: 0,
    solar: 0,
    gerador: 0,
  },
  metas: {
    reducaoConsumo: 0,
    energiaRenovavel: 0,
  },
  consumoDiario: [],
};

// ============================================
// ALERTAS INTELIGENTES
// ============================================
export const alertasInteligentes = [];

// ============================================
// PREVISÕES E TENDÊNCIAS (ML Simulado)
// ============================================
export const previsoesTendencias = {
  producaoProximaSemana: [],
  riscoProjetos: [],
  demandaEstimada: {
    proximoMes: 0,
    unidade: 'ton',
    crescimento: 0,
    confianca: 0,
  },
};

// ============================================
// COMPARATIVO DE PERFORMANCE
// ============================================
export const comparativoPerformance = {
  mesAtual: {
    producao: 0,
    faturamento: 0,
    entregas: 0,
    qualidade: 0,
  },
  mesAnterior: {
    producao: 0,
    faturamento: 0,
    entregas: 0,
    qualidade: 0,
  },
  metaMensal: {
    producao: 0,
    faturamento: 0,
    entregas: 0,
    qualidade: 0,
  },
  variacoes: {
    producao: 0,
    faturamento: 0,
    entregas: 0,
    qualidade: 0,
  },
};

// ============================================
// INDICADORES POR PROJETO
// ============================================
export const indicadoresPorProjeto = [];

// ============================================
// OBJETO AGRUPADO PARA IMPORT ÚNICO
// ============================================
export const commandCenterData = {
  producaoTempoReal,
  maquinasStatus,
  kpisIndustriais,
  fluxoFinanceiro,
  pipelineVendas,
  recursosHumanos,
  dadosGeograficos,
  qualidadeMetricas,
  logisticaMetricas,
  energiaMetricas,
  alertasInteligentes,
  previsoesTendencias,
  comparativoPerformance,
  indicadoresPorProjeto,
};

export default commandCenterData;
