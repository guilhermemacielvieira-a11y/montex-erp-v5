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
