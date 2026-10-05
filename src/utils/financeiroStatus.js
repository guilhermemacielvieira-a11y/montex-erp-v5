// ============================================================
// STATUS FINANCEIRO CANÔNICO
// ============================================================
// Vocabulário ÚNICO usado pelos módulos financeiros (Receitas, Despesas, GFO,
// Painel Global, DRE). Os dados legados usam várias grafias ('paga', 'PAGO',
// 'faturada', 'prevista', 'aguardando'...). Estes normalizadores convertem
// qualquer valor legado para o vocabulário canônico, SEM alterar o banco.
//
// RECEITAS: aberto → faturado → recebido   (ou cancelado)
// DESPESAS: pendente → aprovado → pago      (ou cancelado)
//
// REGRA: `faturado` NÃO é dinheiro em caixa — não conta como recebido.
// ============================================================

export const STATUS_RECEITA = Object.freeze({
  ABERTO: 'aberto',
  FATURADO: 'faturado',
  RECEBIDO: 'recebido',
  CANCELADO: 'cancelado',
});

export const STATUS_DESPESA = Object.freeze({
  PENDENTE: 'pendente',
  APROVADO: 'aprovado',
  PAGO: 'pago',
  CANCELADO: 'cancelado',
});

export const STATUS_RECEITA_LABELS = Object.freeze({
  aberto: 'Em aberto',
  faturado: 'Faturado',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
});

export const STATUS_DESPESA_LABELS = Object.freeze({
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  pago: 'Pago',
  cancelado: 'Cancelado',
});

const limpar = (s) => String(s ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[\s-]+/g, '_');

const RECEITA_MAP = {
  recebido: 'recebido', recebida: 'recebido', pago: 'recebido', paga: 'recebido',
  confirmado: 'recebido', confirmada: 'recebido', quitado: 'recebido', quitada: 'recebido',
  liquidado: 'recebido', liquidada: 'recebido',
  faturado: 'faturado', faturada: 'faturado', emitido: 'faturado', emitida: 'faturado',
  aprovado: 'faturado', aprovada: 'faturado',
  cancelado: 'cancelado', cancelada: 'cancelado', rejeitado: 'cancelado', rejeitada: 'cancelado',
  estornado: 'cancelado', estornada: 'cancelado',
  aberto: 'aberto', aberta: 'aberto', em_aberto: 'aberto', pendente: 'aberto',
  prevista: 'aberto', previsto: 'aberto', aguardando: 'aberto', em_analise: 'aberto',
  atrasado: 'aberto', atrasada: 'aberto', vencido: 'aberto', vencida: 'aberto',
};

const DESPESA_MAP = {
  pago: 'pago', paga: 'pago', quitado: 'pago', quitada: 'pago',
  liquidado: 'pago', liquidada: 'pago', confirmado: 'pago', confirmada: 'pago',
  aprovado: 'aprovado', aprovada: 'aprovado', pre_aprovado: 'aprovado',
  faturado: 'aprovado', faturada: 'aprovado',
  cancelado: 'cancelado', cancelada: 'cancelado', estornado: 'cancelado', estornada: 'cancelado',
  pendente: 'pendente', aberto: 'pendente', em_aberto: 'pendente', futuro: 'pendente',
  aguardando: 'pendente', atrasado: 'pendente', atrasada: 'pendente', vencido: 'pendente',
  prevista: 'pendente', previsto: 'pendente',
};

/** Normaliza um status de receita para aberto|faturado|recebido|cancelado. */
export function normalizeStatusReceita(status) {
  const k = limpar(status);
  if (!k) return STATUS_RECEITA.ABERTO;
  return RECEITA_MAP[k] || STATUS_RECEITA.ABERTO;
}

/** Normaliza um status de despesa para pendente|aprovado|pago|cancelado. */
export function normalizeStatusDespesa(status) {
  const k = limpar(status);
  if (!k) return STATUS_DESPESA.PENDENTE;
  return DESPESA_MAP[k] || STATUS_DESPESA.PENDENTE;
}

export const receitaRecebida = (status) => normalizeStatusReceita(status) === STATUS_RECEITA.RECEBIDO;
export const receitaCancelada = (status) => normalizeStatusReceita(status) === STATUS_RECEITA.CANCELADO;
export const despesaPaga = (status) => normalizeStatusDespesa(status) === STATUS_DESPESA.PAGO;
export const despesaCancelada = (status) => normalizeStatusDespesa(status) === STATUS_DESPESA.CANCELADO;

// ===== MEDIÇÕES =====
// Ciclo da medição: aguardando → em_analise → aprovada → faturada → paga
// (ou rejeitada). Para números REALIZADOS (DRE / Painel) contam apenas
// medições reconhecidas pelo cliente: aprovada, faturada ou paga.
// 'prevista', 'aguardando', 'em_analise' só entram em PROJEÇÕES.
const MEDICAO_RECONHECIDA = new Set(['aprovado', 'aprovada', 'faturado', 'faturada', 'pago', 'paga', 'recebido', 'recebida', 'confirmado', 'confirmada']);
const MEDICAO_PREVISTA = new Set(['prevista', 'previsto', 'aguardando', 'em_analise', 'pendente', 'aberto', 'aberta']);

/** Medição aprovada/faturada/paga (receita reconhecida, competência). */
export const medicaoReconhecida = (status) => MEDICAO_RECONHECIDA.has(limpar(status));
/** Medição ainda prevista/em análise (só para projeção). */
export const medicaoPrevista = (status) => {
  const k = limpar(status);
  return !k || MEDICAO_PREVISTA.has(k);
};
/** Medição efetivamente recebida em caixa. */
export const medicaoRecebida = (status) => receitaRecebida(status);

/**
 * Converte um status de RECEITA (canônico ou legado) para o vocabulário de
 * MEDIÇÃO usado pela GFO (STATUS_MEDICAO): recebido → 'paga',
 * faturado → 'faturada' (ou mantém 'aprovada'/'faturada' original),
 * cancelado → 'rejeitada', aberto → mantém o status original da medição
 * (ou 'aguardando' quando não houver).
 */
export function statusReceitaParaMedicao(status, original) {
  const canon = normalizeStatusReceita(status);
  const orig = limpar(original);
  if (canon === STATUS_RECEITA.RECEBIDO) return 'paga';
  if (canon === STATUS_RECEITA.CANCELADO) return 'rejeitada';
  if (canon === STATUS_RECEITA.FATURADO) return ['aprovada', 'faturada'].includes(orig) ? orig : 'faturada';
  return orig || 'aguardando';
}
