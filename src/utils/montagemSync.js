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
// MARCAÇÃO PARCIAL — helper compartilhado entre módulos
// ============================================
// Schema do payload no entity_store:
//   - SEM `montadas` (legado): considera TODAS as unidades montadas (= qtd)
//   - COM `montadas: N`: N unidades de qtd montadas (0 < N <= qtd)
//   - Excluído do entity_store: 0 unidades montadas
// Usado por MontagemPage (origem), MontexERP3DPage (consumidor) e MontagemMobile.
export function getMontadasCount(payload, qtd) {
  const total = Math.max(1, parseInt(qtd) || 1);
  if (!payload) return 0;
  // Payload legado sem `montadas` → considera tudo montado
  if (payload.montadas == null) return total;
  return Math.max(0, Math.min(total, parseInt(payload.montadas) || 0));
}

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

// ============================================
// TEMPO REAL: assina mudanças do entity_store (outro dispositivo /
// desktop / 3D marcou peça) e entrega o estado novo via callback.
// Retorna função de unsubscribe. Best-effort: se realtime indisponível,
// o caller continua com o fluxo loadConcluidasSmart (fetch em background).
// ============================================
export function subscribeConcluidas(onUpdate) {
  try {
    const channel = supabase
      .channel('montagem-concluidas-rt')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entity_store',
          filter: `id=eq.${ENTITY_STORE_KEY}`,
        },
        (payload) => {
          const dados = payload?.new?.data;
          if (dados && typeof dados === 'object') {
            saveConcluidasLocal(dados);
            onUpdate?.(dados);
          }
        }
      )
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch { /* noop */ } };
  } catch (e) {
    console.warn('[montagemSync] realtime indisponível:', e.message);
    return () => {};
  }
}
