// rebuild-bust: garantir chunk do painel com merge+prune (PR #10/#11) em prod 2026-06-11
// ============================================
// SINCRONIZAÇÃO PAINEL FINANCEIRO GLOBAL (camada local ISOLADA)
// ============================================
// O PainelFinanceiroGlobal mantém uma camada própria de dados financeiros
// (lançamentos próprios, overrides, itens ocultos, metas, alertas lidos).
//
// PERSISTÊNCIA (atualizado 2026-06): além do cache em localStorage, o estado
// agora é gravado como LINHAS na tabela dedicada `painel_financeiro_global`
// (antes era um blob único em entity_store). Isso permite:
//   • edição concorrente entre usuários SEM sobrescrever (cada item = 1 linha);
//   • visibilidade em TEMPO REAL (Supabase Realtime — subscribeRemote);
//   • alertas lidos POR USUÁRIO.
//
// ISOLAMENTO: nenhum outro módulo lê esta tabela → os dados do painel não
// vazam para os demais módulos financeiros. A ENTRADA (espelho de despesas/
// medições do sistema) continua igual, fora deste util.
// ============================================
import { supabase } from '../api/supabaseClient';


// Chaves localStorage isoladas (cache imediato/offline — mantidas idênticas)
export const LS_KEYS = {
  movs:         'montex_global_movs',
  overrides:    'montex_global_overrides',
  hidden:       'montex_global_hidden',
  metas:        'montex_global_metas',
  alertasLidos: 'montex_global_alert_read',
  deletados:    'montex_global_deletados',
};

const TABLE = 'painel_financeiro_global';
// Linha legada (blob) em entity_store — migrada para a tabela no 1º load.
const LEGACY_ENTITY_KEY = 'painel_financeiro_global';

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
    deletados:    lerLS(LS_KEYS.deletados, []),
  };
}

export function saveBundleLocal(bundle) {
  if (!bundle) return;
  if (bundle.movs !== undefined)         salvarLS(LS_KEYS.movs, bundle.movs);
  if (bundle.overrides !== undefined)    salvarLS(LS_KEYS.overrides, bundle.overrides);
  if (bundle.hidden !== undefined)       salvarLS(LS_KEYS.hidden, bundle.hidden);
  if (bundle.metas !== undefined)        salvarLS(LS_KEYS.metas, bundle.metas);
  if (bundle.alertasLidos !== undefined) salvarLS(LS_KEYS.alertasLidos, bundle.alertasLidos);
  if (bundle.deletados !== undefined)    salvarLS(LS_KEYS.deletados, bundle.deletados);
}

export function bundleVazio(b) {
  if (!b) return true;
  const semMovs   = !b.movs || b.movs.length === 0;
  const semOv     = !b.overrides || Object.keys(b.overrides).length === 0;
  const semHidden = !b.hidden || b.hidden.length === 0;
  const semMetas  = !b.metas || Object.keys(b.metas).length === 0;
  const semLidos  = !b.alertasLidos || b.alertasLidos.length === 0;
  const semDel    = !b.deletados || b.deletados.length === 0;
  return semMovs && semOv && semHidden && semMetas && semLidos && semDel;
}

// Une dois bundles (local + remoto) SEM perder dados: movs/hidden/alertasLidos
// por UNIAO (dedupe por id); overrides/metas por merge (remoto vence no conflito).
export function mergeBundles(a, b) {
  a = a || {}; b = b || {};
  // Tombstones: uniao dos ids excluidos. Um mov apagado em QUALQUER fonte fica
  // excluido no merge -> impede que hidratacao/realtime/cross-tab ressuscitem o
  // lancamento (a UNIAO de movs sozinha nao expressa exclusao).
  const deletados = Array.from(new Set([...(a.deletados || []), ...(b.deletados || [])]));
  const delSet = new Set(deletados.map(String));
  const byId = new Map();
  (a.movs || []).forEach((m) => { if (m && m.id != null && !delSet.has(String(m.id))) byId.set(m.id, m); });
  (b.movs || []).forEach((m) => { if (m && m.id != null && !delSet.has(String(m.id))) byId.set(m.id, m); });
  return {
    movs: Array.from(byId.values()),
    overrides: { ...(a.overrides || {}), ...(b.overrides || {}) },
    hidden: Array.from(new Set([...(a.hidden || []), ...(b.hidden || [])])),
    metas: { ...(a.metas || {}), ...(b.metas || {}) },
    alertasLidos: Array.from(new Set([...(a.alertasLidos || []), ...(b.alertasLidos || [])])),
    deletados,
  };
}

// Identifica o usuário atual (para alertas lidos por usuário).
async function currentUserKey() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || data?.user?.email || 'anon';
  } catch { return 'anon'; }
}

// ============================================
// REMOTO (tabela painel_financeiro_global — linhas)
// ============================================
async function loadLegacyBlob() {
  try {
    const { data } = await supabase
      .from('entity_store').select('data').eq('id', LEGACY_ENTITY_KEY).maybeSingle();
    return data?.data || null;
  } catch { return null; }
}

// Monta o bundle a partir das LINHAS da tabela.
export async function loadBundleRemote() {
  try {
    const userKey = await currentUserKey();
    const { data, error } = await supabase
      .from(TABLE).select('row_id,tipo,ref_id,usuario,data');
    if (error) { console.warn('[painelFinanceiroSync] load:', error.message); return null; }

    const rows = data || [];
    if (rows.length === 0) {
      // Migração única: blob antigo (entity_store) → tabela.
      const legacy = await loadLegacyBlob();
      if (legacy && !bundleVazio(legacy)) { await saveBundleRemote(legacy); return legacy; }
      return null;
    }

    const movs = []; const overrides = {}; const hidden = []; let metas = {}; const alertasLidos = []; const deletados = [];
    for (const r of rows) {
      if (r.tipo === 'mov') movs.push(r.data);
      else if (r.tipo === 'override') overrides[r.ref_id] = r.data;
      else if (r.tipo === 'hidden') hidden.push(r.ref_id);
      else if (r.tipo === 'meta') metas = r.data || {};
      else if (r.tipo === 'tombstone') deletados.push(r.ref_id);
      else if (r.tipo === 'alert_read' && r.usuario === userKey) alertasLidos.push(r.ref_id);
    }
    // Aplica tombstones tambem no remoto: remove qualquer linha de mov que ainda
    // exista mas ja tenha sido marcada como excluida (defesa extra contra corrida).
    const delSet = new Set(deletados.map(String));
    const movsFiltrados = movs.filter(m => m && !delSet.has(String(m.id)));
    return { movs: movsFiltrados, overrides, hidden, metas, alertasLidos, deletados };
  } catch (e) {
    console.warn('[painelFinanceiroSync] load exc:', e.message);
    return null;
  }
}

async function pruneByTipo(tipo, keepSet) {
  try {
    const { data } = await supabase.from(TABLE).select('row_id').eq('tipo', tipo);
    const toDelete = (data || []).map(r => r.row_id).filter(id => !keepSet.has(id));
    if (toDelete.length) await supabase.from(TABLE).delete().in('row_id', toDelete);
  } catch { /* noop */ }
}
// Apaga UMA linha de mov imediatamente. Evita a corrida em que a re-hidratacao/
// realtime reinseria o lancamento (a tabela ainda tinha a linha) antes do prune
// debounced (800ms) rodar — causava 'exclusao nao persiste'.
export async function deleteMovRemote(id) {
  try {
    await supabase.from(TABLE).delete().eq('row_id', `mov:${id}`);
    // Tombstone gravado JA: mesmo que a re-hidratacao/realtime rode antes do save
    // debounced, o mov nao volta (em qualquer aba ou dispositivo).
    await supabase.from(TABLE).upsert(
      [{ row_id: `tomb:${id}`, tipo: 'tombstone', ref_id: String(id), usuario: null, data: {}, updated_at: new Date().toISOString() }],
      { onConflict: 'row_id' }
    );
  } catch { /* noop */ }
}

async function pruneAlerts(userKey, keepSet) {
  try {
    const { data } = await supabase.from(TABLE)
      .select('row_id').eq('tipo', 'alert_read').eq('usuario', userKey);
    const toDelete = (data || []).map(r => r.row_id).filter(id => !keepSet.has(id));
    if (toDelete.length) await supabase.from(TABLE).delete().in('row_id', toDelete);
  } catch { /* noop */ }
}

// Persiste o bundle como LINHAS (upsert por item + remove o que saiu).
export async function saveBundleRemote(bundle) {
  if (!bundle) return false;
  try {
    const userKey = await currentUserKey();
    const now = new Date().toISOString();
    const rows = [];
    const keepMov = new Set(); const keepOv = new Set(); const keepHid = new Set(); const keepAlert = new Set();

    (bundle.movs || []).forEach((m) => {
      const rid = `mov:${m.id}`; keepMov.add(rid);
      rows.push({ row_id: rid, tipo: 'mov', ref_id: String(m.id ?? ''), usuario: null, data: m, updated_at: now });
    });
    Object.entries(bundle.overrides || {}).forEach(([k, v]) => {
      const rid = `override:${k}`; keepOv.add(rid);
      rows.push({ row_id: rid, tipo: 'override', ref_id: String(k), usuario: null, data: v, updated_at: now });
    });
    (bundle.hidden || []).forEach((h) => {
      const rid = `hidden:${h}`; keepHid.add(rid);
      rows.push({ row_id: rid, tipo: 'hidden', ref_id: String(h), usuario: null, data: {}, updated_at: now });
    });
    if (bundle.metas !== undefined) {
      rows.push({ row_id: 'meta', tipo: 'meta', ref_id: null, usuario: null, data: bundle.metas || {}, updated_at: now });
    }
    (bundle.alertasLidos || []).forEach((a) => {
      const rid = `alert:${userKey}:${a}`; keepAlert.add(rid);
      rows.push({ row_id: rid, tipo: 'alert_read', ref_id: String(a), usuario: userKey, data: {}, updated_at: now });
    });
    (bundle.deletados || []).forEach((delId) => {
      rows.push({ row_id: `tomb:${delId}`, tipo: 'tombstone', ref_id: String(delId), usuario: null, data: {}, updated_at: now });
    });

    if (rows.length) {
      const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'row_id' });
      if (error) { console.warn('[painelFinanceiroSync] save upsert:', error.message); return false; }
    }

    // Remove itens deletados. (Realtime mantém os clientes sincronizados, então
    // a janela para apagar uma linha recém-criada por outro usuário é mínima.)
    // Poda APOS merge-on-load: a hidratacao funde local+remoto (uniao), entao o
    // bundle salvo ja contem os dados de outros PCs; podar remove apenas o que o
    // usuario REALMENTE excluiu (exclusao precisa persistir ao recarregar).
    await pruneByTipo('mov', keepMov);
    await pruneByTipo('override', keepOv);
    await pruneByTipo('hidden', keepHid);
    await pruneAlerts(userKey, keepAlert); // alertas lidos: so os do proprio usuario (seguro)

    return true;
  } catch (e) {
    console.warn('[painelFinanceiroSync] save exc:', e.message);
    return false;
  }
}

// ============================================
// REALTIME — visibilidade imediata entre usuários
// ============================================
// Retorna uma função de cleanup para usar no return do useEffect.
export function subscribeRemote(onChange) {
  try {
    const ch = supabase
      .channel('painel_financeiro_global_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => { onChange?.(); })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  } catch {
    return () => {};
  }
}

// ============================================
// COMBOS (compat)
// ============================================
export function loadBundleSmart(onRemoteUpdate) {
  const local = loadBundleLocal();
  loadBundleRemote().then((remote) => {
    if (!remote || bundleVazio(remote)) {
      if (!bundleVazio(local)) saveBundleRemote(local);
      return;
    }
    if (JSON.stringify(remote) !== JSON.stringify(local)) {
      saveBundleLocal(remote);
      onRemoteUpdate?.(remote);
    }
  });
  return local;
}

export function saveBundleSmart(bundle) {
  saveBundleLocal(bundle);
  saveBundleRemote(bundle);
}
