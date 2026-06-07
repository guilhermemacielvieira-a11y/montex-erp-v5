// ============================================================
// DESIGN SYSTEM MOBILE — Fila de escrita offline
// ============================================================
// Enfileira mutações feitas offline (localStorage) para sincronizar ao
// reconectar. ESCOPO: apenas operações IDEMPOTENTES (re-aplicar dá o
// mesmo resultado) — avançar etapa (set etapa=X) e despachar romaneio
// (set status=X). Operações ADITIVAS (estoque +/-, addMedicao) NÃO entram
// aqui: o replay duplicaria; elas exigem online. Cada op guarda o nome da
// ação do ERPContext + args serializáveis; o SyncManager mapeia e replica.
// ============================================================
const LS = 'montex_offline_queue';
export const QUEUE_EVENT = 'montex-queue-change';

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; }
}

function setQueue(q) {
  try { localStorage.setItem(LS, JSON.stringify(q)); } catch { /* noop */ }
  try { window.dispatchEvent(new Event(QUEUE_EVENT)); } catch { /* noop */ }
}

export function enqueue(action, args, label) {
  const q = getQueue();
  q.push({ id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action, args, label: label || action, ts: Date.now() });
  setQueue(q);
  return q.length;
}

export function dequeue(id) {
  setQueue(getQueue().filter(o => o.id !== id));
}

export function queueSize() {
  return getQueue().length;
}
