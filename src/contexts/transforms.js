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
  'data_inicio', 'data_fim_prevista', 'data_fim_real', 'observacoes'
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
