// ============================================================
// RPCs atômicas de Produção / Corte / Estoque
// ============================================================
// Wrappers finos sobre supabase.rpc para as funções definidas em
// supabase/migrations/2026100520_producao_estoque_atomico.sql.
// Cada chamada roda numa ÚNICA transação no banco (linha travada com
// FOR UPDATE) e LANÇA erro quando o Supabase devolve `error` — nunca
// ignore o retorno: a UI deve mostrar toast.error e reverter o otimista.
// ============================================================
import { supabase } from './supabaseClient';

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const err = new Error(error.message || `Falha na operação ${fn}`);
    err.code = error.code;
    err.details = error.details;
    err.hint = error.hint;
    err.rpc = fn;
    throw err;
  }
  return data;
}

// Remove chaves undefined para o PostgREST usar os DEFAULTs da função.
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/** Converte Date/ISO/'YYYY-MM-DD' em 'YYYY-MM-DD' (data LOCAL, sem shift de fuso). */
export function toDateParam(d) {
  if (!d) return undefined;
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    d = new Date(d);
  }
  if (!(d instanceof Date) || isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Desmembra `qtd` unidades da peça `id` para `novaEtapa` (nova linha).
 * @param {object} [opts] { funcionario, data, etapaFuncionario }
 *   funcionario/data são gravados nas colunas da etapa `etapaFuncionario`
 *   (default: novaEtapa) da NOVA linha.
 * @returns {Promise<{ ok: true, original: object, nova: object }>}
 */
export function splitPeca(id, qtd, novaEtapa, { funcionario, data, etapaFuncionario } = {}) {
  return call('split_peca', clean({
    p_id: id,
    p_qtd: parseInt(qtd, 10),
    p_nova_etapa: novaEtapa,
    p_funcionario: funcionario || undefined,
    p_data: toDateParam(data),
    p_etapa_funcionario: etapaFuncionario || undefined,
  }));
}

/**
 * Move a peça INTEIRA para `etapa` (valida o fluxo no banco).
 * @param {object} [opts] { funcionario, force, etapaFuncionario, data }
 *   force=true permite voltar 1 etapa (correção manual).
 * @returns {Promise<{ ok: true, etapa_anterior: string, peca: object }>}
 */
export function moverEtapa(id, etapa, { funcionario, force, etapaFuncionario, data } = {}) {
  return call('mover_etapa', clean({
    p_id: id,
    p_etapa: etapa,
    p_funcionario: funcionario || undefined,
    p_force: force ? true : undefined,
    p_etapa_funcionario: etapaFuncionario || undefined,
    p_data: toDateParam(data),
  }));
}

/**
 * Edição por quantidade: distribui a peça entre etapas de produção numa só
 * transação. `distribuicao` = { fabricacao: 2, solda: 3, ... } (soma = qtd no banco).
 */
export function distribuirPeca(id, distribuicao, { funcionario, data } = {}) {
  const dist = {};
  Object.entries(distribuicao || {}).forEach(([k, v]) => {
    const n = parseInt(v, 10) || 0;
    if (n > 0) dist[k] = n;
  });
  return call('distribuir_peca', clean({
    p_id: id,
    p_distribuicao: dist,
    p_funcionario: funcionario || undefined,
    p_data: toDateParam(data),
  }));
}

/**
 * Movimenta o saldo de um item de estoque de forma atômica (delta).
 * delta > 0 = entrada, delta < 0 = saída. Rejeita saldo negativo salvo
 * `permitirNegativo`. Registra a movimentação na mesma transação.
 * @returns {Promise<{ ok: true, item_id, saldo_anterior, saldo_novo, movimentacao_id, item }>}
 */
export function movimentarEstoque(itemId, delta, {
  tipo, origem = 'manual', ref, motivo, responsavel, notaFiscal, documentoUrl,
  custoUnitario, obraId, contaComprado, permitirNegativo, setor, pecaId,
  material, materialPerfil, peso,
} = {}) {
  return call('movimentar_estoque', clean({
    p_item_id: itemId,
    p_delta_kg: Number(delta),
    p_tipo: tipo || undefined,
    p_origem: origem || undefined,
    p_ref: ref != null ? String(ref) : undefined,
    p_motivo: motivo || undefined,
    p_responsavel: responsavel || undefined,
    p_nota_fiscal: notaFiscal || undefined,
    p_documento_url: documentoUrl || undefined,
    p_custo_unitario: Number(custoUnitario) > 0 ? Number(custoUnitario) : undefined,
    p_obra_id: obraId || undefined,
    p_conta_comprado: contaComprado ? true : undefined,
    p_permitir_negativo: permitirNegativo ? true : undefined,
    p_setor: setor || undefined,
    p_peca_id: pecaId || undefined,
    p_material: material || undefined,
    p_material_perfil: materialPerfil || undefined,
    p_peso: peso != null && Number.isFinite(Number(peso)) ? Number(peso) : undefined,
  }));
}

/**
 * Finaliza o corte (idempotente). A baixa de estoque é feita no banco pelo
 * trigger tg_corte_baixa_estoque; `baixa_kg` = kg efetivamente deduzido.
 * @returns {Promise<{ ok: true, ja_finalizado: boolean, baixa_kg: number, controlado: boolean, corte: object }>}
 */
export function baixarCorte(corteId, { funcionario } = {}) {
  return call('baixar_corte', clean({ p_corte_id: corteId, p_funcionario: funcionario || undefined }));
}

/**
 * Volta o corte para 'aguardando' estornando exatamente o kg baixado (idempotente).
 * @returns {Promise<{ ok: true, estornado_kg: number, corte: object }>}
 */
export function estornarCorte(corteId) {
  return call('estornar_corte', { p_corte_id: corteId });
}
