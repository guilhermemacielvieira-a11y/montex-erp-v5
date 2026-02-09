/**
 * MAPEAMENTO DE PRODUÇÃO - MONTEX ERP Premium V5
 *
 * Define o fluxo completo de produção:
 * CROQUI (CR) → CORTE → DETALHAMENTO (EM) → FABRICAÇÃO → CONJUNTO/MARCA → SOLDA → PINTURA → EXPEDIÇÃO
 *
 * Estrutura:
 * - CROQUIS (peças individuais) passam pelo CORTE
 * - DETALHAMENTOS (desenhos de montagem) guiam a FABRICAÇÃO
 * - CONJUNTOS (marcas de saída) são o resultado da FABRICAÇÃO
 */

// ========================================
// MAPEAMENTO: TIPO → DETALHAMENTO → CONJUNTO
// ========================================

export const TIPO_MAPPING = {
  COLUNA: {
    prefixoConjunto: 'C',
    sufixoConjunto: 'A',        // C1A, C2A, ..., C47A
    emInicio: 1,
    emFim: 47,
    totalDetalhamentos: 47,
    totalConjuntos: 47,
    mapeamento1para1: true,      // Cada EM mapeia exatamente para 1 conjunto
    descricao: 'Colunas principais da estrutura',
    prioridade: 'alta',
  },
  'VIGA-MESTRA': {
    prefixoConjunto: 'VM',
    sufixoConjunto: '',          // VM1, VM2, ..., VM7
    emInicio: 48,
    emFim: 54,
    totalDetalhamentos: 7,
    totalConjuntos: 7,
    mapeamento1para1: true,
    descricao: 'Vigas mestras - elementos estruturais principais',
    prioridade: 'alta',
  },
  TESOURA: {
    prefixoConjunto: 'TS',
    sufixoConjunto: '',          // TS1, TS2, ..., TS64
    emInicio: 55,
    emFim: 116,
    totalDetalhamentos: 62,
    totalConjuntos: 64,
    mapeamento1para1: false,     // Mais conjuntos que detalhamentos
    descricao: 'Tesouras - treliças de cobertura',
    prioridade: 'alta',
  },
  'TRELIÇA': {
    prefixoConjunto: 'TL',
    sufixoConjunto: '',          // TL1, TL2, ..., TL24
    emInicio: 117,
    emFim: 124,
    totalDetalhamentos: 8,
    totalConjuntos: 24,
    mapeamento1para1: false,
    descricao: 'Treliças de contraventamento',
    prioridade: 'media',
  },
  CONTRAVENTAMENTO: {
    prefixoConjunto: 'CT',
    sufixoConjunto: '',          // CT1, CT2, ..., CT34
    emInicio: 125,
    emFim: 127,
    totalDetalhamentos: 3,
    totalConjuntos: 34,
    mapeamento1para1: false,
    descricao: 'Contraventamentos - estabilidade lateral',
    prioridade: 'media',
  },
  VIGA: {
    prefixoConjunto: 'V',
    sufixoConjunto: '',          // V4, V5, ..., V26
    emInicio: 128,
    emFim: 130,
    totalDetalhamentos: 3,
    totalConjuntos: 23,
    mapeamento1para1: false,
    descricao: 'Vigas secundárias',
    prioridade: 'media',
  },
  TIRANTE: {
    prefixoConjunto: 'TR',
    sufixoConjunto: '',          // TR1, TR2, ..., TR96
    emInicio: 131,
    emFim: 144,
    totalDetalhamentos: 14,
    totalConjuntos: 96,
    mapeamento1para1: false,
    descricao: 'Tirantes de contraventamento',
    prioridade: 'media',
  },
  'TERÇA-TAP': {
    prefixoConjunto: 'TP',
    sufixoConjunto: '',          // TP1, TP2, ..., TP112
    emInicio: 145,
    emFim: 159,
    totalDetalhamentos: 15,
    totalConjuntos: 112,
    mapeamento1para1: false,
    descricao: 'Terças com travamento (TAP)',
    prioridade: 'normal',
  },
  'TERÇA': {
    prefixoConjunto: 'TC',
    sufixoConjunto: '',          // TC1, TC2, ..., TC82
    emInicio: 160,
    emFim: 169,
    totalDetalhamentos: 10,
    totalConjuntos: 82,
    mapeamento1para1: false,
    descricao: 'Terças de cobertura e fechamento',
    prioridade: 'normal',
  },
  'MISCELÂNEA': {
    prefixoConjunto: null,       // Vários: BC, CA, CB, CL, DN, MF, SP
    sufixoConjunto: '',
    emInicio: 170,
    emFim: 172,
    totalDetalhamentos: 3,
    totalConjuntos: 29,          // BC(2)+CA(16)+CB(4)+CL(1)+DN(1)+MF(4)+SP(1)
    mapeamento1para1: false,
    descricao: 'Itens diversos (bocais, calhas, chumbadores, etc.)',
    prioridade: 'normal',
    subtipos: {
      BOCAL:     { prefixo: 'BC', total: 2 },
      CALHA:     { prefixo: 'CA', total: 16 },
      CHUMBADOR: { prefixo: 'CB', total: 4 },
      COLUNETA:  { prefixo: 'CL', total: 1 },
      DIAGONAL:  { prefixo: 'DN', total: 1 },
      'MÃO-FRANCESA': { prefixo: 'MF', total: 4 },
      SUPORTE:   { prefixo: 'SP', total: 1 },
    }
  },
};

// ========================================
// MAPEAMENTO: CROQUI TIPO → CATEGORIA DE USO
// ========================================
// Os croquis (peças individuais) são classificados por tipo.
// Cada tipo de croqui é usado em um ou mais tipos de conjunto.

export const CROQUI_TIPO_MAPPING = {
  COLUNA:       { usadoEm: ['COLUNA'], descricao: 'Perfis de coluna (W, HP)' },
  TESOURA:      { usadoEm: ['TESOURA'], descricao: 'Perfis de tesoura (W)' },
  CHAPA:        { usadoEm: ['COLUNA', 'TESOURA', 'VIGA', 'VIGA-MESTRA'], descricao: 'Chapas de ligação, base, enrijecimento' },
  MISULA:       { usadoEm: ['COLUNA', 'VIGA'], descricao: 'Mísulas de ligação viga-coluna' },
  CHUMBADOR:    { usadoEm: ['COLUNA'], descricao: 'Chumbadores de base' },
  'TERÇA-TAP':  { usadoEm: ['TERÇA-TAP'], descricao: 'Terças com travamento automático progressivo' },
  VIGA:         { usadoEm: ['VIGA', 'VIGA-MESTRA'], descricao: 'Perfis de viga' },
  'VIGA-MESTRA':{ usadoEm: ['VIGA-MESTRA'], descricao: 'Perfis de viga mestra' },
  DIAGONAL:     { usadoEm: ['TRELIÇA', 'CONTRAVENTAMENTO'], descricao: 'Diagonais de treliça/contraventamento' },
};


// ========================================
// FUNÇÕES HELPER
// ========================================

/**
 * Entradas ordenadas por prefixo mais longo primeiro (CT antes de C, VM antes de V, etc.)
 * Inclui subtipos de MISCELÂNEA expandidos para matching correto.
 */
const _buildPrefixEntries = () => {
  const entries = [];
  for (const [tipo, config] of Object.entries(TIPO_MAPPING)) {
    if (config.prefixoConjunto) {
      entries.push({ tipo, prefixo: config.prefixoConjunto, sufixo: config.sufixoConjunto, config });
    }
    // Expandir subtipos (MISCELÂNEA: BC, CA, CB, CL, DN, MF, SP)
    if (config.subtipos) {
      for (const [subtipo, subConfig] of Object.entries(config.subtipos)) {
        entries.push({ tipo, subtipo, prefixo: subConfig.prefixo, sufixo: '', config });
      }
    }
  }
  // Ordenar por comprimento do prefixo (mais longo primeiro)
  entries.sort((a, b) => b.prefixo.length - a.prefixo.length);
  return entries;
};
const PREFIX_ENTRIES = _buildPrefixEntries();

/**
 * Dado um número de EM (detalhamento), retorna o tipo correspondente
 */
export function getTipoByEM(emNumero) {
  const num = typeof emNumero === 'string' ? parseInt(emNumero) : emNumero;
  for (const [tipo, config] of Object.entries(TIPO_MAPPING)) {
    if (num >= config.emInicio && num <= config.emFim) {
      return tipo;
    }
  }
  return null;
}

/**
 * Dado um número de EM, retorna o nome do conjunto correspondente (quando 1:1)
 * Ex: EM-1 → "C1A", EM-48 → "VM1", EM-55 → "TS1"
 */
export function getConjuntoByEM(emNumero) {
  const num = typeof emNumero === 'string' ? parseInt(emNumero) : emNumero;
  for (const [tipo, config] of Object.entries(TIPO_MAPPING)) {
    if (num >= config.emInicio && num <= config.emFim) {
      if (!config.prefixoConjunto) return null; // MISCELÂNEA não tem prefixo único
      const indice = num - config.emInicio + 1;
      return `${config.prefixoConjunto}${indice}${config.sufixoConjunto}`;
    }
  }
  return null;
}

/**
 * Dado um nome de conjunto (ex: "C1A", "TS5"), retorna o número EM correspondente
 * Usa matching por prefixo mais longo para evitar conflitos (CT antes de C)
 */
export function getEMByConjunto(conjuntoNome) {
  for (const entry of PREFIX_ENTRIES) {
    if (!conjuntoNome.startsWith(entry.prefixo)) continue;

    let numStr = conjuntoNome.substring(entry.prefixo.length);
    if (entry.sufixo && numStr.endsWith(entry.sufixo)) {
      numStr = numStr.substring(0, numStr.length - entry.sufixo.length);
    }
    const indice = parseInt(numStr);
    if (!isNaN(indice)) {
      const emNumero = entry.config.emInicio + indice - 1;
      if (emNumero <= entry.config.emFim) {
        return emNumero;
      }
    }
    // Se o prefixo matched mas o indice estava fora de range, não continuar
    // (para subtipos retorna null pois não tem EM direto)
    return null;
  }
  return null;
}

/**
 * Dado um nome de conjunto, retorna o tipo de detalhamento
 * Usa matching por prefixo mais longo para evitar conflitos
 */
export function getTipoByConjunto(conjuntoNome) {
  for (const entry of PREFIX_ENTRIES) {
    if (conjuntoNome.startsWith(entry.prefixo)) {
      return entry.tipo;
    }
  }
  return null;
}

/**
 * Retorna informações completas do detalhamento EM para um conjunto.
 * Para tipos 1:1 (COLUNA, VIGA-MESTRA): retorna o EM exato.
 * Para tipos N:M: retorna a faixa de EMs do tipo.
 */
export function getEMInfoByConjunto(conjuntoNome) {
  const emExato = getEMByConjunto(conjuntoNome);
  const tipo = getTipoByConjunto(conjuntoNome);
  if (!tipo) return null;

  const config = TIPO_MAPPING[tipo];
  if (!config) return null;

  return {
    tipo,
    emExato,               // número EM exato (null se não houver 1:1)
    emInicio: config.emInicio,
    emFim: config.emFim,
    totalDetalhamentos: config.totalDetalhamentos,
    mapeamento1para1: config.mapeamento1para1,
  };
}

/**
 * Retorna todos os tipos de croqui necessários para montar um tipo de conjunto
 */
export function getCroquiTiposParaConjunto(tipoConjunto) {
  const croquiTipos = [];
  for (const [croquiTipo, config] of Object.entries(CROQUI_TIPO_MAPPING)) {
    if (config.usadoEm.includes(tipoConjunto)) {
      croquiTipos.push(croquiTipo);
    }
  }
  return croquiTipos;
}

/**
 * Etapas de produção com descrição do que acontece em cada uma
 */
export const ETAPAS_PRODUCAO_DETALHADAS = {
  aguardando: {
    nome: 'Aguardando',
    descricao: 'Peça/conjunto aguardando início de produção',
    itemTipo: 'ambos', // croqui ou conjunto
    icon: '⏳',
  },
  corte: {
    nome: 'Corte',
    descricao: 'Croquis individuais sendo cortados conforme CR',
    itemTipo: 'croqui',
    icon: '✂️',
  },
  fabricacao: {
    nome: 'Fabricação',
    descricao: 'Montagem dos croquis cortados conforme detalhamento EM',
    itemTipo: 'conjunto',
    icon: '🔧',
  },
  solda: {
    nome: 'Solda',
    descricao: 'Soldagem das ligações do conjunto montado',
    itemTipo: 'conjunto',
    icon: '⚡',
  },
  pintura: {
    nome: 'Pintura',
    descricao: 'Jateamento e pintura do conjunto soldado',
    itemTipo: 'conjunto',
    icon: '🎨',
  },
  expedido: {
    nome: 'Expedido',
    descricao: 'Conjunto pronto para embarque/transporte',
    itemTipo: 'conjunto',
    icon: '🚛',
  },
};

/**
 * Resumo geral do projeto
 */
export const PROJETO_RESUMO = {
  nome: 'SUPER LUNA - Belo Vale',
  codigo: '2025-52',
  totalDetalhamentos: 172,
  totalConjuntos: 518,
  pesoTotal: 109852.3, // kg
  tiposEstruturais: Object.keys(TIPO_MAPPING).length,
};

export default {
  TIPO_MAPPING,
  CROQUI_TIPO_MAPPING,
  ETAPAS_PRODUCAO_DETALHADAS,
  PROJETO_RESUMO,
  getTipoByEM,
  getConjuntoByEM,
  getEMByConjunto,
  getEMInfoByConjunto,
  getTipoByConjunto,
  getCroquiTiposParaConjunto,
};
