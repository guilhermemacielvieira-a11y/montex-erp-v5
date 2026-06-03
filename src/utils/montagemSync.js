// ============================================
// SINCRONIZAÇÃO MONTAGEM (independente do banco principal)
// ============================================
// Persiste o estado "Montado" das peças em DOIS lugares:
//   1. localStorage (cache rápido, resposta imediata)
//   2. Supabase entity_store (sync entre máquinas/dispositivos)
//
// Usado por:
//   - MontagemPage  → escreve quando usuário marca/desmarca
//   - MontexERP3DPage → lê para colorir IFC e fica em poll
// ============================================

import { supabase } from '../api/supabaseClient';

export const MONTAGEM_LS_KEY = 'montex_montagem_concluidas_v1';
const ENTITY_STORE_KEY = 'montagem_concluidas_global';

// ============================================
// LOCAL (cache imediato)
// ============================================
export function loadConcluidasLocal() {
  try {
    const raw = localStorage.getItem(MONTAGEM_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveConcluidasLocal(obj) {
  try {
    localStorage.setItem(MONTAGEM_LS_KEY, JSON.stringify(obj || {}));
  } catch {}
}

// ============================================
// SUPABASE (sync online via entity_store)
// ============================================
export async function loadConcluidasRemote() {
  try {
    const { data, error } = await supabase
      .from('entity_store')
      .select('data')
      .eq('id', ENTITY_STORE_KEY)
      .maybeSingle();
    if (error) {
      if (error.code !== 'PGRST116') console.warn('[montagemSync] load remote:', error.message);
      return null;
    }
    return data?.data || {};
  } catch (e) {
    console.warn('[montagemSync] load remote exception:', e.message);
    return null;
  }
}

export async function saveConcluidasRemote(obj) {
  try {
    const { error } = await supabase
      .from('entity_store')
      .upsert({
        id: ENTITY_STORE_KEY,
        entity_type: 'montagem_status',
        data: obj || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    if (error) {
      console.warn('[montagemSync] save remote:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[montagemSync] save remote exception:', e.message);
    return false;
  }
}

// ============================================
// COMBO: load local + atualizar com remote (background)
// Retorna IMEDIATO localStorage e dispara fetch remoto
// ============================================
export function loadConcluidasSmart(onRemoteUpdate) {
  const local = loadConcluidasLocal();
  // Fetch remoto em background sem bloquear UI
  loadConcluidasRemote().then(remote => {
    if (remote && JSON.stringify(remote) !== JSON.stringify(local)) {
      saveConcluidasLocal(remote);
      onRemoteUpdate?.(remote);
    }
  });
  return local;
}

// ============================================
// COMBO: save local imediato + remote em background
// ============================================
export function saveConcluidasSmart(obj) {
  saveConcluidasLocal(obj);
  // Fire-and-forget remote save
  saveConcluidasRemote(obj);
}
