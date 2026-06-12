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
// MERGE por peça (anti-reversão): o remoto NUNCA sobrescreve cegamente o
// local. Sem isto, marcar uma peça e voltar do app de câmera (visibility-
// change → fetch) revertia a marcação para "Aguardando" com dados remotos
// velhos; e dois montadores simultâneos se apagavam (last-write-wins do
// objeto inteiro). Regras:
//   - chave nos dois lados: vence o payload com atualizadoEm/montadoEm mais novo
//   - chave só local: PRESERVA (marcação recém-feita ainda não sincronizada)
//   - chave só remota: entra, EXCETO se foi desmarcada localmente há pouco
//     (janela anti-ressurreição — a desmarcação ainda não chegou ao remoto)
const DIRTY_KEY = 'montex_montagem_dirty';
const removidasRecentes = new Map(); // pecaId -> timestamp da desmarcação local
const JANELA_REMOCAO_MS = 120000;
const tsPayload = (p) => Date.parse(p?.atualizadoEm || p?.montadoEm || '') || 0;

export function mergeConcluidas(local, remote) {
  const out = { ...(remote || {}) };
  const agora = Date.now();
  for (const [id, ts] of removidasRecentes) {
    if (agora - ts < JANELA_REMOCAO_MS) delete out[id];
    else removidasRecentes.delete(id);
  }
  for (const [id, pay] of Object.entries(local || {})) {
    if (!out[id] || tsPayload(pay) >= tsPayload(out[id])) out[id] = pay;
  }
  return out;
}

const marcarDirty = (v) => { try { v ? localStorage.setItem(DIRTY_KEY, '1') : localStorage.removeItem(DIRTY_KEY); } catch { /* noop */ } };
const isDirty = () => { try { return localStorage.getItem(DIRTY_KEY) === '1'; } catch { return false; } };

export function loadConcluidasSmart(onRemoteUpdate) {
  const local = loadConcluidasLocal();
  // Save pendente (falhou offline)? Empurra o local ANTES de aplicar remoto,
  // senão o fetch "ganha" e a marcação feita sem rede some.
  if (isDirty()) {
    saveConcluidasSmart(loadConcluidasLocal()).then(ok => {
      if (ok) onRemoteUpdate?.(loadConcluidasLocal());
    });
    return local;
  }
  // Fetch remoto em background sem bloquear UI
  loadConcluidasRemote().then(remote => {
    if (!remote) return;
    const atual = loadConcluidasLocal(); // re-lê: pode ter mudado após o return
    const merged = mergeConcluidas(atual, remote);
    if (JSON.stringify(merged) !== JSON.stringify(atual)) saveConcluidasLocal(merged);
    if (JSON.stringify(merged) !== JSON.stringify(local)) onRemoteUpdate?.(merged);
  });
  return local;
}

// ============================================
// COMBO: save local imediato + remote com MERGE + RETRY
// Retorna Promise<boolean> (callers fire-and-forget continuam válidos).
// ============================================
export async function saveConcluidasSmart(obj) {
  // Registra desmarcações p/ não ressuscitarem no merge com remoto velho
  const prev = loadConcluidasLocal();
  for (const id of Object.keys(prev || {})) {
    if (!(id in (obj || {}))) removidasRecentes.set(id, Date.now());
  }
  saveConcluidasLocal(obj);
  // Remoto: merge com o estado atual do servidor (preserva marcações de
  // outros dispositivos) + 3 tentativas com backoff (rede de canteiro).
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const remoto = await loadConcluidasRemote();
    const final = remoto ? mergeConcluidas(loadConcluidasLocal(), remoto) : loadConcluidasLocal();
    if (await saveConcluidasRemote(final)) {
      saveConcluidasLocal(final);
      marcarDirty(false);
      return true;
    }
    await new Promise(r => setTimeout(r, 1500 * (tentativa + 1)));
  }
  // Falhou: mantém local e marca pendência — flush no próximo load/foco.
  marcarDirty(true);
  return false;
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
            // MERGE (não sobrescrever): evento de outro dispositivo não pode
            // apagar marcação local recém-feita que ainda não subiu.
            const merged = mergeConcluidas(loadConcluidasLocal(), dados);
            saveConcluidasLocal(merged);
            onUpdate?.(merged);
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
