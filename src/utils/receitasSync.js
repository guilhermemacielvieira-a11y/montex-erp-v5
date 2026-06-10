// ============================================
// SYNC das RECEITAS MANUAIS (camada localStorage compartilhada)
// ============================================
// As receitas manuais ficavam SO no localStorage de cada navegador
// (montex_receitas_gerais / montex_receitas_overrides) -> divergiam entre PCs.
// Sincroniza com a nuvem (entity_store: 'receitas_gerais_sync') por UNIAO (merge),
// com TOMBSTONES (deletedIds) p/ que exclusoes persistam e nao sejam
// ressuscitadas pelo merge (inclusive vindas de outro PC).
// ============================================
import { supabase } from '../api/supabaseClient';

const KEY_R = 'montex_receitas_gerais';
const KEY_O = 'montex_receitas_overrides';
const STORE = 'receitas_gerais_sync';

const L = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
  catch { return d; }
};

async function lerCloud() {
  const { data } = await supabase
    .from('entity_store').select('data').eq('id', STORE).maybeSingle();
  const c = (data && data.data) || {};
  return {
    receitas: c.receitas || [],
    overrides: c.overrides || {},
    deletedIds: c.deletedIds || [],
  };
}

async function gravarCloud(receitas, overrides, deletedIds) {
  await supabase.from('entity_store').upsert({
    id: STORE,
    entity_type: 'receitas_backup',
    data: { receitas, overrides, deletedIds, _savedAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function syncReceitas() {
  try {
    const locR = L(KEY_R, []);
    const locO = L(KEY_O, {});
    const cloud = await lerCloud();
    const tomb = new Set(cloud.deletedIds || []);

    const byId = {};
    (cloud.receitas || []).forEach((r) => { if (r && r.id) byId[r.id] = r; });
    (locR || []).forEach((r) => { if (r && r.id) byId[r.id] = r; }); // local vence
    const mr = Object.keys(byId)
      .filter((k) => !tomb.has(k))            // respeita exclusoes (tombstone)
      .map((k) => byId[k]);
    const mo = { ...(cloud.overrides || {}), ...(locO || {}) };

    const localMudou =
      JSON.stringify(mr) !== JSON.stringify(locR) ||
      JSON.stringify(mo) !== JSON.stringify(locO);
    if (localMudou) {
      localStorage.setItem(KEY_R, JSON.stringify(mr));
      localStorage.setItem(KEY_O, JSON.stringify(mo));
    }

    const cloudMudou =
      JSON.stringify(mr) !== JSON.stringify(cloud.receitas || []) ||
      JSON.stringify(mo) !== JSON.stringify(cloud.overrides || {});
    if (cloudMudou) {
      await gravarCloud(mr, mo, cloud.deletedIds || []);
    }
    return localMudou;
  } catch (e) {
    console.warn('[receitasSync]', e && e.message);
    return false;
  }
}

// Apaga uma receita manual em definitivo: remove do localStorage e da nuvem e
// registra um TOMBSTONE (deletedIds) p/ que o merge nao a ressuscite.
export async function deleteReceitaManual(id) {
  try {
    const locR = L(KEY_R, []).filter((r) => r && r.id !== id);
    localStorage.setItem(KEY_R, JSON.stringify(locR));
    const cloud = await lerCloud();
    const receitas = (cloud.receitas || []).filter((r) => r && r.id !== id);
    const deletedIds = Array.from(new Set([...(cloud.deletedIds || []), id]));
    await gravarCloud(receitas, cloud.overrides || {}, deletedIds);
    return true;
  } catch (e) {
    console.warn('[deleteReceitaManual]', e && e.message);
    return false;
  }
}
