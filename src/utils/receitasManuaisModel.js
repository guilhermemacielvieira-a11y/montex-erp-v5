// ============================================================
// RECEITAS MANUAIS — mapeamento puro (testável) entre a tabela
// `receitas_manuais` (snake_case) e o formato usado nas telas.
// ============================================================
// Formato de app (compatível com o legado 'montex_receitas_gerais'):
//   { id, data, descricao, cliente, categoria, valor, valorLiquido, status,
//     formaPagto, vencimento, dataRecebimento, obraId, recorrenciaId,
//     observacao, origemObra: false }
// `status` sempre canônico: aberto | faturado | recebido | cancelado.
// ============================================================
import { normalizeStatusReceita } from './financeiroStatus';
import { parseDataBR, parseValorBR, hojeLocalISO } from './financeiroCalc';

const dataOuNull = (v) => {
  if (!v || v === '-') return null;
  return parseDataBR(v) || null;
};

const numOuNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseValorBR(v);
  return Number.isFinite(n) ? n : null;
};

/** Linha do banco → objeto de app. */
export function receitaRowToApp(row) {
  if (!row) return null;
  const valor = Number(row.valor_bruto) || 0;
  return {
    id: row.id,
    data: row.data_emissao || row.data_vencimento || '',
    descricao: row.descricao || '',
    cliente: row.cliente || '-',
    categoria: row.categoria || 'Outros',
    valor,
    valorLiquido: row.valor_liquido === null || row.valor_liquido === undefined ? valor : Number(row.valor_liquido) || 0,
    status: normalizeStatusReceita(row.status),
    formaPagto: row.forma_pagto || '-',
    vencimento: row.data_vencimento || row.data_emissao || '',
    dataRecebimento: row.data_recebimento || null,
    obraId: row.obra_id || null,
    recorrenciaId: row.recorrencia_id || null,
    observacao: row.observacoes || '',
    origemObra: false,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

/**
 * Objeto de app (ou legado do localStorage) → linha do banco.
 * Aceita campos legados: valor, data, vencimento, dataPagamento, obraId,
 * formaPagto, observacao. Quando recebido sem data de recebimento, usa
 * `hoje` (injetável para testes).
 */
export function receitaAppToRow(app, { hoje = hojeLocalISO() } = {}) {
  const status = normalizeStatusReceita(app.status);
  const valorBruto = numOuNull(app.valorBruto ?? app.valor) ?? 0;
  const valorLiquido = numOuNull(app.valorLiquido);
  const dataEmissao = dataOuNull(app.dataEmissao ?? app.data) || dataOuNull(app.vencimento);
  const dataVencimento = dataOuNull(app.dataVencimento ?? app.vencimento);
  let dataRecebimento = dataOuNull(app.dataRecebimento ?? app.dataPagamento);
  if (status === 'recebido' && !dataRecebimento) dataRecebimento = dataVencimento && dataVencimento <= hoje ? dataVencimento : hoje;
  if (status !== 'recebido') dataRecebimento = null;
  const limpaTraco = (v) => (v && v !== '-' ? String(v) : null);
  return {
    id: String(app.id),
    obra_id: app.obraId || app.obra_id || null,
    descricao: app.descricao || '',
    cliente: limpaTraco(app.cliente),
    categoria: app.categoria || 'Outros',
    valor_bruto: valorBruto,
    valor_liquido: valorLiquido,
    data_emissao: dataEmissao,
    data_vencimento: dataVencimento,
    data_recebimento: dataRecebimento,
    status,
    forma_pagto: limpaTraco(app.formaPagto),
    recorrencia_id: app.recorrenciaId || null,
    observacoes: app.observacao || app.observacoes || null,
  };
}

/**
 * Lista de receitas legadas (localStorage/entity_store) que ainda NÃO estão
 * na tabela. Ignora tombstones e entradas sem id/valor.
 */
export function receitasLegadasPendentes(legadas, existentesIds = [], deletedIds = []) {
  const existentes = new Set(existentesIds);
  const tomb = new Set(deletedIds);
  const vistos = new Set();
  return (legadas || []).filter((r) => {
    if (!r || !r.id || r.origemObra) return false;
    if (existentes.has(r.id) || tomb.has(r.id) || vistos.has(r.id)) return false;
    vistos.add(r.id);
    return true;
  });
}
