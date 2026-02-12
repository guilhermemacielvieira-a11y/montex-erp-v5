/**
 * MONTEX ERP Premium - Transformadores de Dados
 *
 * Funções para converter entre formatos:
 * - snake_case (Supabase) ↔ camelCase (frontend)
 * - Validação de campos por tabela
 * - Aliases para compatibilidade com mock data
 */

// ========================================
// TRANSFORMADOR: snake_case → camelCase
// ========================================
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function transformRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

export function transformArray(records) {
  return (records || []).map(transformRecord);
}

// Transformar peças com aliases (peso_total → peso para compatibilidade com mock)
export function transformPecaRecord(record) {
  const base = transformRecord(record);
  if (base) {
    // Aliases para compatibilidade com código que usa nomes do mock
    if (base.pesoTotal !== undefined && base.peso === undefined) {
      base.peso = base.pesoTotal;
    }
    if (base.pesoUnitario !== undefined && base.pesoUnit === undefined) {
      base.pesoUnit = base.pesoUnitario;
    }
  }
    // Defaults para campos nulos (evitar crashes no Kanban)
    if (!base.peso && base.peso !== 0) base.peso = base.pesoTotal || base.pesoUnitario || 0;
    if (!base.perfil) base.perfil = base.tipo || '';
    if (!base.comprimento) base.comprimento = 0;
    if (!base.material) base.material = 'A-36';
    if (!base.tipo) base.tipo = base.nome || 'PECA';
    if (!base.marca) base.marca = base.codigo || base.id || '';
    if (!base.statusCorte) base.statusCorte = 'aguardando';
    if (!base.etapa) base.etapa = 'aguardando';
    if (!base.quantidade) base.quantidade = 1;
  return base;
}

export function transformPecaArray(records) {
  return (records || []).map(transformPecaRecord);
}

// ========================================
// TRANSFORMADOR: camelCase → snake_case
// ========================================
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Mapeamento especial de campos do código → colunas reais do Supabase
const PECAS_FIELD_MAP = {
  peso: 'peso_total',
  pesoUnit: 'peso_unitario',
  pesoTotal: 'peso_total',
  pesoUnitario: 'peso_unitario',
  obraId: 'obra_id',
  obraNome: 'obra_nome',
  statusCorte: 'status_corte',
  percentualConclusao: 'percentual_conclusao',
  quantidadeProduzida: 'quantidade_produzida',
  equipeId: 'equipe_id',
  dataInicio: 'data_inicio',
  dataFimPrevista: 'data_fim_prevista',
  dataFimReal: 'data_fim_real',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Colunas válidas na tabela pecas_producao
const PECAS_VALID_COLUMNS = new Set([
  'id', 'nome', 'obra_id', 'obra_nome', 'marca', 'tipo', 'perfil',
  'comprimento', 'quantidade', 'material', 'peso_total', 'peso_unitario',
  'etapa', 'status_corte', 'status', 'percentual_conclusao',
  'quantidade_produzida', 'responsavel', 'equipe_id', 'codigo',
  'data_inicio', 'data_fim_prevista', 'data_fim_real', 'observacoes'
]);

export function pecaToSupabase(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('_')) continue;
    // Usar mapeamento especial ou fallback para camelToSnake genérico
    const snakeKey = PECAS_FIELD_MAP[key] || camelToSnake(key);
    // Só incluir colunas que existem na tabela
    if (PECAS_VALID_COLUMNS.has(snakeKey)) {
      result[snakeKey] = value;
    }
  }
  return result;
}

export function reverseTransformRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('_')) continue;
    result[camelToSnake(key)] = value;
  }
  return result;
}

// ============================================
// OBRA TRANSFORMS (Supabase -> React)
// ============================================

// Mapeamento de status do Supabase para STATUS_OBRA do sistema
export const STATUS_MAP_SUPABASE = {
  'ativo': 'em_producao',
  'concluido': 'concluida',
  'pausado': 'aguardando_material',
  'cancelado': 'cancelada',
  'em_fabricacao': 'em_producao',
  'planejamento': 'em_projeto'
};

// Transformar registro de obra com aliases de campo
export function transformObraRecord(record) {
  const base = transformRecord(record);
  if (base) {
    // Mapear status do Supabase para status do sistema
    if (base.status && STATUS_MAP_SUPABASE[base.status]) {
      base.status = STATUS_MAP_SUPABASE[base.status];
    }
    // Aliases de campos do Supabase
    if (base.contratoPesoTotal !== undefined && base.pesoTotal === undefined) {
      base.pesoTotal = base.contratoPesoTotal;
    }
    if (base.contratoValorTotal !== undefined && base.valorContrato === undefined) {
      base.valorContrato = base.contratoValorTotal;
    }
    if (base.contratoPrazoMeses !== undefined && base.prazoMeses === undefined) {
      base.prazoMeses = base.contratoPrazoMeses;
    }
    if (base.dataPrevistaFim !== undefined && base.previsaoTermino === undefined) {
      base.previsaoTermino = base.dataPrevistaFim;
    }
    // Garantir objeto progresso
    if (!base.progresso) {
      base.progresso = { corte: 0, fabricacao: 0, solda: 0, pintura: 0, expedicao: 0, montagem: 0 };
    }
  }
  return base;
}

// Transformar array de obras
export function transformObraArray(records) {
  return (records || []).map(transformObraRecord);
}

// Calcular progresso da obra baseado nas pecas
export function calcularProgressoObra(obras, pecas) {
  return obras.map(obra => {
    const pecasObra = pecas.filter(p => p.obraId === obra.id);
    if (pecasObra.length === 0) return obra;
    const total = pecasObra.length;
    const etapas = { corte: 0, fabricacao: 0, solda: 0, pintura: 0, expedicao: 0, montagem: 0 };
    pecasObra.forEach(p => {
      const etapa = p.etapa || 'aguardando';
      switch (etapa) {
        case 'montagem': etapas.montagem++;
        case 'expedido': etapas.expedicao++;
        case 'pintura': etapas.pintura++;
        case 'solda': etapas.solda++;
        case 'fabricacao': etapas.fabricacao++;
        case 'corte': etapas.corte++; break;
        case 'aguardando': default: break;
      }
    });
    return { ...obra, progresso: {
      corte: Math.round((etapas.corte / total) * 100),
      fabricacao: Math.round((etapas.fabricacao / total) * 100),
      solda: Math.round((etapas.solda / total) * 100),
      pintura: Math.round((etapas.pintura / total) * 100),
      expedicao: Math.round((etapas.expedicao / total) * 100),
      montagem: Math.round((etapas.montagem / total) * 100)
    }};
  });
}
