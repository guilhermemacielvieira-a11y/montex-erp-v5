// ============================================
// SYNC das RECEITAS MANUAIS (camada localStorage compartilhada)
// ============================================
// As receitas manuais ficavam SO no localStorage de cada navegador
// (montex_receitas_gerais / montex_receitas_overrides) → divergiam entre PCs e
// "nao persistiam". Este util sincroniza essas chaves com a nuvem
// (entity_store: 'receitas_gerais_sync') por UNIAO (merge), sem perder dados.
//
// Uso: chamar syncReceitas() no mount (puxa de outros PCs) e apos salvar
// (empurra as deste PC). Retorna true se o localStorage mudou (p/ a UI recarregar).
// Obs.: exclusoes de receita nao propagam automaticamente (merge e aditivo) —
// trade-off a favor de nao perder dados; pode evoluir p/ tombstones depois.
// ============================================
import { supabase } from '../api/supabaseClient';

const KEY_R = 'montex_receitas_gerais';
const KEY_O = 'montex_receitas_overrides';
const STORE = 'receitas_gerais_sync';

const L = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
  catch { return d; }
};

export async function syncReceitas() {
  try {
    const locR = L(KEY_R, []);
    const locO = L(KEY_O, {});
    const { data } = await supabase
      .from('entity_store').select('data').eq('id', STORE).maybeSingle();
    const cloud = (data && data.data) || { receitas: [], overrides: {} };

    const byId = {};
    (cloud.receitas || []).forEach((r) => { if (r && r.id) byId[r.id] = r; });
    (locR || []).forEach((r) => { if (r && r.id) byId[r.id] = r; }); // local vence no conflito
    const mr = Object.keys(byId).map((k) => byId[k]);
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
      await supabase.from('entity_store').upsert({
        id: STORE,
        entity_type: 'receitas_backup',
        data: { receitas: mr, overrides: mo, _savedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
    return localMudou;
  } catch (e) {
    console.warn('[receitasSync]', e && e.message);
    return false;
  }
}
