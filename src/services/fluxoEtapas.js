// ============================================================
// Fluxo de etapas de produção — regras de transição
// ============================================================
// Espelho CLIENT-SIDE da validação feita no banco pela RPC `mover_etapa`
// (supabase/migrations/2026100520_producao_estoque_atomico.sql). Serve para
// bloquear a ação na UI antes de chamar o servidor e para o modo offline.
// A fonte de verdade continua sendo o banco.
//
// Fluxo: aguardando → fabricacao → solda → pintura → expedido
//        → enviado → entregue  (estas duas SÓ via Expedição/romaneio)
// ============================================================

export const ORDEM_ETAPAS = ['aguardando', 'fabricacao', 'solda', 'pintura', 'expedido', 'enviado', 'entregue'];

// Etapas que a produção (Kanban / Lançamento) pode atingir por conta própria.
export const ETAPAS_PRODUCAO = ['aguardando', 'fabricacao', 'solda', 'pintura', 'expedido'];

// Etapas atingidas apenas pela Expedição (romaneio).
export const ETAPAS_SO_EXPEDICAO = ['enviado', 'entregue'];

/** Normaliza a etapa ('corte' legado e vazio → 'aguardando'). */
export function normalizarEtapa(etapa) {
  const e = String(etapa || '').trim().toLowerCase();
  if (!e || e === 'corte') return 'aguardando';
  return e;
}

/** Índice da etapa no fluxo (-1 se desconhecida). */
export function ordemEtapa(etapa) {
  return ORDEM_ETAPAS.indexOf(normalizarEtapa(etapa));
}

/** Próxima etapa de produção (null se não houver ou se a próxima for só via Expedição). */
export function proximaEtapaProducao(etapa) {
  const idx = ordemEtapa(etapa);
  if (idx < 0) return null;
  const prox = ORDEM_ETAPAS[idx + 1];
  return prox && ETAPAS_PRODUCAO.includes(prox) ? prox : null;
}

/** Etapa anterior no fluxo (null se já é a primeira). */
export function etapaAnterior(etapa) {
  const idx = ordemEtapa(etapa);
  return idx > 0 ? ORDEM_ETAPAS[idx - 1] : null;
}

/**
 * Valida a movimentação da peça INTEIRA de `de` para `para`.
 * Mesmas regras de `mover_etapa` no banco:
 *   - mesma etapa: ok (no-op)
 *   - avanço de exatamente 1 etapa: ok
 *   - retorno de exatamente 1 etapa: só com { force: true }
 *   - destino enviado/entregue: rejeitado (só Expedição)
 *   - saltos: rejeitados
 * @returns {{ ok: boolean, motivo?: string }}
 */
export function validarTransicao(de, para, { force = false } = {}) {
  const origem = normalizarEtapa(de);
  const destino = String(para || '').trim().toLowerCase();
  const iPara = ORDEM_ETAPAS.indexOf(destino);
  if (iPara < 0) return { ok: false, motivo: `Etapa de destino inválida: ${para}` };
  if (ETAPAS_SO_EXPEDICAO.includes(destino)) {
    return { ok: false, motivo: `A etapa ${destino.toUpperCase()} só é atingida pela Expedição (romaneio)` };
  }
  const iDe = Math.max(0, ORDEM_ETAPAS.indexOf(origem));
  if (iPara === iDe) return { ok: true };
  if (iPara === iDe + 1) return { ok: true };
  if (iPara === iDe - 1) {
    return force
      ? { ok: true }
      : { ok: false, motivo: `Retorno de ${origem.toUpperCase()} para ${destino.toUpperCase()} exige confirmação` };
  }
  if (iPara < iDe) {
    return { ok: false, motivo: `Retorno de ${origem.toUpperCase()} para ${destino.toUpperCase()} não permitido (só 1 etapa por vez)` };
  }
  return { ok: false, motivo: `Transição inválida: ${origem.toUpperCase()} → ${destino.toUpperCase()} (o fluxo avança 1 etapa por vez)` };
}

/**
 * Valida um split de `qtd` unidades de uma peça com `quantidadeAtual` para `para`.
 * Mesmas regras de `split_peca` no banco.
 */
export function validarSplit(quantidadeAtual, qtd, para, etapaAtual) {
  const total = parseInt(quantidadeAtual, 10) || 0;
  const n = parseInt(qtd, 10) || 0;
  const destino = String(para || '').trim().toLowerCase();
  if (n <= 0) return { ok: false, motivo: 'Quantidade a desmembrar deve ser maior que 0' };
  if (n >= total) return { ok: false, motivo: `Quantidade (${n}) deve ser menor que o total da peça (${total})` };
  if (!ORDEM_ETAPAS.includes(destino) || destino === 'entregue') {
    return { ok: false, motivo: `Etapa de destino inválida: ${para}` };
  }
  if (destino === 'enviado' && normalizarEtapa(etapaAtual) !== 'expedido') {
    return { ok: false, motivo: 'Só peças em EXPEDIDO podem ser enviadas (via Expedição)' };
  }
  return { ok: true };
}

/** Status coerente com a etapa (espelha montex_status_da_etapa). */
export function statusDaEtapa(etapa, statusAtual = null) {
  const e = normalizarEtapa(etapa);
  if (e === 'aguardando') return statusAtual || 'pendente';
  if (e === 'expedido') return 'concluido';
  if (e === 'enviado') return 'enviado';
  if (e === 'entregue') return 'entregue';
  return 'em_producao';
}
