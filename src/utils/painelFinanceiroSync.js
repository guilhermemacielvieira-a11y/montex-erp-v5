// ============================================
// SINCRONIZAÇÃO PAINEL FINANCEIRO GLOBAL (camada local isolada)
// ============================================
// O PainelFinanceiroGlobal mantém uma camada própria de dados financeiros
// (lançamentos próprios, overrides, itens ocultos, metas, alertas lidos).
// Antes esses dados viviam SÓ em localStorage → risco de perda total ao
// trocar de máquina / limpar cache / usar outro navegador.
//
// Esta util persiste TODO esse estado em DOIS lugares (mesmo padrão de
// montagemSync.js):
//   1. localStorage (cache rápido, resposta imediata, offline)
//   2. Supabase entity_store (backup durável + sync entre dispositivos)
//
// O estado é serializado como UM bundle dentro de entity_store.data:
//   { movs, overrides, hidden, metas, alertasLidos, _savedAt }
// ============================================

import { supabase } from '../api/supabaseClient';

// Chaves localStorage isoladas (mantidas idênticas às originais p/ não perder
// dados já gravados em máquinas existentes)
export const LS_KEYS = {
  movs:         'montex_global_movs',
  overrides:    'montex_global_overrides',
  hidden:       'montex_global_hidden',
  metas:        'montex_global_metas',
  alertasLidos: 'montex_global_alert_read',
};

// Chave da linha única em entity_store
const ENTITY_STORE_KEY = 'painel_financeiro_global';

// ============================================
// LOCAL (cache imediato)
// ============================================
const lerLS = (key, defaultVal) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : defaultVal; }
  catch { return defaultVal; }
};
const salvarLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

export function loadBundleLocal() {
  return {
    movs:         lerLS(LS_KEYS.movs, []),
    overrides:    lerLS(LS_KEYS.overrides, {}),
    hidden:       lerLS(LS_KEYS.hidden, []),
    metas:        lerLS(LS_KEYS.metas, {}),
    alertasLidos: lerLS(LS_KEYS.alertasLidos, []),
  };
}

export function saveBundleLocal(bundle) {
  if (!bundle) return;
  if (bundle.movs !== undefined)         salvarLS(LS_KEYS.movs, bundle.movs);
  if (bundle.overrides !== undefined)    salvarLS(LS_KEYS.overrides, bundle.overrides);
  if (bundle.hidden !== undefined)       salvarLS(LS_KEYS.hidden, bundle.hidden);
  if (bundle.metas !== undefined)        salvarLS(LS_KEYS.metas, bundle.metas);
  if (bundle.alertasLidos !== undefined) salvarLS(LS_KEYS.alertasLidos, bundle.alertasLidos);
}

// ============================================
// REMOTO (Supabase entity_store)
// ============================================
export async function loadBundleRemote() {
  try {
    const { data, error } = await supabase
      .from('entity_store')
      .select('data')
      .eq('id', ENTITY_STORE_KEY)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      console.warn('[painelFinanceiroSync] load remote:', error.message);
    }
    return data?.data || null;
  } catch (e) {
    console.warn('[painelFinanceiroSync] load remote exception:', e.message);
    return null;
  }
}

export async function saveBundleRemote(bundle) {
  try {
    const { error } = await supabase
      .from('entity_store')
      .upsert({
        id: ENTITY_STORE_KEY,
        entity_type: 'painel_financeiro_state',
        data: { ...bundle, _savedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    if (error) {
      console.warn('[painelFinanceiroSync] save remote:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[painelFinanceiroSync] save remote exception:', e.message);
    return false;
  }
}

// ============================================
// SMART COMBO
// ============================================
// Considera um bundle "vazio" (nenhum dado próprio do usuário) para decidir
// migração inicial: se o remoto está vazio mas o local tem dados, sobe o local.
export function bundleVazio(b) {
  if (!b) return true;
  const semMovs   = !b.movs || b.movs.length === 0;
  const semOv     = !b.overrides || Object.keys(b.overrides).length === 0;
  const semHidden = !b.hidden || b.hidden.length === 0;
  const semMetas  = !b.metas || Object.keys(b.metas).length === 0;
  const semLidos  = !b.alertasLidos || b.alertasLidos.length === 0;
  return semMovs && semOv && semHidden && semMetas && semLidos;
}

// Carrega local IMEDIATAMENTE (sync) e busca o remoto em background.
// Quando o remoto chega e difere do local, chama onRemoteUpdate(bundle).
// Migração: se remoto vazio e local tem dados → faz upload do local.
export function loadBundleSmart(onRemoteUpdate) {
  const local = loadBundleLocal();

  loadBundleRemote().then(remote => {
    if (bundleVazio(remote)) {
      // Primeira vez nesta conta OU remoto nunca foi gravado.
      // Se há dados locais, migra-os para o remoto (não perde nada existente).
      if (!bundleVazio(local)) saveBundleRemote(local);
      return;
    }
    // Remoto tem dados — se diferir do local, ele é a fonte mais recente.
    const { _savedAt, ...remoteClean } = remote;
    if (JSON.stringify(remoteClean) !== JSON.stringify(local)) {
      saveBundleLocal(remoteClean);
      onRemoteUpdate?.(remoteClean);
    }
  });

  return local;
}

// Salva local (instantâneo) + remoto (fire-and-forget)
export function saveBundleSmart(bundle) {
  saveBundleLocal(bundle);
  saveBundleRemote(bundle);
}
