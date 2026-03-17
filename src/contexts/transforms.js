/**
 * MONTEX ERP Premium - Transformadores de Dados
 *
 * FunÃ§Ãµes para converter entre formatos:
 * - snake_case (Supabase) â camelCase (frontend)
 * - ValidaÃ§Ã£o de campos por tabela
 * - Aliases para compatibilidade com mock data
 */

// ========================================
// TRANSFORMADOR: snake_case â camelCase
// ========================================
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Transform single database record from snake_case to camelCase
 *
 * @description
 * Converts field names from Supabase snake_case format to JavaScript camelCase.
 * Allows frontend code to use idiomatic naming (e.g., `obraId` instead of `obra_id`).
 * Automatically applied to all records returned from Supabase queries.
 * Handles null/undefined values safely.
 *
 * @param {Object|null|undefined} record - Database record with snake_case field names
 * @returns {Object|null|undefined} Transformed record with camelCase field names, or original value if not an object
 *
 * @example
 * // Input from Supabase
 * const dbRecord = { obra_id: 1, status_corte: 'pending', peso_total: 50 };
 *
 * // After transformation
 * const transformed = transformRecord(dbRecord);
 * // Result: { obraId: 1, statusCorte: 'pending', pesoTotal: 50 }
 */
export function transformRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

/**
 * Transform array of database records from snake_case to camelCase
 *
 * @description
 * Batch transforms multiple records from Supabase. Converts all field names
 * to camelCase while preserving array structure and handling empty arrays safely.
 *
 * @param {Array<Object>|null|undefined} records - Array of database records to transform
 * @returns {Array<Object>} Array of transformed records with camelCase field names
 *
 * @example
 * const pecasFromDB = [
 *   { obra_id: 1, peso_total: 50, status_corte: 'pending' },
 *   { obra_id: 2, peso_total: 75, status_corte: 'done' }
 * ];
 *
 * const transformed = transformArray(pecasFromDB);
 * // Result: [
 * //   { obraId: 1, pesoTotal: 50, statusCorte: 'pending' },
 * //   { obraId: 2, pesoTotal: 75, statusCorte: 'done' }
 * // ]
 */
export function transformArray(records) {
  return (records || []).map(transformRecord);
}

// Transformar registro de estoque com aliases para compatibilidade
export function transformEstoqueRecord(record) {
  const base = transformRecord(record);
  if (base) {
    // Alias: preco â precoUnitario (EstoquePageV2 usa precoUnitario)
    if (base.preco !== undefined && base.precoUnitario === undefined) {
      base.precoUnitario = base.preco;
    }
    // Alias: minimo â minimoEstoque (compatibilidade)
    if (base.descricao === undefined && base.nome) {
      base.descricao = base.nome;
    }
  }
  return base;
}

export function transformEstoqueArray(records) {
  return (records || []).map(transformEstoqueRecord);
}

// Transformar peÃ§as com aliases (peso_total â peso para compatibilidade com mock)
export function transformPecaRecord(record) {
  const base = transformRecord(record);
  if (base) {
    // Aliases para compatibilidade com cÃ³digo que usa nomes do mock
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
// TRANSFORMADOR: camelCase â snake_case
// ========================================
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Mapeamento especial de campos do cÃ³digo â colunas reais do Supabase
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

// Colunas vÃ¡lidas na tabela pecas_producao
const PECAS_VALID_COLUMNS = new Set([
  'id', 'nome', 'obra_id', 'obra_nome', 'marca', 'tipo', 'perfil',
  'comprimento', 'quantidade', 'material', 'peso_total', 'peso_unitario',
  'etapa', 'status_corte', 'status', 'percentual_conclusao',
  'quantidade_produzida', 'responsavel', 'equipe_id', 'codigo',
  'data_inicio', 'data_fim_prevista', 'data_fim_real', 'observacoes',
  'funcionario_fabricacao', 'funcionario_solda', 'funcionario_pintura', 'funcionario_expedido'
]);

export function pecaToSupabase(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('_')) continue;
    // Usar mapeamento especial ou fallback para camelToSnake genÃ©rico
    const snakeKey = PECAS_FIELD_MAP[key] || camelToSnake(key);
    // SÃ³ incluir colunas que existem na tabela
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

// ========================================
// LANCAMENTOS: camelCase â snake_case com validaÃ§Ã£o
// ========================================
const LANCAMENTOS_FIELD_MAP = {
  obraId: 'obra_id',
  dataEmissao: 'data_emissao',
  dataVencimento: 'data_vencimento',
  dataPagamento: 'data_pagamento',
  notaFiscal: 'nota_fiscal',
  nf: 'nota_fiscal',
  formaPagto: 'forma_pagto',
  pesoKg: 'peso_kg',
  prePedidoRef: 'pre_pedido_ref',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

// Colunas vÃ¡lidas na tabela lancamentos_despesas
const LANCAMENTOS_VALID_COLUMNS = new Set([
  'id', 'obra_id', 'tipo', 'categoria', 'descricao', 'fornecedor',
  'nota_fiscal', 'valor', 'data_emissao', 'data_vencimento',
  'data_pagamento', 'status', 'pre_pedido_ref', 'peso_kg',
  'observacao', 'setor', 'forma_pagto', 'created_at', 'updated_at'
]);

export function lancamentoToSupabase(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('_')) continue;
    if (value === undefined || value === '') continue; // NÃ£o enviar campos vazios
    const snakeKey = LANCAMENTOS_FIELD_MAP[key] || camelToSnake(key);
    if (LANCAMENTOS_VALID_COLUMNS.has(snakeKey)) {
      result[snakeKey] = value;
    }
  }
  return result;
}

// ============================================
// ORCAMENTO: frontend -> Supabase com validação de colunas
// ============================================
const ORCAMENTOS_VALID_COLUMNS = new Set([
  'id', 'numero', 'cliente_id', 'obra_id', 'cliente_nome', 'status',
  'data_criacao', 'data_aprovacao', 'validade_ate', 'versao',
  'itens', 'valor_total', 'condicoes_pagamento', 'prazo_entrega',
  'observacoes', 'created_at', 'updated_at'
]);

export function orcamentoToSupabase(record) {
  if (!record || typeof record !== 'object') return record;
  const result = {};

  // Campos diretos
  if (record.id) result.id = record.id;
  if (record.numero) result.numero = record.numero;
  result.cliente_nome = record.cliente || record.clienteNome || record.cliente_nome || null;
  result.cliente_id = record.clienteId || record.cliente_id || null;
  result.obra_id = record.obraId || record.obra_id || null;
  result.status = record.status || 'rascunho';
  result.valor_total = record.valor_total || record.valorTotal || record.valor || 0;
  result.data_criacao = record.data_criacao || record.dataCriacao
    ? (record.data_criacao || record.dataCriacao).split('T')[0]
    : new Date().toISOString().split('T')[0];
  result.validade_ate = record.validade_ate || record.validade || null;
  result.versao = record.versao || 1;
  result.prazo_entrega = record.prazo_entrega || record.prazoEntrega || null;
  result.condicoes_pagamento = record.condicoes_pagamento || record.condicoesPagamento || null;

  // Dados complexos serializados como JSON no campo 'itens'
  const dadosCompletos = {};
  if (record.setores) dadosCompletos.setores = record.setores;
  if (record.custosUnitarios || record.unitCosts) dadosCompletos.custosUnitarios = record.custosUnitarios || record.unitCosts;
  if (record.calculations) dadosCompletos.calculations = record.calculations;
  if (record.paymentConditions) dadosCompletos.paymentConditions = record.paymentConditions;
  if (record.cronograma) dadosCompletos.cronograma = record.cronograma;
  if (record.escopo) dadosCompletos.escopo = record.escopo;
  if (record.resumo) dadosCompletos.resumo = record.resumo;
  if (record.nome) dadosCompletos.nome = record.nome;
  if (record.projeto) dadosCompletos.projeto = record.projeto;
  if (record.tipo) dadosCompletos.tipo = record.tipo;
  if (record.regiao) dadosCompletos.regiao = record.regiao;
  if (record.responsavel) dadosCompletos.responsavel = record.responsavel;
  if (record.peso_estimado || record.pesoEstimado) {
    dadosCompletos.pesoEstimado = record.peso_estimado || record.pesoEstimado;
  }
  if (record.valorBDI) dadosCompletos.valorBDI = record.valorBDI;
  if (record.numeroPropostas) dadosCompletos.numeroPropostas = record.numeroPropostas;
  if (record.dataEmissao) dadosCompletos.dataEmissao = record.dataEmissao;
  if (record.dataValidade) dadosCompletos.dataValidade = record.dataValidade;
  // Campo itens é jsonb no Supabase — enviar como objeto, não string
  result.itens = dadosCompletos;

  // Observações
  result.observacoes = record.observacoes || record.observacao || null;

  return result;
}

// Transformar orçamento do Supabase para formato do frontend
export function transformOrcamentoFromSupabase(record) {
  if (!record || typeof record !== 'object') return record;
  const base = transformRecord(record);
  // Extrair dados complexos do campo 'itens' (jsonb)
  if (base.itens && typeof base.itens === 'object' && !Array.isArray(base.itens)) {
    const itens = base.itens;
    if (itens.nome) base.nome = itens.nome;
    if (itens.projeto) base.projeto = itens.projeto;
    if (itens.tipo) base.tipo = itens.tipo;
    if (itens.regiao) base.regiao = itens.regiao;
    if (itens.responsavel) base.responsavel = itens.responsavel;
    if (itens.setores) base.setores = itens.setores;
    if (itens.custosUnitarios) base.custosUnitarios = itens.custosUnitarios;
    if (itens.calculations) base.calculations = itens.calculations;
    if (itens.paymentConditions) base.paymentConditions = itens.paymentConditions;
    if (itens.cronograma) base.cronograma = itens.cronograma;
    if (itens.escopo) base.escopo = itens.escopo;
    if (itens.resumo) base.resumo = itens.resumo;
    if (itens.pesoEstimado) base.pesoEstimado = itens.pesoEstimado;
    if (itens.valorBDI) base.valorBDI = itens.valorBDI;
    if (itens.numeroPropostas) base.numeroPropostas = itens.numeroPropostas;
    if (itens.dataEmissao) base.dataEmissao = itens.dataEmissao;
    if (itens.dataValidade) base.dataValidade = itens.dataValidade;
  }
  // Aliases
  base.cliente = base.clienteNome || base.cliente || '';
  base.valor = base.valorTotal || base.valor || 0;
  return base;
}

export function transformOrcamentoArray(records) {
  if (!records || !Array.isArray(records)) return [];
  return records.map(transformOrcamentoFromSupabase);
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
    const pesoEtapas = { corte: 0, fabricacao: 0, solda: 0, pintura: 0, expedicao: 0, montagem: 0 };
    let pesoTotalPecas = 0;

    pecasObra.forEach(p => {
      const etapa = p.etapa || 'aguardando';
      const peso = parseFloat(p.peso) || parseFloat(p.pesoTotal) || 0;
      pesoTotalPecas += peso;

      switch (etapa) {
        case 'montagem': etapas.montagem++; pesoEtapas.montagem += peso;
        // falls through
        case 'entregue': // falls through
        case 'enviado': // falls through (saiu da fábrica, conta como expedido+)
        case 'expedido': etapas.expedicao++; pesoEtapas.expedicao += peso;
        // falls through
        case 'pintura': etapas.pintura++; pesoEtapas.pintura += peso;
        // falls through
        case 'solda': etapas.solda++; pesoEtapas.solda += peso;
        // falls through
        case 'fabricacao': etapas.fabricacao++; pesoEtapas.fabricacao += peso;
        // falls through
        case 'corte': etapas.corte++; pesoEtapas.corte += peso; break;
        case 'aguardando': default: pesoTotalPecas += 0; break;
      }
    });

    return { ...obra, progresso: {
      corte: Math.round((etapas.corte / total) * 100),
      fabricacao: Math.round((etapas.fabricacao / total) * 100),
      solda: Math.round((etapas.solda / total) * 100),
      pintura: Math.round((etapas.pintura / total) * 100),
      expedicao: Math.round((etapas.expedicao / total) * 100),
      montagem: Math.round((etapas.montagem / total) * 100)
    }, pesoPorEtapa: {
      corte: pesoEtapas.corte,
      fabricacao: pesoEtapas.fabricacao,
      solda: pesoEtapas.solda,
      pintura: pesoEtapas.pintura,
      expedicao: pesoEtapas.expedicao,
      montagem: pesoEtapas.montagem,
      total: pesoTotalPecas
    }};
  });
}
