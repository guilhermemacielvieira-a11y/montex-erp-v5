// ============================================================
// Rastreabilidade de estoque — extrato de movimentações por item
// ============================================================
// Monta o histórico (ledger) de um item de estoque a partir das movimentações:
// entradas de COMPRA, baixas de PRODUÇÃO, ESTORNOS e lançamentos MANUAIS/NF.
// Tolerante a snake_case (direto do banco) e camelCase (transformado pelo
// contexto). Puro/testável; usado por HistoricoItemModal.jsx.
// ============================================================
import { normalizar } from './abastecimento';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;
const pick = (obj, ...keys) => {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
};

export const ORIGEM_INFO = {
  compra: { label: 'Compra', cor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  producao: { label: 'Produção', cor: 'bg-red-500/20 text-red-300 border-red-500/40' },
  estorno_producao: { label: 'Estorno produção', cor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  nf: { label: 'Nota fiscal', cor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  manual: { label: 'Manual', cor: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
};
export const rotuloOrigem = (o) => ORIGEM_INFO[o]?.label || o || 'Manual';

export const movItemId = (m) => pick(m, 'itemId', 'item_id', 'estoque_id', 'estoqueId');
export const movPerfil = (m) => String(pick(m, 'materialPerfil', 'material_perfil', 'perfil') || '');

// Normaliza um registro de movimentação para o formato do extrato.
export function normalizarMov(m = {}) {
  return {
    id: pick(m, 'id'),
    data: pick(m, 'data', 'created_at', 'createdAt') || '',
    tipo: String(pick(m, 'tipo') || '').toLowerCase(),
    origem: String(pick(m, 'origem') || 'manual'),
    quantidade: num(pick(m, 'quantidade')),
    unidade: pick(m, 'unidade') || '',
    saldoAnterior: pick(m, 'saldoAnterior', 'saldo_anterior'),
    saldoNovo: pick(m, 'saldoNovo', 'saldo_novo'),
    custoUnitario: num(pick(m, 'custoUnitario', 'custo_unitario')),
    motivo: pick(m, 'motivo') || '',
    obraId: pick(m, 'obraId', 'obra_id') || null,
    pecaId: pick(m, 'pecaId', 'peca_id') || null,
    notaFiscal: pick(m, 'notaFiscal', 'nota_fiscal') || null,
    documentoUrl: pick(m, 'documentoUrl', 'documento_url') || null,
    materialPerfil: movPerfil(m),
  };
}

// Extrato de UM item: casa por item_id; para registros legados SEM item_id, casa
// pelo perfil (12 chars normalizados). Ordena da mais recente para a mais antiga.
export function historicoDoItem(movs = [], item = {}) {
  const id = item?.id != null ? String(item.id) : null;
  const perfilKey = normalizar(item?.perfil || item?.codigo || '').slice(0, 12);
  const filtradas = (movs || []).filter((m) => {
    const mid = movItemId(m);
    if (id && mid != null && String(mid) === id) return true;
    if ((mid == null || mid === '') && perfilKey && normalizar(movPerfil(m)).includes(perfilKey)) return true;
    return false;
  }).map(normalizarMov);
  filtradas.sort((a, b) => String(b.data).localeCompare(String(a.data)));
  return filtradas;
}

// Resumo do extrato: totais de entrada/saída, saldo líquido e quebra por origem.
export function resumoRastreabilidade(historico = []) {
  let entradas = 0, saidas = 0;
  const porOrigem = {};
  (historico || []).forEach((m) => {
    const q = num(m.quantidade);
    if (m.tipo === 'entrada') entradas += q;
    else if (m.tipo === 'saida') saidas += q;
    const o = m.origem || 'manual';
    if (!porOrigem[o]) porOrigem[o] = { origem: o, label: rotuloOrigem(o), entradas: 0, saidas: 0, count: 0 };
    porOrigem[o].count += 1;
    if (m.tipo === 'entrada') porOrigem[o].entradas = r2(porOrigem[o].entradas + q);
    else if (m.tipo === 'saida') porOrigem[o].saidas = r2(porOrigem[o].saidas + q);
  });
  return {
    total: (historico || []).length,
    entradas: r2(entradas),
    saidas: r2(saidas),
    saldoLiquido: r2(entradas - saidas),
    porOrigem: Object.values(porOrigem).sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas)),
  };
}
