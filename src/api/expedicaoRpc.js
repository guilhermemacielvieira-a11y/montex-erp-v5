// ============================================================================
// Expedição — RPCs transacionais (supabase/migrations/2026100530_*.sql)
// Todas lançam Error em caso de falha (nada de erro engolido).
// ============================================================================
import { supabase } from './supabaseClient';
import { normalizarStatusRomaneio } from '@/services/romaneio';

async function chamarRpc(nome, args) {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) {
    const err = new Error(error.message || `Falha em ${nome}`);
    err.code = error.code;
    err.details = error.details;
    err.hint = error.hint;
    throw err;
  }
  return data;
}

/**
 * Cria o romaneio: valida peças (mesma obra, etapa expedido, qtd suficiente),
 * faz split dos parciais e grava o romaneio — tudo numa transação.
 * Peças continuam em `expedido` até o despacho.
 * @param {object} payload ver montarPayloadCriarRomaneio (services/romaneio.js)
 * @returns {Promise<{expedicao: object, splits: Array}>}
 */
export function criarRomaneio(payload) {
  return chamarRpc('criar_romaneio', { p: payload });
}

/**
 * Muda o status do romaneio e move as peças:
 * em_transito/entregue → `enviado`; demais → de volta a `expedido`.
 */
export function despacharRomaneio(id, status, motivo = null) {
  const s = normalizarStatusRomaneio(status);
  return chamarRpc('despachar_romaneio', { p_id: id, p_status: s, p_motivo: motivo || null });
}

/** Devolve as peças à fila, reúne splits na peça original e soft-deleta o romaneio. */
export function excluirRomaneio(id) {
  return chamarRpc('excluir_romaneio', { p_id: id });
}
